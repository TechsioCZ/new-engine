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
- `PAYLOAD_LOCALES`: comma-separated list, first entry is the default locale

Optional (commonly used):

- `PAYLOAD_SCHEMA_NAME`
- `FEATURE_PAYLOAD_ARTICLES_ENABLED`, `FEATURE_PAYLOAD_PAGES_ENABLED`, `FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED`
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`
- `MEDUSA_BACKEND_URL` (enables CMS cache invalidation in Medusa)
- `PAYLOAD_SSO_PUBLIC_KEY`, `PAYLOAD_SSO_ALLOWED_ORIGINS`, `PAYLOAD_SSO_ISSUER`,
  `PAYLOAD_SSO_AUDIENCE`, `PAYLOAD_SSO_ALG`

### 2) Install deps (repo root)

```bash
pnpm install
```

### 3) Run migrations

```bash
pnpm --filter @nmit/payload payload migrate
```

### 4) Start dev server

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

The root `docker-compose.yaml` runs Payload on port 8083 and executes migrations on startup. Use the root README steps
(`make dev`) if you prefer the Docker stack.

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
