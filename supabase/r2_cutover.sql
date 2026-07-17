-- One-time, idempotent URL cutover for the current R2 public development URLs.
-- Export products, product_images, product_models, and product_uploads first.
-- Run only after both R2 buckets pass path-and-size verification.

begin;

do $$
declare
  image_base constant text := 'https://pub-d2328f7f64bf49aa994d43b9c5aceb5e.r2.dev';
  model_base constant text := 'https://pub-84fc0727fdb84df09265e22ce1684119.r2.dev';
begin
  update public.products
  set
    main_image_url = case when main_image_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(main_image_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else main_image_url end,
    fallback_image_url = case when fallback_image_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(fallback_image_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else fallback_image_url end,
    og_image_url = case when og_image_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(og_image_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else og_image_url end
  where main_image_url ~ '/storage/v1/object/public/product-images/'
     or fallback_image_url ~ '/storage/v1/object/public/product-images/'
     or og_image_url ~ '/storage/v1/object/public/product-images/';

  update public.product_images
  set
    url = case when url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else url end,
    thumbnail_url = case when thumbnail_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(thumbnail_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else thumbnail_url end,
    display_url = case when display_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(display_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else display_url end
  where url ~ '/storage/v1/object/public/product-images/'
     or thumbnail_url ~ '/storage/v1/object/public/product-images/'
     or display_url ~ '/storage/v1/object/public/product-images/';

  update public.product_models
  set
    url = case when url ~ '/storage/v1/object/public/product-models/'
      then regexp_replace(url, '^https?://[^/]+/storage/v1/object/public/product-models/', model_base || '/')
      else url end,
    lite_url = case when lite_url ~ '/storage/v1/object/public/product-models/'
      then regexp_replace(lite_url, '^https?://[^/]+/storage/v1/object/public/product-models/', model_base || '/')
      else lite_url end,
    poster_url = case when poster_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(poster_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else poster_url end,
    fallback_image_url = case when fallback_image_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(fallback_image_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
      else fallback_image_url end
  where url ~ '/storage/v1/object/public/product-models/'
     or lite_url ~ '/storage/v1/object/public/product-models/'
     or poster_url ~ '/storage/v1/object/public/product-images/'
     or fallback_image_url ~ '/storage/v1/object/public/product-images/';

  update public.product_uploads
  set public_url = case
    when public_url ~ '/storage/v1/object/public/product-images/'
      then regexp_replace(public_url, '^https?://[^/]+/storage/v1/object/public/product-images/', image_base || '/')
    when public_url ~ '/storage/v1/object/public/product-models/'
      then regexp_replace(public_url, '^https?://[^/]+/storage/v1/object/public/product-models/', model_base || '/')
    else public_url
  end
  where public_url ~ '/storage/v1/object/public/product-(images|models)/';
end
$$;

do $$
declare
  remaining bigint;
begin
  select count(*) into remaining
  from (
    select main_image_url as value from public.products
    union all select fallback_image_url from public.products
    union all select og_image_url from public.products
    union all select url from public.product_images
    union all select thumbnail_url from public.product_images
    union all select display_url from public.product_images
    union all select url from public.product_models
    union all select lite_url from public.product_models
    union all select poster_url from public.product_models
    union all select fallback_image_url from public.product_models
    union all select public_url from public.product_uploads
  ) urls
  where value like '%/storage/v1/object/public/product-%';

  if remaining > 0 then
    raise exception 'R2 cutover aborted: % legacy Supabase Storage URLs remain', remaining;
  end if;
end
$$;

commit;
