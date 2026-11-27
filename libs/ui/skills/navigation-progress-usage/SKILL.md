---
name: navigation-progress-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit NavigationProgress for
  an indeterminate bar at the top of the page area while a route navigation is pending.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
resources:
  - "references/ux.md"
sources:
  - "libs/ui/src/atoms/navigation-progress.tsx"
  - "libs/ui/src/tokens/components/atoms/_navigation-progress.css"
  - "libs/ui/stories/atoms/navigation-progress.stories.tsx"
---

# @techsio/ui-kit NavigationProgress Usage

Use NavigationProgress at the top of the page area while the router loads the next page.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `NavigationProgress`.

**Use it when**

- A route change waits for data or code, and the current page stays on screen until it arrives.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A known layout is loading | Skeleton |
| A button action is running | Button `isLoading` |
| Progress of a multi-step flow | Steps |

**Do**

- Mount it only while the navigation is pending; it shows nothing for the first 150 ms.
- Put it in the positioned page area (`relative`), not inside a scrolling list.

**Don't**

- Show it for background refetches that do not change the page.
- Render more than one at a time.

**Copy and states**

- `aria-label` names the pending work in the app's language (`Loading page`, `Načítání stránky`). The kit ships no default text.

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Atoms/NavigationProgress → UX guidelines*.

## Setup

```tsx
import { NavigationProgress } from "@techsio/ui-kit/atoms/navigation-progress"

<main className="relative">
  {isNavigating && <NavigationProgress aria-label="Loading page" />}
  <Outlet />
</main>
```

Props (from `src/atoms/navigation-progress.tsx`):

```text
aria-label: string
className?: string
ref?: Ref<HTMLDivElement>
```

It renders `role="progressbar"` with `aria-busy="true"`. Recolor it with
`--color-navigation-progress` (defaults to `--color-primary`).

## Common Mistakes

### HIGH Hand-made progress bar

Wrong:

```tsx
<div className="absolute top-0 h-0.5 w-full animate-pulse bg-primary" />
```

Correct:

```tsx
<NavigationProgress aria-label="Loading page" />
```

Source: libs/ui/src/atoms/navigation-progress.tsx

### MEDIUM Always mounted

Wrong:

```tsx
<NavigationProgress aria-label="Loading page" className={isNavigating ? "" : "hidden"} />
```

Correct:

```tsx
{isNavigating && <NavigationProgress aria-label="Loading page" />}
```

The 150 ms reveal delay starts when the bar mounts.
