# Frontend Template

Clean Next.js starter on the TechSio Design System (`@techsio/ui-kit`).

- Next.js 16 (App Router, Turbopack, React Compiler) · React 19
- Tailwind CSS v4 with UI-kit tokens, default `business` brand
- TypeScript 7 · oxlint · oxfmt
- Node.js 24 LTS · pnpm

## Getting started

```sh
pnpm install
pnpm dev        # http://localhost:3001
```

## Scripts

| Script           | What it does                               |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Dev server on port 3001                    |
| `pnpm build`     | Production build (`output: "standalone"`)  |
| `pnpm start`     | Serve the production build                 |
| `pnpm lint`      | oxlint (`pnpm lint:fix` to apply fixes)    |
| `pnpm format`    | oxfmt (`pnpm format:check` to only verify) |
| `pnpm typecheck` | Generate Next route types + `tsc --noEmit` |
| `pnpm check`     | Format check, lint and typecheck           |

## Structure

```
src/
  app/
    globals.css     # imports the token layer
    icon.svg
    layout.tsx      # <html class="light" data-theme="business">
    page.tsx
  styles/tokens/
    index.css       # Tailwind + UI-kit tokens + app overrides
```

This directory is a standalone pnpm root (own `pnpm-workspace.yaml` and lockfile)
and consumes the published UI kit, so it can be copied into a new repository
as-is. See `AGENTS.md` for UI and token conventions.
