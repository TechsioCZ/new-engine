---
name: steps-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Steps for
  multi-step workflows using the Zag.js steps machine, compound list/items,
  panels, progress, navigation triggers, linear flow, controlled step, and
  variants.
metadata:
  component_version: "1.0.2"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/steps.tsx libs/ui/src/tokens/components/molecules/_steps.css libs/ui/stories/molecules/steps.stories.tsx libs/ui/src/molecules/steps.figma.ts https://zagjs.com/components/react/steps"
---

# @techsio/ui-kit Steps Usage

Use Steps for wizard/progress workflows. Use Tabs for peer panels, and
Pagination for page navigation.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Steps`.

**Use it when**

- Ordered multi-step tasks: checkout, onboarding, import wizards (3–7 steps).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Peer views | Tabs |
| Pages of results | Pagination |
| Explaining existing UI | Tour |

**Do**

- Name steps by what the user does (`Shipping`, `Payment`, `Review`).
- Actions at the bottom: `Back` at the start, `Continue` at the end; the last step's button is the real action (`Place order`).
- Validate each step before continuing; let users go back without losing data.
- Allow jumping back to completed steps.

**Don't**

- Use more than ~7 steps; split the flow.
- Hide the global navigation choice to leave (focused layouts still offer a way out).

**Copy and states**

- Step titles are nouns; progress text `Step 2 of 4` for assistive tech.

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
rg -P -n "setStep|<Steps\\b(?!\\.)(?![^>]*count=)|<Steps\\.Progress[^>]*className=.*(bg-|h-|rounded-)" apps
rg -P -n "<Steps\\.Item(?![^>]*index=)|<Steps\\.Content(?![^>]*index=)" apps
rg -n "<Steps\\.NextTrigger|<Steps\\.PrevTrigger|linear" apps
```
