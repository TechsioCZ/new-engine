---
name: detail-list-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit DetailList for
  a read-only label and value grid for detail pages and panels.
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
  - "libs/ui/src/molecules/detail-list.tsx"
  - "libs/ui/src/tokens/components/molecules/_detail-list.css"
  - "libs/ui/stories/molecules/detail-list.stories.tsx"
---

# @techsio/ui-kit DetailList Usage

Use DetailList to show a record's fields read-only: one column on phones, two from `sm`.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `DetailList`.

**Use it when**

- The facts of a record on its detail page or in a quick-view panel.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Editable fields | form controls (FormInput, Select, …) |
| Rows of records | Table or DataTable |
| A single key number | StatCard |

**Do**

- Use the field's label as the user knows it.
- Show a dash or "Not set" for a missing value rather than hiding the row when the field matters.

**Don't**

- Put form controls in a DetailList.
- Use it for tabular data with several records.

**Copy and states**

- Labels in sentence case, no colon.

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/DetailList → UX guidelines*.

## Setup

```tsx
import { DetailList } from "@techsio/ui-kit/molecules/detail-list"

<DetailList
  items={[
    { label: "Customer", value: "Northwind Traders" },
    { label: "Order date", value: "27 Nov 2026" },
  ]}
/>
```

Props (from `src/molecules/detail-list.tsx`):

```text
items: { id?: string; label: ReactNode; value: ReactNode }[]
...HTMLAttributes<HTMLDListElement>, ref
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Hand-built definition grid

Wrong:

```tsx
<div className="grid grid-cols-2"><span>Customer</span><span>Northwind</span></div>
```

Correct:

```tsx
<DetailList items={[{ label: "Customer", value: "Northwind" }]} />
```

Source: libs/ui/src/molecules/detail-list.tsx
