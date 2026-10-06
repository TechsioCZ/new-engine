---
name: pagination-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Pagination for
  link-based paginated navigation with Zag.js pagination, getPageUrl,
  LinkButton, NextLink adapters, compact mode, variants, and sizes.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux framework-consumer-integration app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/pagination.tsx libs/ui/src/tokens/components/molecules/_pagination.css libs/ui/stories/molecules/pagination.stories.tsx libs/ui/src/molecules/pagination.figma.ts https://zagjs.com/components/react/pagination"
---

# @techsio/ui-kit Pagination Usage

Use Pagination for page-based navigation. Do not use it for infinite scroll or
stepper/wizard progress.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Pagination`.

**Use it when**

- Page-based navigation of results where position matters and users return to it (admin tables, search results).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Steps of a task | Steps |
| Browsing a small set | show everything |
| Feed-like storefront browsing | a `Load more` Button with the count (`Show 24 more`) |

**Do**

- Show the range and total (`1–25 of 1,204`), formatted with the app locale.
- Keep page size options few (25, 50, 100) and remember the choice.
- Reflect the page in the URL so back/refresh keep the position.
- Scroll to the top of the list (not the page) after changing pages.

**Don't**

- Reset filters when the page changes.
- Show page numbers beyond what fits — use ellipsis.

**Copy and states**

- Controls `Previous page`, `Next page`, `Page 3`; current page marked with `aria-current`.

## Setup

```tsx
import NextLink from "next/link"
import { Pagination, createPaginationGetPageUrl } from "@techsio/ui-kit/molecules/pagination"

<Pagination
  count={120}
  pageSize={12}
  linkAs={NextLink}
  getPageUrl={createPaginationGetPageUrl({ pathname: "/products", searchParams })}
/>
```

Supported props:

```text
count: total items, pageSize, page/defaultPage
getPageUrl: required link generator
linkAs, linkProps for framework adapters
variant: filled | outlined | minimal
size: sm | md | lg
compact, compactLabel, showPrevNext, siblingCount, boundaryCount
onChange/onPageChange, translations
```

## Core Patterns

### Always provide getPageUrl

Pagination is link-based. Use `createPaginationGetPageUrl` to preserve query
params and avoid ad hoc URL string handling.

### Use NextLink in Next apps

Pass `linkAs={NextLink}`; do not wrap individual page links.

### Use compact for constrained surfaces

Compact mode displays text instead of every page item.

## Common Mistakes

### HIGH Button-only pagination

Wrong:

```tsx
<button onClick={() => setPage(page + 1)}>Next</button>
```

Correct:

```tsx
<Pagination count={count} pageSize={pageSize} getPageUrl={getPageUrl} />
```

Source: libs/ui/src/molecules/pagination.tsx

### HIGH Missing getPageUrl

Wrong:

```tsx
<Pagination count={100} />
```

Correct:

```tsx
<Pagination count={100} getPageUrl={getPageUrl} />
```

Source: libs/ui/src/molecules/pagination.tsx

### HIGH Inline page button styling

Wrong:

```tsx
<Pagination className="flex gap-2 text-sm" />
```

Correct:

```tsx
<Pagination variant="outlined" size="sm" />
```

Source: libs/ui/src/tokens/components/molecules/_pagination.css

## Validation Commands

```sh
rg -P -n "<Pagination(?![^>]*getPageUrl=)|<Pagination[^>]*className=.*(gap-|text-|bg-|border-|p-)" apps
rg -P -n "<Pagination(?![^>]*linkAs=\\{?NextLink)" apps
rg -n "createPaginationGetPageUrl|compactLabel|siblingCount|boundaryCount" apps
```
