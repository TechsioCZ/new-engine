---
name: radio-group-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit RadioGroup for
  simple exclusive choices with Zag.js radio behavior, label, item group,
  hidden inputs, controls, text, descriptions, validation status, variants, and
  sizes.
metadata:
  component_version: "1.1.4"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "https://zagjs.com/components/react/radio-group"
  contributor_sources: "libs/ui/src/molecules/radio-group.tsx libs/ui/src/tokens/components/molecules/_radio-group.css libs/ui/stories/molecules/radio-group.stories.tsx libs/ui/src/molecules/radio-group.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit RadioGroup Usage

Use RadioGroup for simple exclusive text choices. Use RadioCard for larger
card-like choices.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `RadioGroup`.

**Use it when**

- One choice from 2–5 short options that should all be visible.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Options need descriptions/prices | RadioCard |
| 6+ options | Select |
| On/off | Switch or FormCheckbox |
| Several choices | FormCheckbox group |

**Do**

- Order options logically (frequency, size, alphabet) and consistently across the app.
- Preselect a safe default when one exists.
- Group label (legend) states the question (`Delivery speed`).

**Don't**

- Use a single radio button.
- Trigger actions on change without a submit, unless it's a view switch.

**Copy and states**

- Option labels parallel in grammar and short; no trailing punctuation.

## Setup

```tsx
<RadioGroup name="payment" defaultValue="card">
  <RadioGroup.Label>Payment method</RadioGroup.Label>
  <RadioGroup.ItemGroup>
    <RadioGroup.Item value="card">
      <RadioGroup.ItemHiddenInput />
      <RadioGroup.ItemControl />
      <RadioGroup.ItemContent><RadioGroup.ItemText>Card</RadioGroup.ItemText></RadioGroup.ItemContent>
    </RadioGroup.Item>
  </RadioGroup.ItemGroup>
</RadioGroup>
```

Supported props:

```text
variant: outline | subtle | solid
size: sm | md | lg
orientation: horizontal | vertical
validateStatus: default | error | success | warning
value/defaultValue, disabled, required, readOnly, onValueChange
```

## Core Patterns

### Native ownership and changing choices

Controlled proposals leave every native radio synchronized with the accepted
value, including rejected pointer/Space/arrow interaction and external clearing.
`form` is honored for reset ownership, including an external form or an explicit
owner overriding an ancestor form. Uncontrolled reset restores the initial
`defaultValue` (or no selection); canceled resets do nothing. Controlled reset
silently preserves and re-syncs the latest parent value.

Removing or disabling the focused option moves focus to the next enabled
survivor, or the previous survivor if no next option remains. Background updates
do not steal focus and focus recovery does not change selection. If no enabled
options remain, focus falls back to the named radiogroup; keep its Label mounted
and explain the unavailable/empty choices nearby.


### Associated feedback and read-only groups

Every mounted `ItemDescription` and `StatusText` has a unique ID and registers
with its item or group. Each native input merges these IDs and caller/root
`aria-describedby`; error messages also populate `aria-errormessage` and invalid
state. Multiple messages and conditional unmounts are supported.
`readOnly` keeps native inputs enabled for focus and submission while preventing
pointer, Space and arrow-key selection. Disabled takes priority. Read-only
controls use the shared neutral surface, not disabled styling. Validation status
icons remain present. Solid indicator and border colors use the same on-primary
pairing as solid option text, including the hover surface; do not substitute a
fixed white foreground. Sizes remain `sm`, `md`, `lg` with `md` as default.


### Use item group for options

Keep options inside `RadioGroup.ItemGroup` and each item as a label with
hidden input and control.

### Use descriptions for explanatory text

Use `RadioGroup.ItemDescription`, not loose paragraphs.

### Use value strings

Radio values are strings; map domain IDs to strings consistently.

## Focus refs and cancellation-safe native forms

The root `ref` is a container ref. Focus an option with
`RadioGroup.ItemHiddenInput ref?: Ref<HTMLInputElement>` — despite the part's
name, this is the native focusable radio, not a `type="hidden"` submission
proxy. Its `onFocus`, `onBlur` and keyboard observers compose with machine
handlers; consumer cancellation is respected. Keep `RadioGroup.ItemHiddenInput`
inside every item and preserve the normal radio tab/arrow-key pattern.

```tsx
import { useRef, useState } from "react"
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"

function DeliveryChoice() {
  const firstOption = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState<string | null>("standard")
  return <RadioGroup name="delivery" value={value} onValueChange={setValue}>
    <RadioGroup.Label>Delivery</RadioGroup.Label>
    <RadioGroup.ItemGroup>
      <RadioGroup.Item value="standard">
        <RadioGroup.ItemHiddenInput ref={firstOption} />
        <RadioGroup.ItemControl />
        <RadioGroup.ItemText>Standard delivery</RadioGroup.ItemText>
      </RadioGroup.Item>
    </RadioGroup.ItemGroup>
  </RadioGroup>
}
```

Native owner reset follows the radio's actual form association, including
external-owner ID changes/reassociation. Canceling native or React `onReset`
preserves the current choice; accepted uncontrolled reset restores the initial
default after cancellation has settled. Controlled `value` stays parent-owned,
including when a proposal is rejected; app-owned reset explicitly updates that
state. Reset does not synthesize input activation or move focus. Nested native
disabled fieldsets and their first-legend exceptions apply; read-only remains
focusable and submitted. Object refs and React 19 callback cleanup are supported.
If an actively focused option is removed/disabled, recovery chooses a surviving
enabled focus target without changing selection; updates never steal outside
focus.

## Common Mistakes

### HIGH Native radio inputs

Wrong:

```tsx
<input type="radio" name="payment" value="card" />
```

Correct:

```tsx
<RadioGroup.Item value="card"><RadioGroup.ItemHiddenInput /></RadioGroup.Item>
```

Source: libs/ui/src/molecules/radio-group.tsx

### HIGH Missing item group

Wrong:

```tsx
<RadioGroup><RadioGroup.Item value="a" /></RadioGroup>
```

Correct:

```tsx
<RadioGroup><RadioGroup.ItemGroup><RadioGroup.Item value="a" /></RadioGroup.ItemGroup></RadioGroup>
```

Source: libs/ui/src/molecules/radio-group.tsx

### HIGH Inline checked styling

Wrong:

```tsx
<RadioGroup.Item className="text-primary border-primary" value="a" />
```

Correct:

```tsx
<RadioGroup variant="solid"><RadioGroup.Item value="a" /></RadioGroup>
```

Source: libs/ui/src/tokens/components/molecules/_radio-group.css

## Validation Commands

```sh
rg -U -P -n "<input[^>]*type=\"radio\"|<RadioGroup\\.Item(?![\\s\\S]{0,300}<RadioGroup\\.ItemHiddenInput)" apps
rg -n "<RadioGroup[^>]*variant=\"(primary|outlined)\"|<RadioGroup[^>]*className=.*(border-|bg-|text-)" apps
rg -n "<RadioGroup[^>]*validateStatus=\"(danger|invalid)\"" apps
```

## Silent native form reset

Native reset calls no value-change callbacks and dispatches no native `input`
or `change` events, in controlled or uncontrolled usage. Uncontrolled controls
silently restore their default; controlled controls
keep the latest parent value and re-sync visible/accessibility/native submission
state to it. Handle the form's `onReset` to intentionally change parent state.
Canceled resets leave every channel unchanged. Reset does not synthesize events
or move focus; the first real user edit afterward emits exactly one normal
callback, including when the same value was entered before reset.
