// Compact thumbnail URL generator. Produces a small variant of a source image
// for use in product galleries / lists where the full-size original would
// dominate page weight.
//
// Strategy by source:
//  - Supabase storage URLs (`/storage/v1/object/public/...`) → rewrite to the
//    render endpoint (`/storage/v1/render/image/public/...`) with width/quality
//    query params. Requires Image Transforms to be enabled on the project; if
//    a request 404s (free tier without transforms), the caller's <img onError>
//    swap will fall back to the original URL.
//  - Unsplash (`images.unsplash.com`) → set `w=` and `q=` query params; their
//    CDN respects them.
//  - Anything else → return the URL unchanged.

export function imageThumbUrl(url, { width = 240, quality = 70 } = {}) {
  if (!url || typeof url !== 'string') return url
  try {
    const u = new URL(url)
    // Supabase storage public object → image render endpoint
    const sbMarker = '/storage/v1/object/public/'
    if (u.pathname.startsWith(sbMarker)) {
      u.pathname = u.pathname.replace(sbMarker, '/storage/v1/render/image/public/')
      u.searchParams.set('width', String(width))
      u.searchParams.set('quality', String(quality))
      u.searchParams.set('resize', 'contain')
      return u.toString()
    }
    // Unsplash
    if (/(^|\.)unsplash\.com$/.test(u.hostname)) {
      u.searchParams.set('w', String(width))
      u.searchParams.set('q', String(quality))
      u.searchParams.set('auto', 'format')
      return u.toString()
    }
  } catch {
    // not a parseable URL (e.g. data: URI) — return as-is
  }
  return url
}
