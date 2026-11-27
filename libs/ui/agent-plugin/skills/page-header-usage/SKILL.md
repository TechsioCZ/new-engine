---
name: page-header-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit PageHeader for
  a page's one header: breadcrumb or back link, the h1 title with status badges, a description and the page actions.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: ""
  contributor_sources: "libs/ui/src/organisms/page-header.tsx libs/ui/src/tokens/components/organisms/_page-header.css libs/ui/stories/organisms/page-header.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit PageHeader Usage

Use PageHeader once per page, at the top of the content column. It owns the page's only `h1`.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `PageHeader`.

**Use it when**

- Every list, detail, settings or dashboard page.
- A record page: the record's name as the title, its status as `meta`, a back link as `breadcrumb`.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A titled block inside the page | SectionCard |
| The heading of a dialog or panel | Dialog / SidePanel `title` |
| Site-wide navigation | Header, Sidebar, VerticalNavigation |

**Do**

- Put the primary page action last in `actions`; secondary actions before it.
- Keep the description to one sentence about what the page is for.
- Use `meta` for status badges of the record the page shows.

**Don't**

- Render more than one PageHeader (or `h1`) per page.
- Put form-local actions (Save) in the header; they belong to the form footer.
- Put filters or tabs in `actions`.

**Copy and states**

- Title: the page or record name in sentence case, no trailing punctuation (`Orders`, `Order 2026-0142`).

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Organisms/PageHeader → UX guidelines*.

## Setup

```tsx
import { PageHeader } from "@techsio/ui-kit/organisms/page-header"
import { BreadcrumbTemplate } from "@techsio/ui-kit/templates/breadcrumb"

<PageHeader
  actions={<Button size="sm">New order</Button>}
  breadcrumb={<BreadcrumbTemplate items={crumbs} size="sm" />}
  description="Every order across your sales channels."
  title="Orders"
/>
```

Props (from `src/organisms/page-header.tsx`):

```text
title: ReactNode (required)
description?: ReactNode
meta?: ReactNode
actions?: ReactNode
breadcrumb?: ReactNode
...HTMLAttributes<HTMLElement>, ref
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Hand-built page header

Wrong:

```tsx
<div className="flex justify-between"><h1 className="text-xl font-semibold">Orders</h1>…</div>
```

Correct:

```tsx
<PageHeader actions={actions} title="Orders" />
```

Source: libs/ui/src/organisms/page-header.tsx
