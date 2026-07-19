import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const EXECUTE = process.argv.includes('--execute')
const inventoryArg = process.argv.find(arg => arg.startsWith('--inventory='))
const rootsArg = process.argv.find(arg => arg.startsWith('--roots='))
const inventoryPath = inventoryArg?.slice('--inventory='.length)
  || process.env.SUPABASE_STORAGE_INVENTORY

if (!inventoryPath) {
  throw new Error('Pass --inventory=/absolute/path/to/storage.csv')
}

const requiredEnv = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`${name} is required`)
}

const physicalBuckets = {
  'product-images': process.env.R2_BUCKET_IMAGES || 'product-images',
  'product-models': process.env.R2_BUCKET_MODELS || 'product-models',
}

const roots = rootsArg
  ? rootsArg.slice('--roots='.length).split(',').filter(Boolean)
  : [
      path.join(os.homedir(), 'Downloads'),
      path.join(os.homedir(), 'Desktop'),
      path.join(os.homedir(), 'Documents'),
      path.join(process.cwd(), 'public'),
    ]

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''))
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }

  const [headers, ...data] = rows
  return data.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])))
}

function scanFiles(directory, output) {
  let entries
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      scanFiles(entryPath, output)
      continue
    }
    if (!/\.(?:avif|gif|glb|gltf|jpe?g|png|webp)$/i.test(entry.name)) continue
    const stat = fs.statSync(entryPath)
    output.push({
      path: entryPath,
      name: entry.name,
      safeName: entry.name.replace(/[^a-zA-Z0-9._-]/g, '-'),
      size: stat.size,
    })
  }
}

function sha256(filePath) {
  const hash = createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function md5(filePath) {
  const hash = createHash('md5')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function contentTypeFor(row) {
  if (row.content_type) return row.content_type
  const extension = path.extname(row.name).toLowerCase()
  return {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }[extension] || 'application/octet-stream'
}

async function listBucket(bucket) {
  const objects = new Map()
  let continuationToken
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }))
    for (const object of page.Contents || []) objects.set(object.Key, Number(object.Size))
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (continuationToken)
  return objects
}

async function mapLimit(items, limit, worker) {
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      await worker(items[index])
    }
  })
  await Promise.all(workers)
}

const inventory = parseCsv(fs.readFileSync(inventoryPath, 'utf8'))
  .filter(row => physicalBuckets[row.bucket_id] && row.name && Number(row.size) > 0)
  .map(row => ({
    bucket: row.bucket_id,
    key: row.name,
    size: Number(row.size),
    contentType: contentTypeFor(row),
    etagMd5: String(row.etag || '').replaceAll('"', '').trim().toLowerCase(),
  }))

const localFiles = []
for (const root of roots) scanFiles(root, localFiles)

const localByNameAndSize = new Map()
for (const file of localFiles) {
  for (const candidateName of new Set([file.name, file.safeName])) {
    const lookupKey = `${file.size}|${candidateName}`
    const matches = localByNameAndSize.get(lookupKey) || []
    matches.push(file)
    localByNameAndSize.set(lookupKey, matches)
  }
}

const relevantSizes = new Set(inventory.map(object => object.size))
const localByMd5AndSize = new Map()
for (const file of localFiles.filter(item => relevantSizes.has(item.size))) {
  const digest = md5(file.path)
  const lookupKey = `${file.size}|${digest}`
  const matches = localByMd5AndSize.get(lookupKey) || []
  matches.push(file)
  localByMd5AndSize.set(lookupKey, matches)
}

const candidates = []
const ambiguous = []
for (const object of inventory) {
  const basename = path.basename(object.key)
  const normalizedBasename = basename.replace(/^\d{13}-/, '')
  const filenameMatches = [
    ...(localByNameAndSize.get(`${object.size}|${basename}`) || []),
    ...(localByNameAndSize.get(`${object.size}|${normalizedBasename}`) || []),
  ]
  const etagMatches = /^[a-f0-9]{32}$/.test(object.etagMd5)
    ? (localByMd5AndSize.get(`${object.size}|${object.etagMd5}`) || [])
    : []
  const matches = [...filenameMatches, ...etagMatches]
  const uniqueMatches = [...new Map(matches.map(file => [file.path, file])).values()]
  if (!uniqueMatches.length) continue

  const hashes = new Map(uniqueMatches.map(file => [file.path, sha256(file.path)]))
  const distinctHashes = new Set(hashes.values())
  if (distinctHashes.size !== 1) {
    ambiguous.push({ bucket: object.bucket, key: object.key, paths: uniqueMatches.map(file => file.path) })
    continue
  }

  candidates.push({
    ...object,
    localPath: uniqueMatches[0].path,
    sha256: hashes.get(uniqueMatches[0].path),
    matchMethod: etagMatches.length ? 'md5-and-size' : 'filename-and-size',
  })
}

const existingByBucket = {}
for (const [logicalBucket, physicalBucket] of Object.entries(physicalBuckets)) {
  existingByBucket[logicalBucket] = await listBucket(physicalBucket)
}

const pending = []
const alreadyRecovered = []
for (const candidate of candidates) {
  const existingSize = existingByBucket[candidate.bucket].get(candidate.key)
  if (existingSize === candidate.size) {
    alreadyRecovered.push(candidate)
  } else if (existingSize !== undefined) {
    throw new Error(`R2 size mismatch for ${candidate.bucket}/${candidate.key}: ${existingSize} != ${candidate.size}`)
  } else {
    pending.push(candidate)
  }
}

console.log(JSON.stringify({
  mode: EXECUTE ? 'execute' : 'dry-run',
  inventoryObjects: inventory.length,
  localFilesScanned: localFiles.length,
  exactFilenameAndSizeMatches: candidates.length,
  alreadyRecovered: alreadyRecovered.length,
  pending: pending.length,
  pendingBytes: pending.reduce((sum, object) => sum + object.size, 0),
  pendingObjects: pending.map(object => ({
    bucket: object.bucket,
    key: object.key,
    size: object.size,
    localPath: object.localPath,
    matchMethod: object.matchMethod,
  })),
  ambiguous,
}, null, 2))

if (!EXECUTE || !pending.length) process.exit(0)

await mapLimit(pending, 4, async object => {
  await s3.send(new PutObjectCommand({
    Bucket: physicalBuckets[object.bucket],
    Key: object.key,
    // Buffers are replayable, allowing the AWS SDK to retry a transient R2
    // connection reset. A file stream cannot be resent after it is consumed.
    Body: fs.readFileSync(object.localPath),
    ContentLength: object.size,
    ContentType: object.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: { 'source-sha256': object.sha256 },
  }))
  console.log(`uploaded ${object.bucket}/${object.key} (${object.size} bytes)`)
})

const verificationFailures = []
for (const [logicalBucket, physicalBucket] of Object.entries(physicalBuckets)) {
  const refreshed = await listBucket(physicalBucket)
  for (const object of pending.filter(item => item.bucket === logicalBucket)) {
    if (refreshed.get(object.key) !== object.size) {
      verificationFailures.push(`${logicalBucket}/${object.key}`)
    }
  }
}

if (verificationFailures.length) {
  throw new Error(`R2 verification failed for: ${verificationFailures.join(', ')}`)
}

console.log(`Verified ${pending.length} recovered objects in R2.`)
