// Compact thumbnail URL generator. Produces a small variant of a source image
// for use in product galleries / lists where the full-size original would
// dominate page weight.
//
// Strategy by source:
//  - Supabase storage URLs (`/storage/v1/object/public/...`) → rewrite to the
//    render endpoint (`/storage/v1/render/image/public/...`) with width/quality
//    query params. Requires Image Transforms to be enabled on the project; if
//    transforms aren't available the first <img onError> calls
//    `markSupabaseTransformsBroken()` and every subsequent call returns the
//    original URL — keeping the UI functional on Free tier.
//  - Unsplash (`images.unsplash.com`) → set `w=` and `q=` query params; their
//    CDN respects them.
//  - Anything else → return the URL unchanged.

import { useSyncExternalStore } from 'react'

const TRANSFORM_BROKEN_KEY = 'supabaseTransformsBroken'
let supabaseTransformsBroken =
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TRANSFORM_BROKEN_KEY) === '1'
const transformSubscribers = new Set()

export function supabaseTransformsAvailable() {
  return !supabaseTransformsBroken
}

// Call this from an <img onError> handler when a render-endpoint URL fails.
// Flips a global flag so every helper returns the original URL from now on,
// and notifies subscribers so currently-mounted <img>s re-render with src
// pointing at the original.
export function markSupabaseTransformsBroken() {
  if (supabaseTransformsBroken) return
  supabaseTransformsBroken = true
  try {
    sessionStorage.setItem(TRANSFORM_BROKEN_KEY, '1')
  } catch {
    // sessionStorage may be unavailable (private mode); flag still flips in-memory
  }
  transformSubscribers.forEach(fn => fn())
}

function subscribeTransforms(fn) {
  transformSubscribers.add(fn)
  return () => transformSubscribers.delete(fn)
}

// Hook: returns true when Supabase image transforms are usable. Components
// that build srcset/LQIP URLs should call this and re-render when it flips.
export function useSupabaseTransformsAvailable() {
  return useSyncExternalStore(subscribeTransforms, supabaseTransformsAvailable, supabaseTransformsAvailable)
}

function isSupabaseStorageUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    return new URL(url).pathname.startsWith('/storage/v1/object/public/')
  } catch {
    return false
  }
}

// 1x1 transparent gif — used as a no-op `src` so the browser never paints the
// default broken-image icon when a real source fails to load.
export const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

// Tiny blurred placeholder URL — ~24px wide, low quality. Pair with CSS
// `filter: blur()` for an LQIP (low-quality image placeholder) that is shown
// instantly while the full-resolution image streams in.
export function imageLqipUrl(url) {
  return imageThumbUrl(url, { width: 24, quality: 20 })
}

export function imageThumbUrl(url, { width = 240, quality = 70 } = {}) {
  if (!url || typeof url !== 'string') return url
  try {
    const u = new URL(url)
    // Supabase storage public object → image render endpoint
    const sbMarker = '/storage/v1/object/public/'
    if (u.pathname.startsWith(sbMarker)) {
      if (supabaseTransformsBroken) return url
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

// Default ladder of widths used for srcset across the app. Tuned for the
// common card / gallery sizes — most viewports land on 640 or 960.
const DEFAULT_SRCSET_WIDTHS = [400, 640, 960, 1280, 1600]

// Returns true if the URL can be reshaped (Supabase storage with transforms
// available, or Unsplash). Other hosts fall through to the original URL.
function isReshapable(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url)
    if (u.pathname.startsWith('/storage/v1/object/public/')) {
      return !supabaseTransformsBroken
    }
    if (/(^|\.)unsplash\.com$/.test(u.hostname)) return true
  } catch {
    return false
  }
  return false
}

// Single display URL — capped at the given width, quality tuned for photo
// content (q=75 is the standard sweet spot used by next/image, Cloudinary
// auto, etc.). Use for `src` fallback.
export function imageDisplayUrl(url, { width = 960, quality = 75 } = {}) {
  return imageThumbUrl(url, { width, quality })
}

// Build a `srcSet` string from a ladder of widths. Use with a matching
// `sizes` attribute so the browser picks the right variant per viewport.
// Returns `undefined` when the URL isn't reshapable so the caller can omit
// the attribute entirely (avoids shipping bogus identical-URL srcset).
export function imageSrcSet(url, { widths = DEFAULT_SRCSET_WIDTHS, quality = 75 } = {}) {
  if (!isReshapable(url)) return undefined
  return widths
    .map(w => `${imageThumbUrl(url, { width: w, quality })} ${w}w`)
    .join(', ')
}
