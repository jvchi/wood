import {
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'

const execute = process.argv.includes('--execute')
const wantedBucket = process.argv.find(arg => arg.startsWith('--bucket='))?.split('=', 2)[1] || 'all'
const cacheControl = 'public, max-age=31536000, immutable'

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`)
}

const buckets = {
  images: process.env.R2_BUCKET_IMAGES || 'product-images',
  models: process.env.R2_BUCKET_MODELS || 'product-models',
}
const selected = wantedBucket === 'all'
  ? Object.entries(buckets)
  : Object.entries(buckets).filter(([name]) => name === wantedBucket)
if (!selected.length) throw new Error('Use --bucket=images, --bucket=models, or --bucket=all')

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

async function listObjects(bucket) {
  const objects = []
  let continuationToken
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }))
    objects.push(...(page.Contents || []))
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (continuationToken)
  return objects
}

function copySource(bucket, key) {
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `${encodeURIComponent(bucket)}/${encodedKey}`
}

async function inspectAndUpdate(bucket, object) {
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: object.Key }))
  if (head.CacheControl === cacheControl) return 'unchanged'
  if (!execute) return 'planned'

  await s3.send(new CopyObjectCommand({
    Bucket: bucket,
    Key: object.Key,
    CopySource: copySource(bucket, object.Key),
    MetadataDirective: 'REPLACE',
    CacheControl: cacheControl,
    ContentType: head.ContentType || 'application/octet-stream',
    ContentEncoding: head.ContentEncoding,
    ContentDisposition: head.ContentDisposition,
    ContentLanguage: head.ContentLanguage,
    Expires: head.Expires,
    Metadata: head.Metadata,
  }))
  return 'updated'
}

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

for (const [label, bucket] of selected) {
  const objects = await listObjects(bucket)
  const results = await mapConcurrent(objects, 8, object => inspectAndUpdate(bucket, object))
  const totals = results.reduce((counts, result) => {
    counts[result] = (counts[result] || 0) + 1
    return counts
  }, {})
  console.log(`${label}: ${objects.length} objects`, totals)
}

if (!execute) console.log('Dry run only. Re-run with --execute to apply cache metadata.')
