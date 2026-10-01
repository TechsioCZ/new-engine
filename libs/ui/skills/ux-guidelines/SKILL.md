---
name: ux-guidelines
description: >
  Use when designing, building or reviewing any screen with @techsio/ui-kit —
  the house UX/UI rules shared by every component: UX writing (button labels,
  save/edit/delete copy, toast and error messages), date and number formatting,
  numeric alignment in tables, disabled/read-only/loading/empty states, where
  CRUD actions and feedback appear (top-right vs bottom-right, toast placement),
  and which component to pick instead of another.
metadata:
  type: "composition"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
sources:
  - "libs/ui/stories/pages/crud-workflow.stories.tsx"
  - "libs/ui/stories/pages/cms-record-editor.stories.tsx"
  - "libs/ui/stories/pages/cms-content-list.stories.tsx"
  - "libs/ui/stories/pages/settings.stories.tsx"
  - "libs/ui/stories/pages/system-states.stories.tsx"
  - "libs/ui/stories/pages/layouts.stories.tsx"
  - "libs/ui/stories/pages/checkout.stories.tsx"
  - "libs/ui/src/molecules/toast.tsx"
  - "libs/ui/src/molecules/dialog.tsx"
  - "libs/ui/src/organisms/table.tsx"
  - "libs/ui/src/organisms/data-table.tsx"
  - "libs/ui/skills/_artifacts/consumer_app_usage_rules.md"
---

# @techsio/ui-kit UX Guidelines

One rulebook for how screens built from the kit *behave and speak*. Component
skills (`<component>-usage`) say how to call a component; this skill says how
the result must feel, read and behave, so every page in every app is
consistent. Each component skill ends with a **UX/UI guidelines** section that
applies these rules to that component.

Load order: `component-usage-ux` (pick the component) → this skill (the house
rules) → `<component>-usage` (the API).

## The rules in one screen

