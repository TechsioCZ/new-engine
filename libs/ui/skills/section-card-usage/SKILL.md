---
name: section-card-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit SectionCard for
  a titled content block with local actions, the one outlined surface level that never stacks its frame.
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
  - "libs/ui/src/molecules/section-card.tsx"
  - "libs/ui/src/tokens/components/molecules/_section-card.css"
  - "libs/ui/stories/molecules/section-card.stories.tsx"
---

# @techsio/ui-kit SectionCard Usage

Use SectionCard for one titled block of a page. It is the one outlined surface level: inside another SectionCard or a SidePanel it drops its outline and padding.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `SectionCard`.

**Use it when**

- A group of related fields or details on a detail or settings page.
- A block with its own local actions (Edit, Add).
- A Table that draws its own edges (`flush`).

**Use something else when**

| Need | Use instead |
| --- | --- |
| The page title and page actions | PageHeader |
| A tinted tile, note or list item inside a card | an element with the `surface-tile` class |
| A DataTable | DataTable on its own; it has its own frame |

**Do**

- Give every card a title unless it is the only block on the page.
- Use `flush` when the child draws its own edges.
- Nest cards freely; the inner ones lose their frame automatically.

**Don't**

- Wrap a DataTable in a SectionCard.
- Add borders or shadows through className; the surface tokens own them.
- Use SectionCard as a clickable card.

**Copy and states**

- Title: a noun in sentence case (`Billing`, `Latest invoices`).

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/SectionCard → UX guidelines*.

## Setup

```tsx
import { SectionCard } from "@techsio/ui-kit/molecules/section-card"

<SectionCard actions={<Button size="sm">Edit</Button>} title="Billing">
  <DetailList items={billing} />
</SectionCard>
```

Props (from `src/molecules/section-card.tsx`):

```text
title?: ReactNode
description?: ReactNode
actions?: ReactNode
flush?: boolean
...HTMLAttributes<HTMLElement>, ref
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Stacked frames

Wrong:

```tsx
<div className="rounded-lg border p-250"><SectionCard title="Billing">…</SectionCard></div>
```

Correct:

```tsx
<SectionCard title="Customer"><SectionCard title="Billing">…</SectionCard></SectionCard>
```

Source: libs/ui/src/molecules/section-card.tsx
