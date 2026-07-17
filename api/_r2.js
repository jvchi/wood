// Shared helpers for the R2 serverless endpoints (Vercel Node functions).
// R2 credentials stay server-side. Callers must present a verified Supabase
// user JWT whose server-managed app_metadata contains role=admin.

import { S3Client } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const MIB = 1024 * 1024
const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export const ALLOWED_BUCKETS = {
  'product-images': process.env.R2_BUCKET_IMAGES || 'product-images',
  'product-models': process.env.R2_BUCKET_MODELS || 'product-models',
}

const PUBLIC_BASES = {
  'product-images': process.env.R2_PUBLIC_IMAGES,
  'product-models': process.env.R2_PUBLIC_MODELS,
}

const UPLOAD_RULES = {
  'product-images': {
    maxBytes: 10 * MIB,
    contentTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  },
  'product-models': {
    maxBytes: 150 * MIB,
    contentTypes: new Set(['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']),
  },
}

function requireServerEnv(name, ...fallbackNames) {
  const names = [name, ...fallbackNames]
  for (const candidate of names) {
    const value = process.env[candidate]
    if (value) return value
  }
  throw httpError(500, `${name} not configured`)
}

export function r2Client() {
  const accountId = requireServerEnv('R2_ACCOUNT_ID')
  const accessKeyId = requireServerEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = requireServerEnv('R2_SECRET_ACCESS_KEY')

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function authClient() {
  const url = requireServerEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const key = requireServerEnv(
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
  )
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export function publicUrl(bucket, key) {
  const base = PUBLIC_BASES[bucket]
  if (!base) throw httpError(500, `Public URL for ${bucket} not configured`)
  return `${base.replace(/\/$/, '')}/${String(key).replace(/^\/+/, '')}`
}

export async function assertAdmin(req) {
  const header = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization
  const match = typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i) : null
  if (!match) throw httpError(401, 'missing bearer token')

  const { data, error } = await authClient().auth.getUser(match[1])
  if (error || !data?.user) throw httpError(401, 'invalid or expired session')
  if (data.user.app_metadata?.role !== 'admin') throw httpError(403, 'administrator access required')
  return data.user
}

export function sanitizeKey(key) {
  if (typeof key !== 'string' || !key.trim()) throw httpError(400, 'invalid path')
  const clean = key.replace(/^\/+/, '')
  if (!clean) throw httpError(400, 'invalid path')
  if (clean.length > 1024) throw httpError(400, 'path is too long')
  const hasControlCharacter = Array.from(clean).some(character => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
  if (clean.split('/').includes('..') || hasControlCharacter) {
    throw httpError(400, 'invalid path')
  }
  return clean
}

export function validateUpload({ bucket, path, contentType, contentLength }) {
  const realBucket = ALLOWED_BUCKETS[bucket]
  const rules = UPLOAD_RULES[bucket]
  if (!realBucket || !rules) throw httpError(400, 'unknown bucket')

  const key = sanitizeKey(path)
  const normalizedType = typeof contentType === 'string'
    ? contentType.split(';', 1)[0].trim().toLowerCase()
    : ''
  if (!rules.contentTypes.has(normalizedType)) throw httpError(400, 'unsupported content type')

  const bytes = Number(contentLength)
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw httpError(400, 'invalid content length')
  if (bytes > rules.maxBytes) throw httpError(413, `file exceeds ${rules.maxBytes} byte limit`)

  return {
    realBucket,
    key,
    contentType: normalizedType,
    contentLength: bytes,
    cacheControl: DEFAULT_CACHE_CONTROL,
  }
}

export function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw httpError(400, 'invalid JSON body')
  }
}
