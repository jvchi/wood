alter table public.product_images
  add column if not exists width int,
  add column if not exists height int;
