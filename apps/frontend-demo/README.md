# Frontend Demo - E-commerce Store

A modern e-commerce demo built with Next.js 16 and @techsio/ui-kit (Zag.js + Tailwind CSS).

## Local setup

- Install deps from repo root: `pnpm install`
- In `apps/frontend-demo`, copy `.env.local.example` to `.env` and set:
  - NEXT_PUBLIC_MEDUSA_BACKEND_URL (defaults to http://localhost:9000)
  - NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  - RESEND_API_KEY, CONTACT_EMAIL, RESEND_FROM_EMAIL
  - NEXT_PUBLIC_MEILISEARCH_URL, NEXT_PUBLIC_MEILISEARCH_API_KEY (optional, for search)
- Start dev server: `pnpm dev`

## Live demo

Visit the live demo at: https://wr-demo.netlify.app

## Build and run

```bash
pnpm build
pnpm start
```

## Tech stack

- Next.js 16
- @techsio/ui-kit
- Tailwind CSS + design tokens
- Nx + pnpm

## Project structure

```
frontend-demo/
  src/
    app/           # Next.js app directory
    components/    # Page-specific components
    data/          # Mock data and constants
    tokens/        # Design system tokens
  public/          # Static assets
  .next/           # Build output
```
