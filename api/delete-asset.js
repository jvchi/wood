// POST /api/delete-asset
// Body: { bucket, paths: string[] }
// Returns: { deleted }
//
// Removes objects from R2. Used by the product/model cleanup paths so deleted
// products don't leave orphaned files behind.

import { DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { r2Client, ALLOWED_BUCKETS, assertAdmin, sanitizeKey, readJson } from './_r2.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  try {
    await assertAdmin(req)
    const { bucket, paths } = await readJson(req)

    const realBucket = ALLOWED_BUCKETS[bucket]
    if (!realBucket) return res.status(400).json({ error: 'unknown bucket' })

    const keys = [...new Set(
      (Array.isArray(paths) ? paths : [paths]).filter(Boolean).map(sanitizeKey),
    )]
    if (!keys.length) return res.status(200).json({ deleted: 0 })
    if (keys.length > 1000) return res.status(400).json({ error: 'at most 1000 objects may be deleted at once' })

    const result = await r2Client().send(new DeleteObjectsCommand({
      Bucket: realBucket,
      Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true },
    }))

    const failures = (result.Errors || []).map(item => ({
      key: item.Key,
      code: item.Code || 'DeleteFailed',
    }))
    if (failures.length) {
      return res.status(502).json({ error: 'one or more R2 objects could not be deleted', failures })
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ deleted: keys.length })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'delete-asset error' })
  }
}
