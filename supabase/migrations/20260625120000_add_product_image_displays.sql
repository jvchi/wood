alter table public.product_images
  add column if not exists display_url text;

alter table public.product_uploads
  drop constraint if exists product_uploads_asset_kind_check;

alter table public.product_uploads
  add constraint product_uploads_asset_kind_check
  check (asset_kind in ('image', 'image_thumbnail', 'image_display', 'model', 'poster', 'lite_model', 'source_model', 'full_model'));
