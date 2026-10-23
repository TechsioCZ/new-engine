# @techsio/ui-kit

React 19 components, Zag.js interactions and Tailwind v4 design tokens.
Start with **Guide / Getting Started** in Storybook (source:
[getting-started.mdx](.storybook/getting-started.mdx)).
[AGENTS.md](AGENTS.md) is the canonical contributor rulebook, and
[component contracts](docs/component-contracts.md) define shared behavior.

## Install and initialize

Use React and React DOM 19.2 or newer. The package has public subpath exports,
not a root barrel.

```sh
pnpm add @techsio/ui-kit react react-dom
pnpm add -D tailwindcss @tailwindcss/postcss postcss
```

Process global CSS once through Tailwind v4's PostCSS plugin:

```js
// postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } }
```

Choose **one** stylesheet recipe:

```css
/* App does not already import Tailwind: */
@import "@techsio/ui-kit/tokens-with-tailwind";
```

```css
/* App owns its Tailwind import: */
@import "tailwindcss";
@import "@techsio/ui-kit/tokens";
```

Both entries register the shipped component JavaScript with a package-relative
`@source`. Tailwind otherwise excludes dependencies under `node_modules`; an
unprocessed CSS link or a token-variable import alone cannot generate utilities.
Do not copy component classes into app source or import both recipes together.

```tsx
import { Button } from '@techsio/ui-kit/atoms/button'

export function CheckoutAction() {
  return <Button>Continue to checkout</Button>
}
```

## Brands and modes

Brand selection uses `data-theme` on `html`; mode uses one `.light` or `.dark`
class. Base has **no** `data-theme` attribute. The source registry is
[src/theme/theme-config.ts](src/theme/theme-config.ts).

| Brand | Root attribute | Modes |
| --- | --- | --- |
| base | none | light, dark |
| neo | `data-theme="neo"` | light, dark |
| business | `data-theme="business"` | light only |
| akros | `data-theme="akros"` | light only |

For a fixed Akros app, use `<html lang="en" class="light" data-theme="akros">`.
No provider is needed for a fixed theme. Do not create an Akros dark scheme.

For optional persisted switching, create an app client wrapper:

```tsx
'use client'

import type { PropsWithChildren } from 'react'
import { AppThemeProvider, BrandThemeScript } from '@techsio/ui-kit/theme/theme-provider'

export function ThemeSetup({ children }: PropsWithChildren) {
  return (
    <>
      <BrandThemeScript defaultBrand="akros" />
      <AppThemeProvider defaultBrand="akros" defaultMode="light">
        {children}
      </AppThemeProvider>
    </>
  )
}
```

Render the script before visible body content. The provider applies mode
initialization and locks light-only brands to light. Defaults are fallbacks to
persisted preferences, not forced-brand configuration. `useAppTheme()` from the
same subpath exposes selection, allowed modes and `mounted`; gate
preference-dependent markup on `mounted` during SSR. Next App Router layouts
place the wrapper in `body` and use `suppressHydrationWarning` on `html` because
pre-hydration scripts update its attributes.

Hook/context/event-owning published entrypoints are client boundaries. Compose
compound static members such as `Dialog.Trigger` inside an app client wrapper;
do not access those members on a client reference from a server page. Callbacks
and render functions belong in client code. Ordinary SSR and RSC are separate
integration contracts.

## Source layout and token ownership

```text
libs/ui/
  src/{atoms,molecules,organisms,templates}/  component modules (flat files)
  src/theme/                               registry, provider, togglers
  src/tokens/                              primitive and semantic layers
  src/tokens/components/{atoms,molecules}/  component reference/derived aliases
  src/tokens/figma/                         generated exports; do not hand-edit
  stories/{atoms,molecules,organisms,templates,pages}/
  .storybook/                              catalog and consumer onboarding
```

Public imports use `@techsio/ui-kit/<category>/<component>`, not these source
paths. Built-in brands come from the registry and generated theme mappings;
there is no library `brands/customer-a` directory. Product-specific composites
and app-only overrides stay in the consuming app.

Token flow is primitive → semantic → component reference → derived utility.
Components use component token classes in `tv()`; stories can use semantic
layout tokens. Keep changes general rather than adding brand-specific component
branches. App-owned CSS loads **after** the kit and overrides the active root
selector or a descendant scope with adequate specificity:

```css
.order-form {
  --font-weight-button: var(--font-weight-bold);
}
```

Do not edit generated Figma CSS or copy all kit variables into app overrides.
See [app token initialization](skills/app-token-initialization/SKILL.md) and
[framework integration](skills/framework-consumer-integration/SKILL.md).

### Component font-weight overrides

Button and LinkButton use `--font-weight-button`, defaulting to
`var(--font-weight-medium)`. Input uses `--font-weight-input` and
`--font-weight-input-placeholder`, both defaulting independently to
`var(--font-weight-normal)`. FormInput and NumericInput inherit the Input
tokens. Changing the input weight does not change the placeholder weight.

Override component tokens in the scope that needs them:

```css
.order-form {
  --font-weight-button: var(--font-weight-bold);
  --font-weight-input: var(--font-weight-medium);
  --font-weight-input-placeholder: var(--font-weight-normal);
}
```

Migration: CSS aliases resolve at their declaration scope. Global overrides
of the referenced primitive at the root still work. A descendant scope that
previously changed only `--font-weight-medium` or `--font-weight-normal` must
now set the corresponding component token there. Other medium/normal text is
unaffected by component token overrides. Explicit input/button weight classes
continue to override the component default.

These aliases are currently code-owned in `_button.css` and `_input.css`.
When Figma exports the aliases, transfer ownership through the export pipeline
and remove the duplicate bridge declarations. Do not edit generated
`tokens/figma/variables.css` by hand.


## Visual regression tests (Playwright + Docker)

To keep screenshots stable across machines, run component tests inside Docker.

1. Run Playwright tests in a consistent Linux environment (builds Storybook static output by default):

```bash
pnpm -C libs/ui test:components
```

1. Update snapshots (inside Docker):

```bash
pnpm -C libs/ui test:components:update
```

