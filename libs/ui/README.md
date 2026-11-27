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

## Language

The kit has no fixed language. Every word a component shows or announces on
its own (placeholders, close buttons, table and filter labels, screen-reader
announcements, validation messages, zag-js labels) comes from one typed
catalog, `UiMessages`. English ships as `enUiMessages` and applies without
setup. An app in another language passes its catalog once, near the root:

```tsx
import type { UiMessagesInput } from '@techsio/ui-kit/messages/ui-messages'
import { UiMessagesProvider } from '@techsio/ui-kit/messages/ui-messages-provider'

const csMessages: UiMessagesInput = {
  locale: 'cs-CZ',
  label: { required: '(povinné)' },
  dialog: { close: 'Zavřít dialog' },
  dataTable: { selectRowLabel: (row) => `Vybrat ${row}` },
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <UiMessagesProvider messages={csMessages}>{children}</UiMessagesProvider>
}
```

- Any subset works; missing entries fall back to an outer provider, then English.
- Messages that include a value are functions, so a translation orders words its own way.
- `locale` is the default formatting locale for components that format numbers or dates.
- A text passed as a prop to one component (`placeholder`, `closeLabel`, `translations`, …) still wins over the catalog.
- Define the catalog as a module constant or memoize it, so components do not re-render.
- Server components stay server components; only the parts that read the catalog run on the client.
- One provider covers every copy of the kit on the page, so module-federation remotes that bundle their own copy follow the host's provider.

## Brands and modes

A brand is data: a `BrandDefinition` with a `key` (the `data-theme` value), a
`label`, the `modes` it supports (`["light"]`, `["dark"]` or both) and the
`tokens` that differ from the shared foundation. Mode uses one `.light` or
`.dark` class. The attribute-less `:root` / `@theme` layer is the foundation
the brands override, not a brand.

The kit's Figma brands ship compiled into its CSS and as the same data from
`@techsio/ui-kit/theme/built-in-brands`:

| Brand | Export | Modes |
| --- | --- | --- |
| business (default) | `businessBrand` | light only |
| akros | `akrosBrand` | light only |
| n1 | `n1Brand` | light only |

For a fixed kit brand, use `<html lang="en" class="light" data-theme="akros">`.
No provider is needed for a fixed theme. Do not create an Akros dark scheme.

### Runtime brands

`AppThemeProvider` takes the brands an app offers as data and renders each
active brand's stylesheet (`brandStylesheet`), so a brand that arrives or
changes at runtime applies without a reload or a kit release. Parse untrusted
data with `defineBrand` (safety and shape) and validate it where it is
stored with `validateBrand` from `@techsio/ui-kit/theme/brand-validator`
(tokens the foundation has, WCAG AA on the checked pairs). The validator
carries the whole token foundation, so keep it out of browser bundles.

```tsx
'use client'

import type { PropsWithChildren } from 'react'
import { businessBrand } from '@techsio/ui-kit/theme/built-in-brands'
import type { BrandDefinition } from '@techsio/ui-kit/theme/theme-config'
import { AppThemeProvider } from '@techsio/ui-kit/theme/theme-provider'

// The app decides the brand (for example per tenant); nothing is persisted.
export function ThemeSetup({ brand, children }: PropsWithChildren<{ brand: BrandDefinition }>) {
  return (
    <AppThemeProvider brand={brand.key} brands={[brand]} defaultMode="system">
      {children}
    </AppThemeProvider>
  )
}

// A user-selectable brand list instead: the pick is persisted. oceanBrand is a
// BrandDefinition loaded from the app's store.
export function SelectableThemes({ children }: PropsWithChildren) {
  return (
    <AppThemeProvider brands={[businessBrand, oceanBrand]} defaultBrand="business">
      {children}
    </AppThemeProvider>
  )
}
```

The mode switch offers only the modes the brand supports: a single-mode brand
is locked to its mode, a brand with both offers light, dark and system.
`useAppTheme()` exposes the brand in effect, the brands, the allowed modes and
`mounted`; gate preference-dependent markup on `mounted` during SSR. The
provider includes `BrandThemeScript`, a pre-paint bootstrap; render it again
early in `head`/`body` when content precedes the provider. Next App Router
layouts place the wrapper in `body` and use `suppressHydrationWarning` on
`html` because pre-hydration scripts update its attributes.

### A brand for one subtree

`BrandScope` applies a brand to its children only, for screens that bring
their own brand or alter the inherited one. Without a scope a subtree inherits
the app's brand.

