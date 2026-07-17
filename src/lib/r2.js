// Cloudflare R2 storage helpers (client side). The browser receives a
// short-lived, object-specific PUT URL only after the server verifies the
// current Supabase admin session. R2 credentials never enter the client bundle.

import { supabase } from './supabase'

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const R2_PUBLIC = {
  'product-images': import.meta.env.VITE_R2_PUBLIC_IMAGES,
  'product-models': import.meta.env.VITE_R2_PUBLIC_MODELS,
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

export const hasR2Config = Boolean(
  R2_PUBLIC['product-images'] && R2_PUBLIC['product-models'],
)

export function r2PublicUrl(bucket, path) {
  const base = R2_PUBLIC[bucket]
  if (!base || !path) return ''
  return `${base.replace(/\/$/, '')}/${String(path).replace(/^\/+/, '')}`
}

export function r2PathFromPublicUrl(url, bucket) {
  if (!url || typeof url !== 'string') return null
  const base = R2_PUBLIC[bucket]
  if (base) {
    const normalizedBase = base.replace(/\/$/, '')
    if (url.startsWith(`${normalizedBase}/`)) {
      return url.slice(normalizedBase.length + 1).split('?')[0]
    }
  }

  const legacyMarker = `/storage/v1/object/public/${bucket}/`
  const markerIndex = url.indexOf(legacyMarker)
  if (markerIndex !== -1) return url.slice(markerIndex + legacyMarker.length).split('?')[0]
  return null
}

async function adminAccessToken() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const session = data?.session
  if (!session?.access_token) throw new Error('Administrator sign-in required')
  if (session.user?.app_metadata?.role !== 'admin') throw new Error('Administrator access required')
  return session.access_token
}

async function adminRequest(path, body) {
  const token = await adminAccessToken()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text().catch(() => '')
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    // Surface a useful raw response below when a proxy returns HTML/plain text.
  }
  if (!response.ok) {
    throw new Error(payload?.error || text || `${path} failed (${response.status})`)
  }
  return payload || {}
}

function putWithProgress(url, file, contentType, cacheControl, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.setRequestHeader('Cache-Control', cacheControl)
    xhr.upload.onprogress = event => {
      if (!onProgress || !event.lengthComputable) return
      onProgress({
        bytesUploaded: event.loaded,
        bytesTotal: event.total,
        percent: event.total ? (event.loaded / event.total) * 100 : 0,
      })
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`R2 upload failed (${xhr.status}): ${xhr.responseText || ''}`))
    }
    xhr.onerror = () => reject(new Error('R2 upload network error'))
    xhr.send(file)
  })
}

export async function uploadToR2(file, bucket, path, {
  contentType,
  cacheControl = IMMUTABLE_CACHE_CONTROL,
  onProgress,
} = {}) {
  if (!file?.size) throw new Error('Cannot upload an empty file')
  const normalizedType = contentType || file.type || 'application/octet-stream'
  const { url, publicUrl } = await adminRequest('/api/sign-upload', {
    bucket,
    path,
    contentType: normalizedType,
    contentLength: file.size,
    cacheControl,
  })
  await putWithProgress(url, file, normalizedType, IMMUTABLE_CACHE_CONTROL, onProgress)
  return publicUrl || r2PublicUrl(bucket, path)
}

export async function deleteFromR2(bucket, paths) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean)
  if (!list.length) return { deleted: 0 }
  return adminRequest('/api/delete-asset', { bucket, paths: list })
}
