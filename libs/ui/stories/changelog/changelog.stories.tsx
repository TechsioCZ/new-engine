import type { Meta, StoryObj } from '@storybook/react'

/**
 * Per-component changelog for `@techsio/ui-kit`, rendered in Storybook.
 *
 * Each `### <Component> vX.Y.Z` heading below is the source of truth the pre-commit gate
 * (`scripts/check-skill-sync.mjs`) checks: a component's `@componentVersion` and its usage skill's
 * `component_version` must both match an entry here. Keep the three in lock-step.
 *
 * Add newest entries under "Unreleased"; a release moves them under a dated version heading.
 */
const CHANGELOG = `
## @techsio/ui-kit — Unreleased

### Button v0.3.2
- Introduced per-component versioning: the component now carries \`@componentVersion\` + \`@skill\`,
  paired 1:1 with the \`button-usage\` skill's \`component_version\` and this changelog entry,
  enforced by the \`check-skill-sync\` pre-commit gate.

### Accordion v1.0.0
- Opted into per-component versioning; paired 1:1 with the accordion-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### ActionIcon v1.0.0
- Opted into per-component versioning; paired 1:1 with the action-icon-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Badge v1.0.0
- Opted into per-component versioning; paired 1:1 with the badge-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Breadcrumb v1.0.0
- Opted into per-component versioning; paired 1:1 with the breadcrumb-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Carousel v1.0.0
- Opted into per-component versioning; paired 1:1 with the carousel-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Checkbox v1.0.0
- Opted into per-component versioning; paired 1:1 with the checkbox-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### ColorSelect v1.0.0
- Opted into per-component versioning; paired 1:1 with the color-select-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Combobox v1.0.0
- Opted into per-component versioning; paired 1:1 with the combobox-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Dialog v1.0.0
- Opted into per-component versioning; paired 1:1 with the dialog-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Footer v1.0.0
- Opted into per-component versioning; paired 1:1 with the footer-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormCheckbox v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-checkbox-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormNumericInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-numeric-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormTextarea v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-textarea-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Gallery v1.0.0
- Opted into per-component versioning; paired 1:1 with the gallery-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Header v1.0.0
- Opted into per-component versioning; paired 1:1 with the header-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Icon v1.0.0
- Opted into per-component versioning; paired 1:1 with the icon-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Image v1.0.0
- Opted into per-component versioning; paired 1:1 with the image-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Input v1.0.0
- Opted into per-component versioning; paired 1:1 with the input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Label v1.0.0
- Opted into per-component versioning; paired 1:1 with the label-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Link v1.0.0
- Opted into per-component versioning; paired 1:1 with the link-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### LinkButton v1.0.0
- Opted into per-component versioning; paired 1:1 with the link-button-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Menu v1.0.0
- Opted into per-component versioning; paired 1:1 with the menu-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### NumericInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the numeric-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Pagination v1.0.0
- Opted into per-component versioning; paired 1:1 with the pagination-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### PhoneInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the phone-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Popover v1.0.0
- Opted into per-component versioning; paired 1:1 with the popover-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### ProductCard v1.0.0
- Opted into per-component versioning; paired 1:1 with the product-card-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### RadioCard v1.0.0
- Opted into per-component versioning; paired 1:1 with the radio-card-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### RadioGroup v1.0.0
- Opted into per-component versioning; paired 1:1 with the radio-group-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Rating v1.0.0
- Opted into per-component versioning; paired 1:1 with the rating-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### SearchForm v1.0.0
- Opted into per-component versioning; paired 1:1 with the search-form-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Select v1.0.0
- Opted into per-component versioning; paired 1:1 with the select-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Skeleton v1.0.0
- Opted into per-component versioning; paired 1:1 with the skeleton-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Slider v1.0.0
- Opted into per-component versioning; paired 1:1 with the slider-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### StatusText v1.0.0
- Opted into per-component versioning; paired 1:1 with the status-text-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Steps v1.0.0
- Opted into per-component versioning; paired 1:1 with the steps-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Switch v1.0.0
- Opted into per-component versioning; paired 1:1 with the switch-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Table v1.0.0
- Opted into per-component versioning; paired 1:1 with the table-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Tabs v1.0.0
- Opted into per-component versioning; paired 1:1 with the tabs-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Textarea v1.0.0
- Opted into per-component versioning; paired 1:1 with the textarea-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Toast v1.0.0
- Opted into per-component versioning; paired 1:1 with the toast-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Tooltip v1.0.0
- Opted into per-component versioning; paired 1:1 with the tooltip-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### TreeView v1.0.0
- Opted into per-component versioning; paired 1:1 with the tree-view-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.
`.trim()

function Changelog() {
  return (
    <div className="min-h-screen bg-base p-400">
      <div className="mx-auto max-w-container rounded-2xl bg-surface p-300 shadow-2">
        <pre className="whitespace-pre-wrap font-sans text-fg-primary text-sm leading-relaxed">
          {CHANGELOG}
        </pre>
      </div>
    </div>
  )
}

const meta: Meta<typeof Changelog> = {
  title: 'Guide/Changelog',
  component: Changelog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta

export const Playground: StoryObj<typeof Changelog> = {}