```tsx
import { extendBrand } from '@techsio/ui-kit/theme/theme-config'
import { BrandScope, useAppTheme } from '@techsio/ui-kit/theme/theme-provider'

function ReportScreens({ children }: PropsWithChildren) {
  const { brand } = useAppTheme()
  const reports = extendBrand(brand, {
    key: `${brand.key}-reports`,
    tokens: { '--color-bg-primary-base': 'var(--color-primary-700)' },
  })
  return <BrandScope brand={reports}>{children}</BrandScope>
}
```

Hook/context/event-owning published entrypoints are client boundaries. Compose
compound static members such as `Dialog.Trigger` inside an app client wrapper;
do not access those members on a client reference from a server page. Callbacks
and render functions belong in client code. Ordinary SSR and RSC are separate
integration contracts.

## Global size and appearance (`UIProvider`)

Every component uses the same names for the same visual axis:

| Prop | Meaning | Values |
|---|---|---|
| `appearance` | fill style | `solid` · `subtle` · `outline` · `ghost` (no frame — buttons, Pagination, Accordion, Textarea) · `plain` (Breadcrumb, VerticalNavigation) (+ component extras such as Tabs `line`) |
| `severity` | color intent | `primary` · `secondary` · `tertiary` · `neutral` · `info` · `success` · `warning` · `danger` · `discount` |
| `validateStatus` | validation state | `default` · `error` · `success` · `warning` |
| `size` | size scale | the component's subset of `xs`…`2xl`, plus `full` / `current` |

`UIProvider` sets `size` and `appearance` for every component below it:

```tsx
'use client'

import { UIProvider } from '@techsio/ui-kit/theme/ui-provider'

export function Defaults({ children }: PropsWithChildren) {
  return (
    <UIProvider
      size="md"
      appearance="solid"
      components={{ Button: { appearance: 'outline' }, Dialog: { size: 'lg' } }}
    >
      {children}
    </UIProvider>
  )
}
```

A value resolves as: the prop on the component → `components[Name]` of the
nearest provider → its global value → the same for each parent provider →
the component's own default. A value a component does not support (for example
`appearance="ghost"` on Tabs) is skipped, so the component keeps its default.
Providers nest, so a dense toolbar can wrap its controls in `size="sm"`.

`AppThemeProvider` already renders a root `UIProvider` with the
`size="md" appearance="solid"` baseline, merged with the active brand's
optional `defaults` from its `BrandDefinition`. Without any provider every
component keeps its own default.

### Migrating from `variant` / `theme` / `tone`

```sh
# from a new-engine checkout, against the app's sources
node <new-engine>/libs/ui/codemods/unified-style-props/index.mjs <app>/src           # rewrite
node <new-engine>/libs/ui/codemods/unified-style-props/index.mjs <app>/src --dry     # preview
```

The codemod rewrites JSX props and literal values (`theme="outlined"` →
`appearance="outline"`, Button `variant` → `severity`, Badge
`variant="outline"` → `appearance="outline" severity="neutral"`, Input
`variant` → `validateStatus`, …) and lists what it could not map: computed values, and object literals (it
never rewrites data such as stored settings).
Run your type checker afterwards; story `args`, wrapper components and
data objects are reported there. The full table is in
`codemods/unified-style-props/README.md`.
## Shape utilities (`corner-shape`, `border-shape`)

The kit ships utilities for two CSS properties that Tailwind and Figma do not
cover yet. They are defined in `src/tokens/_shape.css` and included in the
`tokens` and `tokens-with-tailwind` entry points (through `_tokens-base`). The
`tokens/*` export maps to single files, so if you compose individual token
files instead, import `@techsio/ui-kit/tokens/_shape` explicitly to get the
`corner-*` and `border-shape-*` utilities.

`corner-*` sets [`corner-shape`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape)
(Chrome/Edge 139+, Safari 27.3+). It reshapes the curve that `rounded-*`
draws; background, border, outline and shadow follow it:

```tsx
<div className="rounded-2xl corner-squircle" />          {/* all corners */}
<div className="rounded-lg corner-t-bevel" />            {/* top side */}
<div className="rounded-lg corner-ss-scoop" />           {/* logical start-start corner */}
<div className="rounded-2xl corner-[superellipse(1.5)]" /> {/* any curve */}
<div className="rounded-lg corner-base" />               {/* brand default */}
```

- Values: `round` (default), `squircle`, `bevel`, `scoop`, `notch`, `square`,
  or `superellipse(<number>)`. Sides `t r b l s e`, corners `tl tr br bl ss se es ee`.
