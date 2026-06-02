---
name: steps-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Steps for
  multi-step workflows using the Zag.js steps machine, compound list/items,
  panels, progress, navigation triggers, linear flow, controlled step, and
  variants.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/steps.tsx"
  - "libs/ui/src/tokens/components/molecules/_steps.css"
  - "libs/ui/stories/molecules/steps.stories.tsx"
  - "libs/ui/src/molecules/figma/steps.figma.tsx"
  - "https://zagjs.com/components/react/steps"
---

# @techsio/ui-kit Steps Usage

Use Steps for wizard/progress workflows. Use Tabs for peer panels, and
Pagination for page navigation.

## Setup

```tsx
<Steps count={3} linear>
  <Steps.List>
    <Steps.Item index={0}><Steps.Trigger><Steps.Indicator /><Steps.Title>Cart</Steps.Title></Steps.Trigger><Steps.Separator /></Steps.Item>
  </Steps.List>
  <Steps.Panels><Steps.Content index={0}>Cart content</Steps.Content></Steps.Panels>
  <Steps.Navigation><Steps.PrevTrigger>Back</Steps.PrevTrigger><Steps.NextTrigger>Next</Steps.NextTrigger></Steps.Navigation>
</Steps>
```

Supported props:

```text
count, step/defaultStep, linear, orientation horizontal | vertical
variant: subtle | solid
size: sm | md | lg
onStepChange, onStepComplete
RootProvider/useSteps for external store
```

## Core Patterns

### Use for ordered workflows

Checkout, onboarding, setup, and import flows fit Steps.

### Keep item indexes aligned

`Steps.Item index` and `Steps.Content index` must match the intended step.

### Use navigation triggers

Use `PrevTrigger` and `NextTrigger` so disabled/completed state comes from the
machine.

## Common Mistakes

### HIGH Custom wizard state

Wrong:

```tsx
{step === 1 && <Panel />}<Button onClick={() => setStep(step + 1)}>Next</Button>
```

Correct:

```tsx
<Steps count={3}><Steps.Panels><Steps.Content index={0} /></Steps.Panels></Steps>
```

Source: libs/ui/src/molecules/steps.tsx

### HIGH Missing count

Wrong:

```tsx
<Steps><Steps.Item index={0} /></Steps>
```

Correct:

```tsx
<Steps count={3}><Steps.Item index={0} /></Steps>
```

Source: https://zagjs.com/components/react/steps

### HIGH Inline progress styling

Wrong:

```tsx
<Steps.Progress className="h-2 bg-gray-200" />
```

Correct:

```tsx
<Steps.Progress />
```

Source: libs/ui/src/tokens/components/molecules/_steps.css

## Validation Commands

```sh
rg -P -n "setStep|<Steps(?![^>]*count=)|<Steps\\.Progress[^>]*className=.*(bg-|h-|rounded-)" apps
rg -P -n "<Steps\\.Item(?![^>]*index=)|<Steps\\.Content(?![^>]*index=)" apps
rg -n "<Steps\\.NextTrigger|<Steps\\.PrevTrigger|linear" apps
```
