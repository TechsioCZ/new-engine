---
name: steps-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Steps for
  multi-step workflows using the Zag.js steps machine, compound list/items,
  panels, progress, navigation triggers, linear flow, controlled step, and
  variants.
metadata:
  component_version: "1.2.3"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/steps.tsx"
  - "libs/ui/src/tokens/components/molecules/_steps.css"
  - "libs/ui/stories/molecules/steps.stories.tsx"
  - "libs/ui/src/molecules/steps.figma.ts"
  - "https://zagjs.com/components/react/steps"
---

# @techsio/ui-kit Steps Usage

On narrow surfaces, horizontal triggers put their number above the label and
wrap longer copy. Vertical workflows stack the step list above panels and
navigation; their supplementary progress track becomes horizontal. From the
small breakpoint upward, vertical workflows use the side-by-side layout.

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
const stages = [
  { title: "Cart", content: "Check products and quantities." },
  { title: "Delivery", content: "Confirm the delivery address." },
  { title: "Review", content: "Review the order before confirming." },
]

<Steps count={stages.length} linear>
  <Steps.List aria-label="Checkout stages">
    {stages.map((stage, index) => (
      <Steps.Item key={stage.title} index={index}>
        <Steps.Trigger><Steps.Indicator /><Steps.Title>{stage.title}</Steps.Title></Steps.Trigger>
        <Steps.Separator />
      </Steps.Item>
    ))}
  </Steps.List>
  <Steps.Panels>
    {stages.map((stage, index) => (
      <Steps.Content key={stage.title} index={index}><h3>{stage.title}</h3>{stage.content}</Steps.Content>
    ))}
    <Steps.CompletedContent aria-label="Order confirmed"><h3>Order confirmed</h3>Your order is ready for processing.</Steps.CompletedContent>
  </Steps.Panels>
  <Steps.Navigation><Steps.PrevTrigger>Back</Steps.PrevTrigger><Steps.NextTrigger>Confirm and continue</Steps.NextTrigger></Steps.Navigation>
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

Use the complete Setup example: count, headers, panels and completion are derived together.

Source: libs/ui/src/molecules/steps.tsx

### HIGH Missing count

Wrong:

```tsx
<Steps><Steps.Item index={0} /></Steps>
```

Correct:

```tsx
{/* Partial root-prop illustration; include the complete anatomy from Setup. */}
<Steps count={stages.length}>{/* Setup list, panels and navigation */}</Steps>
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

## Validation belongs to the owning workflow

Steps exposes progression, not form validation. Keep editable values in local or
form state; prevent the NextTrigger default action when validation fails and
gate controlled onStepChange too, so direct step activation cannot bypass it.
Render StatusText feedback with stable IDs connected to the input through
aria-describedby and, for errors, aria-invalid and aria-errormessage. Clear the
error as values are corrected and allow progress after successful validation.
Use sm/md/lg (default md) consistently across stages and navigation actions.

Steps sizing controls the progress indicator and stage typography, not a boxed
form-field height. Embedded Back/Continue buttons follow shared control heights.

## Validation, semantics and dynamic workflows

All Zag machine options are forwarded by both `Steps` and `useSteps`, including
`isStepValid(index)`, `isStepSkippable(index)`, `onStepInvalid(details)`, `ids`,
and `getRootNode`. Invalid forward transitions call `onStepInvalid` without
advancing. A skippable current step bypasses validation; Next still advances one
index, not over arbitrary steps. Back remains available. `linear` disables all
header jumps so progression happens through Back/Next and validation.

Steps is an ordered list of ordinary navigation buttons with `aria-current="step"`,
not a tab widget. Use Tab/Shift+Tab and Enter/Space for available step jumps; use
Tabs instead for peer views. Content uses labelled regions, and CompletedContent
is a separate named region (`Workflow complete` by default). Supply `aria-label`
or `aria-labelledby` for localized completion copy. Successful Back/Next button
activation focuses the new content region after rendering, including completion.
Cancel via the trigger's `onClick.preventDefault()` when the application owns
focus; initial and unrelated externally controlled updates never move it.

`useSteps` reconciles count changes without remounting surviving fields. An
unfinished out-of-range step recovers to the last remaining step; an intentional
completion follows the completion sentinel `count`. With zero steps the flow is
complete and progress is 100%. Invalid controlled steps render a safe effective
state and request correction once per invalid input/count pair via onStepChange;
the owner must update its step and related data. Progress remains finite in
0–100. Completion/reset through the API remains supported.

Connectors align to indicator centers at every size and variant, and labels
wrap between words only.

Render workflow panels as named groups instead of anonymous regions.

Reliably focus the accepted navigation panel without stealing focus after rejected or unrelated updates.