- Without a radius it does nothing. Browsers without support ignore it and keep
  the rounded corner. Use `supports-[corner-shape:squircle]:` for another fallback.
- `corner-base` reads `--corner-shape-base`; override it per brand to reshape
  everything that uses it (see the `app-token-overrides` skill).
- Figma's corner smoothing (~60%, iOS) is the nearest look: use `corner-squircle`.

`border-shape-*` sets [`border-shape`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-shape)
and is **experimental** (Chrome 147+ only): `border-shape-[circle(50%)]` strokes
the border along a shape, `border-shape-[<outer>_<inner>]` fills between two,
`border-shape-none` resets it. It ignores `rounded-*`/`corner-*`, renders solid
and changes the hit area; other browsers show the normal rectangular border.

Live examples: Storybook → Overview → Shape.

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

Pick the smallest run that answers your question:

| Question | Command | Typical time |
| --- | --- | --- |
| Did my change move any pixels? | `pnpm -C libs/ui test:visual:local` (no Docker) | seconds to a few minutes |
| Do the stories my change can affect still match the committed baselines? | `VISUAL_CHANGED_SINCE=origin/master pnpm -C libs/ui test:components` | seconds to minutes |
| Does everything match? | `pnpm -C libs/ui test:components` | about 15 minutes of screenshots plus about 10 of behavior specs on an Apple Silicon Mac |
| The change is intended and I need new baselines | let CI fail, then `pnpm -C libs/ui baselines:pull --pr <number>` | one CI run |

CI renders the committed Linux baselines on `linux/amd64` and is the authority for them.
Each screenshot story owns a fresh browser context and gets one capture attempt.
Neither full nor changed CI accepts a successful fallback after a failed first render.

To keep screenshots stable across machines, comparisons against the committed baselines run inside Docker.

1. Run Playwright tests in a consistent Linux environment (builds Storybook static output by default):

```bash
pnpm -C libs/ui test:components
```

1. Update snapshots (inside Docker):

```bash
pnpm -C libs/ui test:components:update
```

