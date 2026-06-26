# Smart Suggest Core

This package owns serialization-safe Smart Suggest contracts only.

## Rules

- No React, UI-kit, Drizzle, Cloudflare, or provider SDK imports.
- Keep exports small, named, and stable.
- Do not store or expose raw-query persistence helpers here.
- Use discriminated string codes for errors and status values.

## Commands

- `pnpm --filter @techsio/smart-suggest-core build`
- `pnpm --filter @techsio/smart-suggest-core test`
- `pnpm --filter @techsio/smart-suggest-core typecheck`
