---
name: pagination-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Pagination for
  link-based paginated navigation with Zag.js pagination, getPageUrl,
  LinkButton, NextLink adapters, compact mode, variants, and sizes.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/pagination.tsx"
  - "libs/ui/src/tokens/components/molecules/_pagination.css"
  - "libs/ui/stories/molecules/pagination.stories.tsx"
  - "libs/ui/src/molecules/figma/pagination.figma.tsx"
  - "https://zagjs.com/components/react/pagination"
---

# @techsio/ui-kit Pagination Usage

Use Pagination for page-based navigation. Do not use it for infinite scroll or
stepper/wizard progress.

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