Docker image is defined in `docker/development/playwright/Dockerfile`.
Comparisons against the committed baselines are Docker-only; running them directly on the host is blocked to keep snapshots reproducible. The local check below runs on the host with its own baselines.
Make sure Storybook is served at `TEST_BASE_URL` (default `http://127.0.0.1:6006` inside the container).
You can run `pnpm -C libs/ui storybook` on the host and set `TEST_BASE_URL=http://host.docker.internal:6006`,
or let Playwright start its own static server inside Docker from `storybook-static`.
Screenshots must match their baselines byte-for-byte after PNG decoding (Playwright's `toHaveScreenshot` tolerates anti-aliasing differences, so the spec compares decoded RGBA itself). `Math.random` is seeded per story and the clock is fixed.
Prefer local assets in new stories. Existing remote images replay through Playwright's native `routeFromHAR()` from `test/fixtures/visual-assets/assets.har`; attached binaries are committed beside the HAR. Missing URLs or changed resource types fail the test. Snapshot updates keep these files read-only.

When a story needs a new remote asset, record it using Playwright's [HAR recording](https://playwright.dev/docs/mock#recording-a-har-file). Use one recording context with `recordHar: { path: "assets.har", mode: "minimal", content: "attach", urlFilter: "https://images.unsplash.com/**" }`, visit the affected stories, then close the context to save it. Add the required entries and attachments to the existing HAR; preserve unrelated entries and keep one entry per URL (deduplicate repeated captures). Review image changes before updating screenshots.

Run the focused replay contracts with `pnpm -C libs/ui test:visual-assets` after installing Chromium (`pnpm exec playwright install chromium`).

Optional environment overrides:
- `TEST_BASE_URL` (default: `http://127.0.0.1:6006` inside the container)
- `PLAYWRIGHT_STORYBOOK_REBUILD` (unset: rebuilds `storybook-static` only when its inputs changed; `1`: always rebuild; `0`: never rebuild)
- `VISUAL_STORYBOOK_STATIC_DIR` (absolute path to another Storybook build, e.g. one built from `master`, to test against the committed baselines; skips the rebuild)
- `VISUAL_BRANDS` (default: `business,akros,n1`; focused development only)
- `TEST_STORIES` (comma-separated Storybook story ids to run, e.g. `atoms-button--states,molecules-productcard--layout-variants`)
- `PLAYWRIGHT_WORKERS` (override worker count for parallel runs)
- `VISUAL_ASSET_HAR_PATH` (absolute path to an alternative HAR; its directory and attachments mount read-only)
- `PLAYWRIGHT_DOCKER_IMAGE` (default: `new-engine-ui-playwright:<Playwright version>-<Dockerfile hash>`, with an `-arm64` suffix on `linux/arm64`; CI caches the image by Dockerfile content, and a cache miss builds it from that Dockerfile)
- `PLAYWRIGHT_DOCKER_PLATFORM` (`linux/amd64` or `linux/arm64`; default: host architecture, or `linux/amd64` for snapshot updates and release runs)
- `PLAYWRIGHT_DOCKER_SHM_SIZE` (default: `2g`, improves Playwright stability in Docker)
- `PLAYWRIGHT_DOCKER_IPC` (default: `host`, improves Playwright stability in Docker)
- `PLAYWRIGHT_DOCKER_SEQUENTIAL` (default: `0`, runs projects in parallel; set to `1` to run one project at a time and reduce memory spikes)
- `VISUAL_CHANGED_SINCE` (git ref, e.g. `origin/master`; screenshots only the stories affected since the merge-base, or a full run when everything could be affected)
- `VISUAL_CHANGED_FILES` (comma-separated repo-relative paths; used instead of git, and wins over `VISUAL_CHANGED_SINCE` when both are set)
- `VISUAL_CHANGED_FILES_FROM` (path to a file with one repo-relative path per line, or NUL-separated as `git diff -z` writes it so names with newlines survive; the same as `VISUAL_CHANGED_FILES` for long lists, and it wins over both other changed-mode variables)
- `VISUAL_CHANGED_DRY_RUN` (set to `1` with a changed-mode variable to print the selection as JSON; needs an existing Storybook build and never builds or starts Docker)
- `PLAYWRIGHT_SHARD` (`index/total`, e.g. `2/8`; runs one shard of a non-release run, and a shard with no matching tests passes; cannot be combined with `PLAYWRIGHT_RELEASE_SHARD` or `VISUAL_RELEASE_READINESS=1`)
- `VISUAL_CHANGED_BEHAVIOR` (set to `1` to also run the component behavior specs in a changed subset; by default only screenshot specs run)

Example: `VISUAL_CHANGED_SINCE=origin/master pnpm -C libs/ui test:components`

Extra arguments are passed to `playwright test`, e.g. `VISUAL_BRANDS=n1 pnpm -C libs/ui test:components -- --project=n1-mobile-light`.
Comparison runs use the host architecture (native arm64 on Apple Silicon); snapshot updates and release runs always use `linux/amd64`, matching the committed baselines. `PLAYWRIGHT_DOCKER_PLATFORM` overrides both. CI checks every story on all three desktop brands and on business mobile WebKit; brand-locked stories retain their own brand on mobile. Brand × phone cross-products are not gated. Set `VISUAL_BRANDS=akros` or `VISUAL_BRANDS=n1` to diagnose those phone projects locally. A full run must cover every story in every declared visual project; component behavior specs (`test/*.spec.ts`) run once in the `desktop` and `mobile` projects.

### Known differences on `linux/arm64`

Comparison runs on Apple Silicon use `linux/arm64`. One result differs there from `linux/amd64` in every run and is not a regression: screenshot `molecules-colorselect--keyboard-navigation` on `akros-mobile-light` and `n1-mobile-light`, where 17 pixels differ against an allowance of 16.

Behavior specs can be timing-sensitive on a fast machine, and the cause is usually in the spec. `date-picker.behavior.spec.ts` ("portals the popup, moves through the grid, and restores trigger focus") used to fail now and then because it pressed outside the popup before Zag listened for outside presses. It now waits with `outsideDismissalReady` from `test/outside-dismissal.mjs` and passed 30 of 30 repeats on `mobile`; without the wait it failed 1 of 30. Call that helper before any `page.mouse` press outside an open popup.

A second test in that spec ("wraps 12-hour time independently of the day period and cancels keyboard edits") lost its first key press now and then. Opening the calendar by its trigger moves focus to the active day in the frame that first paints the popup. A person cannot act before that paint, but `focus`, `press` and `fill` do not wait for a frame: the test focused the hour field first, focus then moved to the day, and the `End` key went to the day grid. The spec now waits with `popupKeyboardReady` until a day in the popup has focus; `openCalendarStory` calls it for every test that opens a calendar. Without the wait the test failed 2 of 60 repeats on `mobile`; with it it passed 60 of 60 and then 400 of 400, and the whole spec passed 30 of 30 repeats. A `click` waits for two stable frames on its own, so only a `focus`, `press` or `fill` sent right after opening needs the helper.

A failing native run prints the commands that confirm failed screenshot stories and behavior specs on `linux/amd64`.

### Workers

The Docker runner uses 4 workers unless `PLAYWRIGHT_WORKERS` is set. On a 6-CPU Docker VM 4 workers already use every core: 6 workers finished a 372-test sample in 153 seconds against 158. Raise the number only when the VM has more CPUs. The local check without Docker picks its own count from the host's cores.

### Local visual check without Docker

`pnpm -C libs/ui test:visual:local` answers one question: did your working tree change any pixels compared with the commit you branched from?

- It runs on your machine and needs no Docker.
- It renders the base commit (`--base`, default `origin/master`, compared at `git merge-base HEAD <ref>`) and compares your changes against it.
- The first run per base commit builds that commit in a temporary worktree (about 2 minutes) and needs 3 GiB free in the temporary directory.
- Base screenshots are captured with the test harness of the branch you run from. They are cached per machine, per base commit and per harness: the build is shared, the baselines are not. The harness is `libs/ui/test/visual.spec.ts`, `libs/ui/test/visual-*.mjs` (not `*.test.mjs`), `libs/ui/playwright.config.mts` and `libs/ui/test/fixtures/visual-assets`. When any of them changes, the baselines are re-captured automatically on the next run.
- Cache layout: `<root>/builds/<base>/storybook-static` and `<root>/<platform>-<arch>-pw<version>-h<harness>/<base>/snapshots`. The `<root>` is `VISUAL_LOCAL_CACHE` when set, otherwise `~/Library/Caches/techsio-ui-visual` on macOS and `~/.cache/techsio-ui-visual` elsewhere. Caches from the older single-key layout are ignored and can be deleted.
- Each cache level keeps the 5 most recently used base commits. `VISUAL_LOCAL_CACHE_KEEP=<n>` changes that number. Directories used by the current run and directories locked by a live run are never removed.
- Runs for the same base commit wait for each other, so a commit is never built or captured twice at once. A failed or killed capture leaves no baselines behind.
- Nothing is written to the committed Linux baselines. CI stays the authority for those.
- Flags: `--base <ref>`, `--all` (every visual story), `--stories <id,id>` (skips change detection), `--workers <n>`, `--rebuild-base` (rebuilds the base build and clears the baselines for the current harness), `--dry-run` (prints the plan as JSON and builds nothing).
- Install the browsers once: `pnpm -C libs/ui exec playwright install chromium webkit`. If a run reports missing browsers, it says so in the summary.
- The HTML report goes to `libs/ui/.visual-local/report`. Open it with `pnpm -C libs/ui exec playwright show-report .visual-local/report`.

### Baselines from CI

When a PR's screenshot check fails because the visual change is intended, run `pnpm -C libs/ui baselines:pull --pr <number>` to copy the screenshots that CI rendered into the committed Linux baselines. Use a run id or `--branch <name>` instead of `--pr` to pick another run, and `--out <dir>` or `--dry-run` to write elsewhere or only list the files. Review the images and `git status`, then commit.

### Release coverage versus focused development

`pnpm -C libs/ui test:components:release` requires all stories across all 6
visual projects: business/Akros/N1 light, desktop+mobile.
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
- CI's `main` job checks the workspace on Node 24 and the UI package's types, unit/SSR/tooling tests, tokens and package output on Node 26, then imports that packed build on Node 24. It scans business-light and half of akros-light for accessibility while its other checks run at lower CPU priority; browser bundle 2 scans n1-light and the other half, as `libs/ui/scripts/ci-ui-plan.mjs` declares. `.github/workflows/ui-quality.yml` runs the Docker component checks. Results append once per story; summaries are generated after the workers finish. Each runner's accessibility scans all run even when one fails, so a push reports every theme's violations. On a master push, CI dispatches the release when `main` ends, and again after `quality-gate` when a re-run turns CI green; it publishes the build its own `check:package` validated, and only after successful master push CI for the exact SHA. A release whose commit is no longer the tip of master ends without publishing, because the newer commit's release covers it. Manual `force_release` changes affected detection only; it cannot bypass the exact-SHA CI gate.
- Local semantic-release (including `--dry-run`) is intentionally unsupported. Use `pnpm -C libs/ui typecheck`, `test`, and `check:package` locally; never set `GITHUB_ACTIONS=true` to impersonate CI.
- Commit format: follow Conventional Commits (`feat:`, `fix:`, `chore:`, `BREAKING CHANGE:`) so semantic-release can infer the correct version bump.
- Required CI secrets: none for npm publishing; npm trusted publishing must be configured on npmjs.com for this repository and workflow path.
