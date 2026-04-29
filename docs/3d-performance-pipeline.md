# 3D Performance Pipeline

This app treats every production model as a small asset set, not a single raw upload.

## Required Outputs

- `full.glb`: desktop/high-end model, compressed with Draco or Meshopt.
- `lite.glb`: mobile/low-power model with lower triangle count and smaller textures.
- `poster.webp` or `poster.avif`: static fallback used for LCP, reduced motion, save-data, weak devices, and WebGL failure.

## Optimization Commands

Inspect a source model:

```sh
npm run model:inspect -- source.glb
```

Create an optimized GLB:

```sh
npm run model:optimize -- source.glb full.glb --compress draco --texture-compress webp --texture-size 2048
```

Create a lighter mobile GLB:

```sh
npm run model:optimize -- source.glb lite.glb --compress meshopt --simplify --texture-compress webp --texture-size 1024
```

## Admin Upload Contract

Admin-uploaded models should be entered with:

- `Model URL`: full optimized GLB.
- `Lite model URL`: lower-cost mobile GLB.
- `Fallback image`: WebP or AVIF poster.
- `Model version`: any value that changes when model bytes change.

The app uses the full URL on high-end devices, the lite URL on mobile/low-memory devices, and the poster when static media is the better experience. The version is appended as a cache-busting query string while Vercel serves local model files with long-lived immutable caching.

## Budgets

- Homepage hero room target: under 6 MB compressed.
- Product viewer target: under 3 MB compressed.
- Mobile/lite target: under 1.5 MB compressed.
- Poster target: under 200 KB.

If a model exceeds budget, reduce texture dimensions first, then simplify hidden/internal geometry, then create a more aggressive lite variant.

## Current Checked-In Optimized Assets

- `room.glb`: 24.1 MB original, 1.69 MB full, 1.1 MB lite.
- `pipo_chair.glb`: 21.69 MB original, 1.45 MB full, 1.05 MB lite.
- `couch.glb`: 8.34 MB original, 717 KB full, 178 KB lite.