| Topic | Rule | Details |
| --- | --- | --- |
| Voice | Sentence case everywhere; say what happens, in the user's words | [ux-writing](references/ux-writing.md) |
| Buttons | Verb (+ object): `Create product`, `Save changes`, `Delete product` — never `OK`, `Yes`, `Submit` | [ux-writing](references/ux-writing.md#button-labels) |
| Messages | `<Object> <past participle>`: `Product created`; errors say what, why, and how to fix | [ux-writing](references/ux-writing.md#messages) |
| Dates | `Intl.DateTimeFormat` with the app locale; never raw ISO; relative only for recent activity | [formatting](references/formatting.md#dates-and-times) |
| Numbers | `Intl.NumberFormat` with the app locale and ISO currency; never `"$" + n.toFixed(2)` | [formatting](references/formatting.md#numbers-currency-units) |
| Alignment | Numbers, money, quantities, percentages right-aligned (`align: "end"` / `numeric`) with tabular figures; text and dates start-aligned | [formatting](references/formatting.md#alignment-in-tables) |
| Missing value | `—` (em dash), not `0`, `N/A`, `null` or an empty cell | [formatting](references/formatting.md#empty-and-missing-values) |
| Disabled | Only when the reason is visible or obvious; otherwise keep enabled and validate | [states](references/states.md#disabled) |
| Read-only | Values the user may see but not change are read-only, not disabled | [states](references/states.md#read-only-vs-disabled) |
| Loading | `isLoading` + `loadingText` on the button that started it; Skeleton for content | [states](references/states.md#loading) |
| Page actions | Top-right of the page header; one primary per page | [feedback-and-actions](references/feedback-and-actions.md#where-actions-live) |
| Form actions | Bottom-right, after the last field: `[Cancel] [Primary]`, primary last | [feedback-and-actions](references/feedback-and-actions.md#where-actions-live) |
| Destructive | Separate from Save; confirm irreversible deletes in an `alertdialog` that names the record | [feedback-and-actions](references/feedback-and-actions.md#destructive-actions) |
| Toasts | One `<Toaster />`, bottom-end (bottom-right), for confirming mutations; never for validation | [feedback-and-actions](references/feedback-and-actions.md#choosing-the-feedback-surface) |
| Component choice | Pick by intent; each component has a documented "use instead" | [component-selection](references/component-selection.md) |

## Core Patterns

### CRUD loop (reference: Pages/Patterns/CRUD workflow)

```text
List page     PageHeader: title + [New <object>] top-right (the only primary)
              DataTable: search, filters, sort, pagination; row click = read
Create        Dialog placement="right" (drawer), form, footer [Cancel] [Create <object>]
Read          row click → right drawer with DetailList + [Edit <object>]
Update light  DataTable inline edit (one or two fields) → toast "<Object> saved"
Update full   same drawer as create, title "Edit <object>", footer [Cancel] [Save changes]
Delete        row action (danger, last) → alertdialog "Delete this <object>?"
              naming the record, footer [Cancel] [Delete <object>] → toast "<Object> deleted"
```

### Full-page record editor (reference: Pages/CMS/Record editor)

```text
PageHeader actions top-right: [Back to list] [Preview] [Save]   (header stays visible)
Save disabled until the form is dirty; Badge "Unsaved changes" next to the status
Leaving while dirty → alertdialog [Keep editing] [Discard changes]
Delete lives in a separate section at the bottom — never beside Save
Save → toast "<Object> saved" (user stays on the page)
```

### Feedback surface decision

```text
Field is invalid                     → inline error on the field (validateStatus + helpText)
Submit failed with 2+ errors         → FormErrorSummary above the form + inline errors
Mutation succeeded, UI barely changes → Toast success
Background job finished / failed     → Toast (error toast with a retry action stays until dismissed)
Irreversible or high-cost decision   → Dialog role="alertdialog"
Persistent page condition            → inline StatusText / SectionCard at the top of the content
Whole page missing/forbidden/broken  → system state screen (keep the navigation)
```

## Common Mistakes

### HIGH Toast as validation

Wrong:

```tsx
toaster.create({ type: "error", title: "Please fill in the SKU" })
```

Correct:

```tsx
<FormInput id="sku" label="SKU" validateStatus="error" helpText="Enter the SKU, e.g. TS-0042." />
```

Toasts disappear and are announced out of context; field problems belong on the
field (and in `FormErrorSummary` after a failed submit).

### HIGH Hand-formatted numbers and dates

Wrong:

```tsx
<Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
<DetailList items={[{ term: "Last updated", value: "2026-09-04" }]} />
```

Correct:

```tsx
const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" })
const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium" })

<Table.Cell numeric className="tabular-nums">{money.format(product.price)}</Table.Cell>
<DetailList items={[{ term: "Last updated", value: day.format(new Date(product.updatedAt)) }]} />
```

### HIGH Vague action labels

Wrong: `OK`, `Yes`, `Confirm`, `Submit`, `Delete` in a dialog that deletes a product.

Correct: `Create product`, `Save changes`, `Delete product`, `Discard changes`.

The button must still make sense when read alone by a screen reader.

### MEDIUM Disabled with no reason

Wrong: a greyed-out `Publish` button and nothing that says why.

Correct: keep `Publish` enabled and show what is missing on click, or keep it
disabled *and* show the reason next to it ("Add a title to publish").

### MEDIUM Two primaries or scattered actions

Wrong: `New product` top-right *and* a primary `Import` beside it; `Save` in the
header of one settings section and at the bottom of the next.

Correct: one primary per surface; page actions top-right, form actions
bottom-right, consistently across the app.

## Review checklist

```text
[ ] Every action label is a verb (+ object) in sentence case
[ ] Every mutation has visible feedback (UI change or toast); no toast for validation
[ ] Dates/numbers go through Intl with the app locale; no raw ISO, no toFixed + symbol
[ ] Numeric columns are end-aligned with tabular figures; header aligned with its column
[ ] Missing values render as —
[ ] Disabled controls have a visible or obvious reason; read-only data is read-only
[ ] Page primary action top-right; form actions bottom-right, primary last
[ ] Destructive actions are separated and confirmed (or undoable)
[ ] Empty, loading and error states exist for every list and async section
[ ] The component matches its intent (see component-selection)
```
