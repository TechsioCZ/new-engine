# Payload CMS (apps/payload)

This app is the Payload 3 admin + API for the CMS portion of the monorepo. It runs on Next.js 15, uses Postgres for
data storage, S3-compatible storage for media, and includes integrations for SEO, localization, Medusa cache
invalidation, and Medusa SSO.

## What is included

- Collections: Users, Media, Articles, Article Categories, Pages, Page Categories, Hero Carousels
- Feature flags to enable/disable content groups (defaults to enabled unless set to 0/false)
- Localization with configurable locales
- Auto-translate plugin (OpenAI)
- S3 storage adapter (MinIO/AWS)
- Custom API endpoints for categories and Medusa SSO

## Local development

### 1) Configure env

Copy the example and update the required values:

```bash
cp apps/payload/.env.example apps/payload/.env
```

Required:

- `DATABASE_URL`: postgresql://user:password@localhost/database
- `PAYLOAD_SECRET`
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `PAYLOAD_SSO_USER_EMAIL`, `PAYLOAD_SSO_PRIVATE_KEY`, and `PAYLOAD_SSO_PUBLIC_KEY` for Medusa-driven SSO and local seed

Optional (commonly used):

- `PAYLOAD_SCHEMA_NAME`
- `PAYLOAD_LOCALES`: comma-separated list, first entry is the default locale; defaults to `en`
- `FEATURE_PAYLOAD_ARTICLES_ENABLED`, `FEATURE_PAYLOAD_PAGES_ENABLED`, `FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED`
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`
- `MEDUSA_BACKEND_URL` (enables CMS cache invalidation in Medusa)
- `PAYLOAD_SSO_ALLOWED_ORIGINS`, `PAYLOAD_SSO_ISSUER`, `PAYLOAD_SSO_AUDIENCE`, `PAYLOAD_SSO_ALG`

`PAYLOAD_SSO_ALLOWED_ORIGINS` accepts a comma-separated list of URLs and matches by origin (scheme + host + port), so path segments are ignored.

### 2) Install deps (repo root)

```bash
pnpm install
```

### 3) Run migrations

```bash
pnpm --filter @nmit/payload payload migrate
```

### 4) Seed local data

```bash
pnpm --filter @nmit/payload run seed
```

The seed is idempotent. It creates or syncs the Payload admin user from the Medusa SSO email/key envs and upserts the
starter CMS records by slug/title so it can be run repeatedly without duplicating content.

Optional Herbatica product article seed:

```bash
PAYLOAD_SEED_HERBATICA_PRODUCTS_ENABLED=1 \
HERBATICA_XML_PATH=/path/to/productsComplete.xml \
pnpm --filter @nmit/payload run seed
```

When enabled, product article seed reads `HERBATICA_XML_PATH` (or the committed Herbatica fixture if present), creates or
updates Payload articles by deterministic `produkt-*` slugs, and upserts article categories by slug. Use
`PAYLOAD_SEED_HERBATICA_PRODUCTS_LIMIT` to cap imported products during local/dev runs.

Optional Herbatica blog article XLSX seed:

```bash
HERBATICA_BLOG_ARTICLES_XLSX_PATH=/home/tomas/Stažené/blog_clanky.xlsx \
PAYLOAD_SEED_ARTICLES_LOCALE=sk \
PAYLOAD_SEED_ARTICLES_STATUS=published \
pnpm --filter @nmit/payload run seed
```

The XLSX import uses the same parser as the Payload admin import (`title` and `content` required, plus optional
`excerpt`, `slug`, `category`, `category_slug`, `tags`, `status`, `publishedDate`, `featured_image_path`, and
`author_email`). Re-running the seed will skip existing localized articles by slug; set
`PAYLOAD_SEED_ARTICLES_OVERWRITE=1` to update already imported rows.

### 5) Start dev server

```bash
pnpm --filter @nmit/payload dev
```

Or with Nx:

```bash
npx nx dev payload
```

Open the admin UI at `http://localhost:3000/admin` (adjust if you customize `routes.admin` in
`apps/payload/src/payload.config.ts`).

### Docker (monorepo)

The root `docker-compose.yaml` runs Payload on port 8083, executes migrations, and runs the idempotent seed on startup.
Use the root README steps (`make dev`) if you prefer the Docker stack.

## API endpoints

All endpoints are mounted under the Payload API base (default: `/api`):

- `GET /api/article-categories-with-articles?categorySlug=&locale=`
- `GET /api/page-categories-with-pages?categorySlug=&locale=`
- `POST /api/medusa-sso` (form-data `token`, optional `returnTo`)

## Scripts

- `pnpm dev`, `pnpm devsafe`, `pnpm build`, `pnpm start`
- `pnpm generate:types` after schema changes
- `pnpm generate:importmap` after admin component changes
- `pnpm test:int`, `pnpm test:e2e`, `pnpm test`

## Notes

- Postgres schema migrations live in `apps/payload/src/migrations`.
- Localization is controlled by `PAYLOAD_LOCALES`; supported languages include: `en`, `cs`, `sk`, `pl`, `hu`, `ro`,
  `sl`, `de`, `fr`, `es`.
