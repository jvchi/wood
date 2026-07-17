import test from 'node:test'
import assert from 'node:assert/strict'
import { assertAdmin, sanitizeKey, validateUpload } from './_r2.js'

test('validates an image upload and fixes immutable cache metadata', () => {
  const result = validateUpload({
    bucket: 'product-images',
    path: 'thumbs/product-1/123-chair.webp',
    contentType: 'image/webp',
    contentLength: 2048,
  })

  assert.equal(result.key, 'thumbs/product-1/123-chair.webp')
  assert.equal(result.contentLength, 2048)
  assert.equal(result.cacheControl, 'public, max-age=31536000, immutable')
})

test('rejects unsupported content types and oversized objects', () => {
  assert.throws(() => validateUpload({
    bucket: 'product-images',
    path: 'product-1/file.svg',
    contentType: 'image/svg+xml',
    contentLength: 100,
  }), /unsupported content type/)

  assert.throws(() => validateUpload({
    bucket: 'product-models',
    path: 'product-1/model.glb',
    contentType: 'model/gltf-binary',
    contentLength: (150 * 1024 * 1024) + 1,
  }), /file exceeds/)
})

test('rejects traversal and control characters in object keys', () => {
  assert.throws(() => sanitizeKey('../private/object'), /invalid path/)
  assert.throws(() => sanitizeKey('/'), /invalid path/)
  assert.throws(() => sanitizeKey('product-1/bad\u0000name'), /invalid path/)
})

test('rejects requests without a Supabase bearer token before contacting Auth', async () => {
  await assert.rejects(
    assertAdmin({ headers: {} }),
    error => error.status === 401 && error.message === 'missing bearer token',
  )
})
