<p align="center">
  <img src="public/favicon.svg" alt="Wood" width="64" />
</p>

# Wood

A furniture e-commerce storefront with 3D product previews, smooth scrolling, and an admin catalog.

Wood is a React app with a shop, product detail views, cart, wishlist, and admin tools for managing products and taxonomy. Product metadata lives in Supabase; images and 3D models are served from Cloudflare R2.

**Live demo:** [wood-place.vercel.app](https://wood-place.vercel.app/)

## Features

- Shop, product detail, cart, and wishlist flows
- Persistent Three.js scene for product previews
- GSAP scroll animations and Lenis smooth scrolling
- Route-level code splitting and shared product transitions
- Admin dashboard for products and taxonomy
- Supabase-backed catalog with R2 media storage

## Prerequisites

- Node.js 20+
- npm
- [Supabase](https://supabase.com/) project
- [Cloudflare R2](https://developers.cloudflare.com/r2/) buckets for product media

## Getting started

```sh
git clone https://github.com/jvchi/wood.git
cd wood
npm install
```

Copy `.env.example` to `.env.local` and fill in your Supabase and R2 values.

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```sh
npm run build
npm run preview
```

## Admin catalog setup

Run `supabase/admin_catalog.sql` in the Supabase SQL editor before using `/admin/products`.

The schema creates catalog tables, upload tracking, inventory logs, public-read policies, and authenticated admin-only write policies.

> [!IMPORTANT]
> Admin routes require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Product assets are stored in R2, not Supabase Storage.

> [!NOTE]
> See [`docs/r2-migration.md`](docs/r2-migration.md) for R2 setup, migration, verification, and cleanup.

## Project structure

```
src/
  components/          # layout, shop UI, Three.js scene, admin views
  context/             # cart, wishlist, toast, shared transitions
  hooks/               # initial load and route helpers
  lib/                 # route preloaders and utilities
api/                   # serverless handlers and R2 helpers
supabase/              # SQL schema and edge functions
docs/                  # R2 migration runbook
public/                # static assets and favicon
```
