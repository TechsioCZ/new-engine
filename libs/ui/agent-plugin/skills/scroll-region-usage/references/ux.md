<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Atoms/ScrollRegion → UX guidelines. -->

# ScrollRegion: UX guidelines

Use ScrollRegion around content that can overflow its column, such as a static table or a document preview.

## When to use

- A wide static Table on a narrow screen.
- A long preview inside a fixed-height area.

## Use something else when

| Need | Use instead |
| --- | --- |
| A DataTable | DataTable; it has its own scroll region |
| A dialog body | Dialog; its body already scrolls |

## Anatomy

- A `section` with an accessible name that scrolls on overflow.

## Behaviour

**Do:**

- Name the region after its content (`Monthly revenue by region`).

**Don't:**

- Nest scroll regions.
- Use it for the whole page.

## Content and copy

- `label` names the content, not the mechanism ("Revenue table", not "Scroll area").

## Accessibility

- While its content overflows it is focusable (`tabIndex=0`) so it can be scrolled with the keyboard (WCAG 2.1.1); content that fits adds no tab stop.
