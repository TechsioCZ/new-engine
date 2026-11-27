<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Atoms/NavigationProgress → UX guidelines. -->

# NavigationProgress: UX guidelines

Use NavigationProgress at the top of the page area while the router loads the next page.

## When to use

- A route change waits for data or code, and the current page stays on screen until it arrives.

## Use something else when

| Need | Use instead |
| --- | --- |
| A known layout is loading | Skeleton |
| A button action is running | Button `isLoading` |
| Progress of a multi-step flow | Steps |

## Anatomy

- A 2 px track across the top of its positioned container.
- A 40% wide segment in the primary colour that slides across the track.

## Behaviour

**Do:**

- Mount it only while the navigation is pending.
- Put it in the positioned page area, not inside a scrolling list.

**Don't:**

- Show it for background refetches that do not change the page.
- Render more than one at a time.

The bar stays invisible for the first 150 ms after it mounts, so a fast navigation shows nothing. It never blocks pointer input.

## Content and copy

- `aria-label` names the pending work in the app's language ("Loading page"). The kit ships no default text.

## Accessibility

- It is a `progressbar` with `aria-busy="true"` and no value, which announces indeterminate progress.
- Under `prefers-reduced-motion: reduce` the segment stops and fills the whole track.