Docker image is defined in `docker/development/playwright/Dockerfile`.
These tests are intentionally Docker-only; running them directly on the host is blocked to keep snapshots reproducible.
Make sure Storybook is served at `TEST_BASE_URL` (default `http://127.0.0.1:6006` inside the container).
You can run `pnpm -C libs/ui storybook` on the host and set `TEST_BASE_URL=http://host.docker.internal:6006`,
or let Playwright start its own static server inside Docker from `storybook-static`.
Screenshots must match their baselines byte-for-byte after PNG decoding (Playwright's `toHaveScreenshot` tolerates anti-aliasing differences, so the spec compares decoded RGBA itself). `Math.random` is seeded per story and the clock is fixed.
Prefer local assets in new stories. Existing remote images replay through Playwright's native `routeFromHAR()` from `test/fixtures/visual-assets/assets.har`; attached binaries are committed beside the HAR. Missing URLs or changed resource types fail the test. Snapshot updates keep these files read-only.

When a story needs a new remote asset, record it using Playwright's [HAR recording](https://playwright.dev/docs/mock#recording-a-har-file). Use one recording context with `recordHar: { path: "assets.har", mode: "minimal", content: "attach", urlFilter: "https://images.unsplash.com/**" }`, visit the affected stories, then close the context to save it. Add the required entries and attachments to the existing HAR; preserve unrelated entries and keep one entry per URL (deduplicate repeated captures). Review image changes before updating screenshots.

Run the focused replay contracts with `pnpm -C libs/ui test:visual-assets` after installing Chromium (`pnpm exec playwright install chromium`).

Optional environment overrides:
- `TEST_BASE_URL` (default: `http://127.0.0.1:6006` inside the container)
- `PLAYWRIGHT_STORYBOOK_REBUILD` (default: `1`, rebuilds `storybook-static`; set to `0` to reuse an existing build)
- `VISUAL_STORYBOOK_STATIC_DIR` (absolute path to another Storybook build, e.g. one built from `master`, to test against the committed baselines; skips the rebuild)
- `VISUAL_BRANDS` (default: `base,neo,business,akros`; focused development only)
- `TEST_STORIES` (comma-separated Storybook story ids to run, e.g. `atoms-button--states,molecules-productcard--layout-variants`)
- `PLAYWRIGHT_WORKERS` (override worker count for parallel runs)
- `VISUAL_ASSET_HAR_PATH` (absolute path to an alternative HAR; its directory and attachments mount read-only)
- `PLAYWRIGHT_DOCKER_IMAGE` (default: `new-engine-ui-playwright:<Playwright version>-<Dockerfile hash>`)
- `PLAYWRIGHT_DOCKER_SHM_SIZE` (default: `2g`, improves Playwright stability in Docker)
- `PLAYWRIGHT_DOCKER_IPC` (default: `host`, improves Playwright stability in Docker)
- `PLAYWRIGHT_DOCKER_SEQUENTIAL` (default: `0`, runs projects in parallel; set to `1` to run one project at a time and reduce memory spikes)

Extra arguments are passed to `playwright test`, e.g. `pnpm -C libs/ui test:components -- --project=neo-mobile-dark`.
Tests always run as `linux/amd64`, matching the committed baselines. A full run must cover every story in every visual project; component behavior specs (`test/*.spec.ts`) run once in the `desktop` and `mobile` projects.

### Recommendation for `PLAYWRIGHT_WORKERS` and parallelism

- If `PLAYWRIGHT_WORKERS` is not set, the Docker runner uses 4 workers to bound
    browser memory. Override it depending on your machine or CI runner size.
- The test suite enables `fullyParallel` in Playwright config, so tests can run
    concurrently across files and workers — ensure tests are isolated and use
    unique snapshot names (the visual tests already include `story.id` in the
    screenshot filename, which is good).

Example with parallel workers:

```bash
TEST_BASE_URL=http://127.0.0.1:6006 PLAYWRIGHT_WORKERS=6 pnpm -C libs/ui test:components
```

### Release coverage versus focused development

`pnpm -C libs/ui test:components:release` requires all stories across all 12
visual projects: base/neo light+dark and business/Akros light, desktop+mobile.
It rejects brand overrides, story/project filters and snapshot updates, then
checks unique successful story/project identities. Focused `test:components`
runs remain available but are not release-readiness evidence. Review new or
changed baselines; never update them in the validation gate.

During a shared-browser overhaul, follow the assigned browser rules instead of
starting any local server, build or browser. Use the approved shared `ds-page`
and serial Docker wrapper, never concurrent ad hoc browser launches.

## Publishing and releases

- Build: `pnpm -C libs/ui build` creates the package without release-only validation.
- Package output checks: `pnpm -C libs/ui check:package` builds, runs publint against package structure and exports, and runs AreTheTypesWrong across TypeScript module-resolution modes, verifies emitted client boundaries/compound declarations, and checks CSS generation, SSR and public callback types from a packed installation. CI and the release workflow run this command automatically.
- Exports only, no barrel: import from explicit subpaths (e.g. `@techsio/ui-kit/atoms/button`, `@techsio/ui-kit/templates/accordion`, `@techsio/ui-kit/utils`). The package root is intentionally not exported.
- Automated releases: `libs/ui/release.config.mjs` uses semantic-release (tag format `ui-kit-v<version>`) to publish to npm and create GitHub releases without pushing generated version/changelog commits back to the protected branch. While we are <1.0.0, `BREAKING CHANGE` commits are forced to “minor” bumps to stay in 0.x; remove that release rule when stabilizing for 1.0.0+ to restore SemVer majors.
- Security posture: releases are restricted to GitHub Actions (`GITHUB_ACTIONS` required), npm publishes use trusted publishing through GitHub OIDC (`id-token: write`) and do not require an npm token.
- CI and release share `.github/workflows/ui-quality.yml`: both TypeScript projects, unit/SSR/tooling tests, token/package checks, full Docker component visuals, and enforced six-theme accessibility. Publication depends on successful validation of the exact checked-out SHA. Manual `force_release` changes affected detection only; it cannot bypass quality checks.
- Local semantic-release (including `--dry-run`) is intentionally unsupported. Use `pnpm -C libs/ui typecheck`, `test`, and `check:package` locally; never set `GITHUB_ACTIONS=true` to impersonate CI.
- Commit format: follow Conventional Commits (`feat:`, `fix:`, `chore:`, `BREAKING CHANGE:`) so semantic-release can infer the correct version bump.
- Required CI secrets: none for npm publishing; npm trusted publishing must be configured on npmjs.com for this repository and workflow path.
