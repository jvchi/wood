create extension if not exists pgcrypto;

create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  description text,
  category_id text references public.categories(id) on delete set null,
  collection_id text references public.collections(id) on delete set null,
  tags text[] not null default '{}',
  material text,
  color text,
  dimensions jsonb,
  dimension_text text,
  weight text,
  brand text,
  room_type text,
  regular_price numeric(12, 2) not null default 0 check (regular_price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  currency text not null default 'USD',
  discount_percentage integer not null default 0 check (discount_percentage between 0 and 100),
  cost_price numeric(12, 2) check (cost_price is null or cost_price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text unique,
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  stock_status text not null default 'out_of_stock' check (stock_status in ('in_stock', 'low_stock', 'out_of_stock', 'preorder')),
  main_image_url text,
  fallback_image_url text,
  published boolean not null default false,
  archived boolean not null default false,
  featured boolean not null default false,
  new_arrival boolean not null default false,
  best_seller boolean not null default false,
  show_on_homepage boolean not null default false,
  show_in_collection boolean not null default true,
  delivery_estimate text,
  assembly_required boolean not null default false,
  care_instructions text,
  warranty_info text,
  return_eligible boolean not null default true,
  seo_title text,
  seo_description text,
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  url text not null,
  thumbnail_url text,
  alt_text text,
  sort_order integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.product_images add column if not exists thumbnail_url text;
alter table public.product_images add column if not exists display_url text;

create table if not exists public.product_models (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  url text not null,
  lite_url text,
  poster_url text,
  version text,
  fallback_image_url text,
  scale numeric(8, 3) not null default 1,
  rotation text not null default '0,0,0',
  format text not null default 'glb' check (format in ('glb', 'gltf', 'usdz')),
  file_size bigint check (file_size is null or file_size >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_models add column if not exists lite_url text;
alter table public.product_models add column if not exists poster_url text;
alter table public.product_models add column if not exists version text;
alter table public.product_models add column if not exists format text not null default 'glb';
alter table public.product_models add column if not exists file_size bigint;
alter table public.product_models add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.product_models add column if not exists camera text;

create table if not exists public.product_uploads (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete set null,
  bucket_id text not null check (bucket_id in ('product-images', 'product-models')),
  storage_path text not null,
  public_url text not null,
  asset_kind text not null check (asset_kind in ('image', 'image_thumbnail', 'image_display', 'model', 'poster', 'lite_model', 'source_model', 'full_model')),
  file_name text not null,
  content_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  status text not null default 'ready' check (status in ('uploading', 'ready', 'failed', 'deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_uploads drop constraint if exists product_uploads_asset_kind_check;
alter table public.product_uploads
  add constraint product_uploads_asset_kind_check
  check (asset_kind in ('image', 'image_thumbnail', 'image_display', 'model', 'poster', 'lite_model', 'source_model', 'full_model'));

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete set null,
  previous_quantity integer not null,
  new_quantity integer not null,
  reason text not null default 'admin_update',
  created_at timestamptz not null default now()
);

create or replace function public.set_product_stock_status()
returns trigger
language plpgsql
as $$
begin
  if new.stock_quantity <= 0 then
    new.stock_status := 'out_of_stock';
  elsif new.stock_status <> 'preorder' and new.stock_quantity <= new.low_stock_threshold then
    new.stock_status := 'low_stock';
  elsif new.stock_status <> 'preorder' then
    new.stock_status := 'in_stock';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_products_stock_status on public.products;
create trigger trg_products_stock_status
before insert or update on public.products
for each row execute function public.set_product_stock_status();

create index if not exists idx_products_public_catalog
  on public.products (published, archived, updated_at desc)
  where published = true and archived = false;

create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_collection on public.products (collection_id);
create index if not exists idx_products_stock_status on public.products (stock_status);
create index if not exists idx_products_featured on public.products (featured) where featured = true;
create index if not exists idx_product_images_product_sort on public.product_images (product_id, sort_order);
create index if not exists idx_product_models_product on public.product_models (product_id);
create index if not exists idx_product_uploads_product_created on public.product_uploads (product_id, created_at desc);
create index if not exists idx_product_uploads_bucket_status on public.product_uploads (bucket_id, status);
create index if not exists idx_inventory_logs_product_created on public.inventory_logs (product_id, created_at desc);

insert into public.categories (id, name, slug, description)
values
  ('sofas', 'Sofas', 'sofas', 'Soft seating for living spaces.'),
  ('sectionals', 'Sectionals', 'sectionals', 'Modular pieces for larger rooms.'),
  ('chairs', 'Chairs', 'chairs', 'Lounge, accent, and work chairs.'),
  ('benches', 'Benches', 'benches', 'Entry, dining, and bedroom benches.'),
  ('ottomans', 'Ottomans', 'ottomans', 'Footrests and soft tables.'),
  ('daybeds', 'Daybeds', 'daybeds', 'Hybrid lounging pieces.')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  updated_at = now();

insert into public.collections (id, name, slug, description)
values
  ('quiet-room', 'Quiet Room', 'quiet-room', 'Low-profile pieces with calm silhouettes.'),
  ('soft-forms', 'Soft Forms', 'soft-forms', 'Rounded upholstery and tactile materials.'),
  ('work-lounge', 'Work Lounge', 'work-lounge', 'Pieces for studios, offices, and reading corners.')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  updated_at = now();

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true), ('product-models', 'product-models', true)
on conflict (id) do update set public = excluded.public;

update storage.buckets
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'product-images';

update storage.buckets
set
  public = true,
  file_size_limit = 157286400,
  allowed_mime_types = array['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
where id = 'product-models';

alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_models enable row level security;
alter table public.product_uploads enable row level security;
alter table public.inventory_logs enable row level security;

drop policy if exists "Public can read published products" on public.products;
drop policy if exists "Public can read product images" on public.product_images;
drop policy if exists "Public can read product models" on public.product_models;
drop policy if exists "Public can read taxonomy" on public.categories;
drop policy if exists "Public can read collections" on public.collections;
drop policy if exists "Dashboard can manage categories" on public.categories;
drop policy if exists "Dashboard can manage collections" on public.collections;
drop policy if exists "Dashboard can manage products" on public.products;
drop policy if exists "Dashboard can manage product images" on public.product_images;
drop policy if exists "Dashboard can manage product models" on public.product_models;
drop policy if exists "Dashboard can manage product uploads" on public.product_uploads;
drop policy if exists "Dashboard can read inventory logs" on public.inventory_logs;
drop policy if exists "Dashboard can write inventory logs" on public.inventory_logs;

create policy "Public can read published products" on public.products
for select using (published = true and archived = false);

create policy "Public can read product images" on public.product_images
for select using (true);

create policy "Public can read product models" on public.product_models
for select using (true);

create policy "Public can read taxonomy" on public.categories
for select using (true);

create policy "Public can read collections" on public.collections
for select using (true);

-- This project currently has no admin auth layer. These policies make /admin functional
-- with the anon key. Before production, replace them with role-scoped admin policies.
create policy "Dashboard can manage categories" on public.categories for all using (true) with check (true);
create policy "Dashboard can manage collections" on public.collections for all using (true) with check (true);
create policy "Dashboard can manage products" on public.products for all using (true) with check (true);
create policy "Dashboard can manage product images" on public.product_images for all using (true) with check (true);
create policy "Dashboard can manage product models" on public.product_models for all using (true) with check (true);
create policy "Dashboard can manage product uploads" on public.product_uploads for all using (true) with check (true);
create policy "Dashboard can read inventory logs" on public.inventory_logs for select using (true);
create policy "Dashboard can write inventory logs" on public.inventory_logs for insert with check (true);

drop policy if exists "Dashboard can upload product images" on storage.objects;
drop policy if exists "Dashboard can read product images" on storage.objects;
drop policy if exists "Dashboard can upload product models" on storage.objects;
drop policy if exists "Dashboard can read product models" on storage.objects;

create policy "Dashboard can upload product images" on storage.objects
for all using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

create policy "Dashboard can read product images" on storage.objects
for select using (bucket_id = 'product-images');

create policy "Dashboard can upload product models" on storage.objects
for all using (bucket_id = 'product-models') with check (bucket_id = 'product-models');

create policy "Dashboard can read product models" on storage.objects
for select using (bucket_id = 'product-models');
