---
name: storybook-authoring
description: >
  Use when creating or editing Storybook CSF3 stories for @techsio/ui-kit in
  libs/ui, including Playground stories, argTypes controls, VariantContainer
  and VariantGroup matrices, fn() handlers, token-based story layout classes,
  and UI-kit components instead of native HTML.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
sources:
  - "libs/ui/AGENTS.md"
  - "libs/ui/.storybook/main.ts"
  - "libs/ui/.storybook/preview.ts"
  - "libs/ui/stories/atoms/button.stories.tsx"
  - "libs/ui/stories/molecules/dialog.stories.tsx"
  - "libs/ui/stories/molecules/tree-view.stories.tsx"
  - "libs/ui/local/storybook-practice.md"
  - "libs/ui/local/storybook-migration.md"
---

# @techsio/ui-kit Storybook Authoring

Use this for `libs/ui/stories/**/*.stories.tsx`.

## Setup

Minimum story shape:

```tsx
import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"

const meta: Meta<typeof Button> = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "warning", "danger"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "primary",
    disabled: false,
    children: "Button",
    onClick: fn(),
  },
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj<typeof Button>

export const Playground: Story = {
  render: (args) => <Button {...args} />,
}
```

Storybook files may use the required default export.

## Core Patterns

### Add stories in local order

```text
Playground
Variants
Sizes
States
Component-specific stories
```

Include a section only when the component supports it.

### Use select controls for enum-like props

```tsx
argTypes: {
  theme: {
    control: "select",
    options: ["solid", "light", "outlined", "borderless", "unstyled"],
  },
}
```

Controls should cover visible behavior. Avoid controls for `ref`, internal ids,
or callbacks with no visible effect.

### Use UI-kit components in examples

```tsx
<VariantGroup title="Disabled states">
  <Button disabled>Disabled</Button>
  <Button theme="outlined" disabled>Outlined</Button>
</VariantGroup>
```

Do not demonstrate native primitives when the UI kit has a component.

### Use tokens for story layout

```tsx
export const Playground: Story = {
  render: (args) => (
    <div className="w-md p-200">
      <Button {...args} />
    </div>
  ),
}
```

Story layout may use semantic/layout/spacing tokens. Avoid hardcoded palette or
spacing utilities.

## Common Mistakes

### HIGH Native HTML and hardcoded Tailwind

Wrong:

```tsx
export const Example: Story = {
  render: () => (
    <button className="rounded bg-blue-500 px-4 py-2 text-white">
      Save
    </button>
  ),
}
```

Correct:

```tsx
export const Default: Story = {
  render: () => <Button>Save</Button>,
}
```

Stories are consumer-facing documentation; they should teach UI-kit usage and
the token system.

Source: libs/ui/AGENTS.md

### HIGH Missing Playground controls

Wrong:

```tsx
export const Default: Story = {
  render: () => <Button variant="primary">Button</Button>,
}
```

Correct:

```tsx
export const Playground: Story = {
  args: { variant: "primary", children: "Button" },
  render: (args) => <Button {...args} />,
}
```

Every component should have an interactive Playground where visible props are
driven through Controls.

Source: libs/ui/stories/atoms/button.stories.tsx

### MEDIUM Unclear story names

Wrong:

```tsx
export const Example: Story = {}
export const Demo: Story = {}
```

Correct:

```tsx
export const Default: Story = {}
export const WithIcon: Story = {}
export const Disabled: Story = {}
export const Error: Story = {}
```

Names should describe the exact state or variation the story demonstrates.

Source: libs/ui/AGENTS.md

### MEDIUM Controls for non-visual internals

Wrong:

```tsx
argTypes: {
  id: { control: "text" },
  ref: { control: "object" },
}
```

Correct:

```tsx
argTypes: {
  variant: { control: "select", options: ["primary", "danger"] },
  disabled: { control: "boolean" },
}
```

Controls should help inspect appearance or behavior, not internal wiring.

Source: libs/ui/AGENTS.md

## Validation Commands

```sh
bunx biome check --write libs/ui/stories/atoms/button.stories.tsx
bunx nx run ui:build
pnpm --dir libs/ui build:storybook
pnpm --dir libs/ui storybook:a11y
```

