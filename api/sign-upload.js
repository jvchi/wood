// POST /api/sign-upload
// Body: { bucket, path, contentType, contentLength, cacheControl }
// Returns: { url, publicUrl }
//
// Mints a short-lived presigned PUT URL so the browser can upload a single
// object directly to R2. All models here are small (largest ~34MB), so a plain
// presigned PUT is enough — no multipart / resumable machinery needed.

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client, publicUrl, assertAdmin, validateUpload, readJson } from './_r2.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  try {
    await assertAdmin(req)
    const body = await readJson(req)
    const { realBucket, key, contentType, contentLength, cacheControl } = validateUpload(body)

    const command = new PutObjectCommand({
      Bucket: realBucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      CacheControl: cacheControl,
    })
    const url = await getSignedUrl(r2Client(), command, {
      expiresIn: 300,
      signableHeaders: new Set(['content-type', 'cache-control']),
    })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ url, publicUrl: publicUrl(body.bucket, key) })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'sign-upload error' })
  }
}
