# Repository Guidelines

## Scope & Precedence
- This file applies to `apps/akros`.
- In this monorepo, the closest `AGENTS.md` wins.
- If work touches `libs/ui` or `libs/storefront-data`, follow their local `AGENTS.md` files as source of truth.

## Project Context
- Stack: Next.js 16 e-shop, React 19, Tailwind v4 tokenized styling.
- Main app code: `src/app`, `src/components`, `src/lib`, `src/styles/tokens`, `public`.
- App token entrypoint: `src/styles/tokens/index.css`.
- Design references:
  - `local/prikazy.md`
  - `local/figma/screens/`
  - `local/figma/css/`
  - `local/figma-workflow.md`
- Generated outputs must not be edited directly: `.next/`, `dist/`, `storybook-static/`.

## Figma MCP Workflow
- In this environment, the official Figma MCP server is available and should be preferred whenever the user provides a Figma URL or node id.
- Primary tools for design-to-code work:
  - `get_design_context`
  - `get_variable_defs`
  - `get_screenshot`
  - `get_metadata`
  - `get_code_connect_map`
  - `get_code_connect_suggestions`
  - `add_code_connect_map`
  - `send_code_connect_mappings`
- Use `local/figma/screens` and `local/figma/css` as fallback exports and comparison material, not as a replacement for live Figma context when live context is available.
- For repeated design-system components, prefer establishing Code Connect mappings to `libs/ui` before implementing large screens.

## Akros UI & Token Workflow
- Read `local/figma-workflow.md` before significant Figma-driven implementation work.
- Start from component inventory, not JSX:
  - inspect the design
  - identify which `libs/ui` components are needed
  - decide allowed variants/themes/states before implementation
- For each selected `libs/ui` component, inspect:
  - the implementation `.tsx`
  - the library token file in `libs/ui/src/tokens/components/**`
  - the Storybook story in `libs/ui/stories/**`
- Apply token overrides in this order:
  1. `src/styles/tokens/_akros-semantic.css`
  2. `src/styles/tokens/_akros-typography.css`
  3. `src/styles/tokens/_akros-spacing.css`
  4. `src/styles/tokens/_akros-layout.css`
  5. `src/styles/tokens/components/_akros-<component>.css`
- Component-specific overrides belong in `src/styles/tokens/components/_akros-<component>.css` only when the shared token chain is not enough.
- Keep `src/styles/tokens/components/components.css` as the single import list for Akros component token overrides.
- Normalize near-identical Figma values into stable app tokens instead of copying every incidental pixel value.

## Token-First Rule
- Prefer internal UI primitives/components from `@techsio/ui-kit`, not native controls in app code.
- Do not use inline `className` for component visual styling when tokens can express the result.
- If the design does not match, fix token mapping in Akros token files first.
- Use inline `className` only for local layout/composition concerns such as `flex`, positioning, alignment, and one-off structure.
- If the desired styling cannot be expressed by the current token chain or component API, treat it as a `libs/ui` API gap:
  - temporary layout-only className is acceptable
  - long-term fix belongs in `libs/ui` tokens or component API

## Styling Guardrails
- Use token-based utility classes, not raw Tailwind palette or arbitrary spacing values.
  - Prefer: `p-200 mt-300 gap-150 text-fg-primary bg-surface`
  - Avoid: `p-4 mt-8 gap-4 bg-red-600 text-green-300`
- Preserve the `libs/ui` token chain whenever it already produces the right result.
- Do not add redundant Akros component overrides when semantic/typography/spacing tokens already solve the design.

## Validation
- `pnpm dev` runs the app on `http://localhost:3001`.
- `pnpm build` builds production output.
- `pnpm validate:token-usage`
- `pnpm validate:ui-primitives`
- `pnpm validate:file-size`
- `pnpm validate:guardrails`

## Testing Workflow
- For manual QA, use skill `local-web-testing`.
- Minimum checks: user flow smoke pass, DevTools Console, Network, and visual regression review.
- Save evidence to `.qa/local-web-testing-YYYY-MM-DD/` when doing manual QA.
