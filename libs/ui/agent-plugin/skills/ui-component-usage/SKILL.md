---
name: ui-component-usage
description: >
  Router for using @techsio/ui-kit components in apps (correct imports, variants, tokens,
  UX rules). Use when implementing app UI with the kit rather than developing the kit
  itself. Invoke explicitly with $ui-component-usage <component>.
metadata:
  plugin: "techsio-ui-kit-ai"
  library: "@techsio/ui-kit"
---

# ui-kit component usage (router)

Per-component usage guides are bundled with this plugin as `<component>-usage` skills —
this skill only routes there. Do NOT guess props: read the matching guide, then the
component types from the installed package.

## Order of reading

1. `component-usage-ux` skill — which component fits the intent (always first)
2. `ux-guidelines` skill — house UX/UI rules: UX writing, dates/numbers, numeric
   alignment, disabled/loading/empty states, where CRUD actions and toasts go,
   component selection
3. `<component>-usage` skill — the specific component; its **UX/UI guidelines**
   section says when to use it, what to use instead, do/don't and copy
4. If styling/overrides are needed: `app-token-overrides` skill
   (app-side tokens; never patch the kit from an app)

## Available per-component guides

accordion, action-icon, badge, breadcrumb, button, carousel, cascade-select, chart,
checkbox, color-select, combobox, command, data-table, date-picker, dialog, drawer,
facet-filter-panel, file-upload, footer, form-checkbox, form-error-summary, form-input,
form-numeric-input, form-textarea, gallery, header, hotkeys, icon, image, input, label,
link, link-button, menu, numeric-input, pagination, phone-input, popover, product-card,
radio-card, radio-group, rating, search-form, search-suggestions, select, sidebar, skeleton,
slider, status-text, steps, switch, table, tabs, textarea, toast, tooltip, tour, tree-view,
vertical-navigation
— each bundled as the `<name>-usage` skill.

## Import pattern

```ts
import { Button } from "@techsio/ui-kit/atoms/button"
import { Select } from "@techsio/ui-kit/molecules/select"
```

Token CSS in the app entry: `@techsio/ui-kit/tokens` (tokens only) or
`@techsio/ui-kit/tokens-with-tailwind`; app bootstrap per the bundled
`app-token-initialization` skill.

## Rules of thumb

- Never rebuild something the kit ships — a data grid is the kit `DataTable`/`Table`, not `<table>`.
- Before shipping a screen, run the `ux-guidelines` review checklist.
- Style via kit variants + semantic token classes; no arbitrary Tailwind values.
- New requirement the kit can't express → file it as kit work ($ui-new-component), don't
  fork the component into the app.
