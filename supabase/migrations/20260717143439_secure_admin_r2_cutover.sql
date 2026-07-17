-- R2 is now the object store. Supabase remains responsible for Auth and
-- catalog metadata. Authorization is based only on server-managed app_metadata.

grant select on table
  public.categories,
  public.collections,
  public.products,
  public.product_images,
  public.product_models
to anon, authenticated;

grant select, insert, update, delete on table
  public.categories,
  public.collections,
  public.products,
  public.product_images,
  public.product_models,
  public.product_uploads
to authenticated;

grant select, insert on table public.inventory_logs to authenticated;

revoke insert, update, delete on table
  public.categories,
  public.collections,
  public.products,
  public.product_images,
  public.product_models
from anon;
revoke all on table public.product_uploads, public.inventory_logs from anon;
revoke update, delete on table public.inventory_logs from authenticated;

drop policy if exists "Dashboard can manage categories" on public.categories;
drop policy if exists "Dashboard can manage collections" on public.collections;
drop policy if exists "Dashboard can manage products" on public.products;
drop policy if exists "Dashboard can manage product images" on public.product_images;
drop policy if exists "Dashboard can manage product models" on public.product_models;
drop policy if exists "Dashboard can manage product uploads" on public.product_uploads;
drop policy if exists "Dashboard can read inventory logs" on public.inventory_logs;
drop policy if exists "Dashboard can write inventory logs" on public.inventory_logs;
drop policy if exists "Admins can manage categories" on public.categories;
drop policy if exists "Admins can manage collections" on public.collections;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Admins can manage product images" on public.product_images;
drop policy if exists "Admins can manage product models" on public.product_models;
drop policy if exists "Admins can manage product uploads" on public.product_uploads;
drop policy if exists "Admins can read inventory logs" on public.inventory_logs;
drop policy if exists "Admins can write inventory logs" on public.inventory_logs;

create policy "Admins can manage categories" on public.categories
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can manage collections" on public.collections
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can manage products" on public.products
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can manage product images" on public.product_images
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can manage product models" on public.product_models
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can manage product uploads" on public.product_uploads
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can read inventory logs" on public.inventory_logs
for select to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can write inventory logs" on public.inventory_logs
for insert to authenticated
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- The application no longer accesses storage.objects. Remove the old anon-key
-- policies so a future code path cannot write back into Supabase Storage.
drop policy if exists "Dashboard can upload product images" on storage.objects;
drop policy if exists "Dashboard can read product images" on storage.objects;
drop policy if exists "Dashboard can upload product models" on storage.objects;
drop policy if exists "Dashboard can read product models" on storage.objects;
