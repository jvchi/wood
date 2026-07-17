# Cloudflare R2 cutover runbook

Product metadata and Auth remain in Supabase. Product images and 3D models live
in the public R2 buckets `product-images` and `product-models`.

## Current state

- Supabase currently returns HTTP 402 with `exceed_storage_size_quota`.
- R2 `product-images`: 154 objects / 155,757,915 bytes at the last audit.
- R2 `product-models`: empty at the last audit.
- Do not delete Supabase objects until the source-to-R2 verification passes and
  the URL transaction has committed.

The migration scripts intentionally refuse to run while Supabase returns 402.
If the billing cycle has reset and the restriction remains after the platform's
short delay, open a Supabase support ticket with the exact restriction code.

## 1. Configure runtime secrets

Set the public variables in the Vite/Vercel environment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_R2_PUBLIC_IMAGES
VITE_R2_PUBLIC_MODELS
```

Set these only in Vercel's server environment:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_IMAGES
R2_BUCKET_MODELS
R2_PUBLIC_IMAGES
R2_PUBLIC_MODELS
```

`SUPABASE_PUBLISHABLE_KEY` may be the same public value as the existing Vite
anon key. Never expose the service-role key or R2 credentials as `VITE_*`.

For the `compress-model` Edge Function, set its R2 secrets and deploy it:

```bash
supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET_MODELS=product-models \
  R2_PUBLIC_MODELS=https://pub-84fc0727fdb84df09265e22ce1684119.r2.dev
supabase functions deploy compress-model
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed
Edge Functions automatically.

## 2. Configure Auth and database policies

Disable public signups in Supabase Auth. Add the service-role key and the first
admin credentials to `.env.local`, then run:

```bash
npm run admin:bootstrap
```

The script creates or updates that Auth user and assigns
`app_metadata.role = "admin"`. Apply
`supabase/migrations/20260717143439_secure_admin_r2_cutover.sql` before using the
new dashboard. Sign out and back in after changing an existing user's role so
the JWT contains the new app metadata.

## 3. Configure R2 CORS

Apply this policy to both buckets, replacing the production origin exactly:

```json
[
  {
    "AllowedOrigins": ["https://your-production-site.example", "http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "Cache-Control"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

The selected `r2.dev` domains are development endpoints and may be rate
limited. Move to custom asset domains before traffic grows substantially.

## 4. Copy and verify objects

Preferred: in Cloudflare R2 → Data migration, create a Super Slurper job for
each Supabase S3-compatible bucket with overwrite enabled. This reconciles the
partial image copy without deleting the source.

Fallback: the repository already has `supabase:` and `r2:` rclone remotes. Once
the 402 clears, run:

```bash
npm run r2:migrate:copy
```

The command copies both buckets concurrently, preserves metadata, and performs
a one-way path-and-size check. To re-run verification without copying:

```bash
npm run r2:migrate:verify
```

ETags are not compared because a server-side multipart migration can change an
ETag without changing object contents.

## 5. Backfill cache metadata and switch database URLs

Preview and then apply immutable browser cache headers to objects already in R2:

```bash
npm run r2:cache:plan
npm run r2:cache:apply
```

Export `products`, `product_images`, `product_models`, and `product_uploads`.
Then run `supabase/r2_cutover.sql` in the Supabase SQL editor. It rewrites all
legacy Storage URLs in one transaction and aborts if any targeted legacy URL
remains.

## 6. Acceptance checks and source deletion

Before deleting the source:

1. Load the shop and several product pages; confirm images and models come from
   the R2 public domains.
2. Sign in to `/admin`, upload an image, and confirm original/thumbnail/display
   objects appear in R2.
3. Upload a model through auto-compression and confirm source/full/lite objects.
4. Delete a test product and confirm all tracked objects disappear from R2.
5. Run `npm run r2:migrate:verify` again.

Only after all five checks pass, empty Supabase Storage:

```bash
node --env-file=.env.local scripts/r2-storage-migrate.mjs \
  --delete-source --yes-i-verified-cutover
```

The command verifies both buckets first, deletes only the Supabase source, and
fails unless both source buckets report zero objects afterward. Remove the
empty buckets in the dashboard if desired, then rotate the migration and R2 API
credentials.
