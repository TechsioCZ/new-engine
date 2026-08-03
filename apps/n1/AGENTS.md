# N1 Storefront

Next.js 16 + React 19 storefront. Assume `http://localhost:3000` is running.

- No barrel or re-export-only `index.ts` files.
- Import UI components through explicit `@techsio/ui-kit/...` subpaths, not `@libs/ui`, package roots, or `dist`.
- Use component and semantic tokens; no raw Tailwind palette, arbitrary values, or nonexistent spacing aliases.
- Use React 19 ref-as-prop; no `forwardRef` or unnecessary `useCallback`.
- Read `local/docs/user/*.md` before cart, auth, checkout, order, address, or provider work.
- External data is `unknown` until validated. Reuse `@techsio/std`; keep requests, pagination, retries, and polling bounded.
- Never edit `.next` or generated outputs.

Verification:

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/apps/n1/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/apps/n1/tsconfig.json
pnpm -C apps/n1 build
pnpm -C libs/ui build
```

Verify interactive UI changes in a browser, including keyboard/focus and console/network checks.
