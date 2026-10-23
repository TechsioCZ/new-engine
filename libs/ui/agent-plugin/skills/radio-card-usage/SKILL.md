---
name: radio-card-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit RadioCard for
  prominent single-choice cards with Zag.js radio behavior, label, item,
  hidden input, control, text, description, addon, indicator, and status text.
metadata:
  component_version: "1.1.4"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "https://zagjs.com/components/react/radio-group"
  contributor_sources: "libs/ui/src/molecules/radio-card.tsx libs/ui/src/tokens/components/molecules/_radio-card.css libs/ui/stories/molecules/radio-card.stories.tsx libs/ui/src/molecules/radio-card.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit RadioCard Usage

Use RadioCard for prominent exclusive choices with title, description, or addon
content. Use RadioGroup for simple text options.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `RadioCard`.

**Use it when**

- 2–4 exclusive choices that need a description, price or icon: shipping method, plan, payment method.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Simple short text options | RadioGroup |
| Many options | Select |
| Several can be chosen | FormCheckbox group |

**Do**

- Put the decisive information first (name, price, delivery time) and align prices at the end.
- Preselect the recommended/cheapest option when a default is safe; say why in the description.
- Keep all cards the same structure and height.

**Don't**

- Put links or buttons inside a card — the card is the control.

**Copy and states**

- Title is the option name; description one line; price formatted with the app locale (`Free` for zero).

## Setup

```tsx
<RadioCard name="shipping" defaultValue="standard" variant="outline">
  <RadioCard.Label>Shipping method</RadioCard.Label>
  <RadioCard.Item value="standard">
    <RadioCard.ItemHiddenInput />
    <RadioCard.ItemControl>
      <RadioCard.ItemContent>
        <RadioCard.ItemText>Standard</RadioCard.ItemText>
        <RadioCard.ItemDescription>3-5 business days</RadioCard.ItemDescription>
      </RadioCard.ItemContent>
      <RadioCard.ItemIndicator />
    </RadioCard.ItemControl>
  </RadioCard.Item>
</RadioCard>
```

Supported props:

```text
variant: outline | subtle | solid
size: sm | md | lg
itemOrientation: horizontal | vertical
align: start | center | end
justify: start | center | end | between
validateStatus: default | error | success | warning
orientation, value/defaultValue, disabled, required, onValueChange
```

## Core Patterns

### Native ownership and changing choices

Controlled proposals leave all native radios synchronized with the accepted
value, including rejected pointer/Space/arrow changes and external clearing.
Reset follows the actual native input's `form` owner, including external owners
and explicit ownership overriding an ancestor. Uncontrolled reset restores the
initial `defaultValue` (or no selection); canceled resets do nothing. Controlled
parents keep ownership; reset silently re-syncs their current value.

When a focused option disappears or becomes disabled, focus moves to the next
enabled survivor, then the previous survivor. This never changes the saved
selection or steals focus from another control during background updates. If no
enabled choices remain, the named radiogroup receives focus; retain its Label
and provide an explanation of the empty/unavailable state.


### Associated feedback and read-only groups

Pass `readOnly` to preserve focus, full-contrast values and form submission while
blocking pointer, Space and arrow-key selection. Disabled takes priority.
Use `ItemDescription` for option detail and `StatusText` for field feedback:
mounted parts receive unique IDs, register their descriptions and merge them
with caller `aria-describedby` on every input. Error messages additionally set
`aria-invalid` and `aria-errormessage`. Rich card text stays exposed to assistive
technology; `ItemControl` is not an aria-hidden decoration. Keep the visible
`ItemIndicator` so checked state never relies on a pale surface alone.
Validation always keeps its status icon. Canonical sizes are `sm`, `md`, `lg`.


### Use for rich options

Plans, delivery methods, payment methods, and selectable cards belong here.

### Keep item hidden input

Each item should include `RadioCard.ItemHiddenInput` for form behavior.

### Use StatusText part for field status

Use `RadioCard.StatusText` instead of external paragraphs for validation.

## Focus refs and cancellation-safe native forms

The root `ref` is a container ref. Focus an option with
`RadioCard.ItemHiddenInput ref?: Ref<HTMLInputElement>` — despite the part's
name, this is the native focusable radio, not a `type="hidden"` submission
proxy. Its `onFocus`, `onBlur` and keyboard observers compose with machine
handlers; consumer cancellation is respected. Keep `RadioCard.ItemHiddenInput`
inside every item and preserve the normal radio tab/arrow-key pattern.

```tsx
import { useRef, useState } from "react"
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card"

function DeliveryChoice() {
  const firstOption = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState<string | null>("standard")
  return <RadioCard name="delivery" value={value} onValueChange={setValue}>
    <RadioCard.Label>Delivery</RadioCard.Label>
    <RadioCard.Item value="standard">
      <RadioCard.ItemHiddenInput ref={firstOption} />
      <RadioCard.ItemControl>
        <RadioCard.ItemContent>
          <RadioCard.ItemText>Standard delivery</RadioCard.ItemText>
        </RadioCard.ItemContent>
        <RadioCard.ItemIndicator />
      </RadioCard.ItemControl>
    </RadioCard.Item>
  </RadioCard>
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

### HIGH Selectable div cards

Wrong:

```tsx
<div onClick={() => setPlan("pro")} className="border p-4" />
```

Correct:

```tsx
<RadioCard.Item value="pro"><RadioCard.ItemHiddenInput /></RadioCard.Item>
```

Source: libs/ui/src/molecules/radio-card.tsx

### HIGH Missing hidden input

Wrong:

```tsx
<RadioCard.Item value="pro"><RadioCard.ItemText>Pro</RadioCard.ItemText></RadioCard.Item>
```

Correct:

```tsx
<RadioCard.Item value="pro"><RadioCard.ItemHiddenInput /><RadioCard.ItemControl /></RadioCard.Item>
```

Source: https://zagjs.com/components/react/radio-group

### HIGH Inline selected styling

Wrong:

```tsx
<RadioCard.Item className="border-primary bg-primary/10" value="pro" />
```

Correct:

```tsx
<RadioCard variant="subtle"><RadioCard.Item value="pro" /></RadioCard>
```

Source: libs/ui/src/tokens/components/molecules/_radio-card.css

## State consistency

Checked outline hover states promote descriptions and addon text to the full-contrast foreground paired with the hover surface. Solid addons use the same on-primary text pairing as the option title rather than an independent indicator foreground.

## Validation Commands

```sh
rg -U -P -n "onClick=.*set.*(Plan|Method)|<RadioCard\\.Item(?![\\s\\S]{0,300}<RadioCard\\.ItemHiddenInput)" apps
rg -n "<RadioCard[^>]*variant=\"(primary|outlined)\"|<RadioCard[^>]*className=.*(border-|bg-|p-)" apps
rg -n "<RadioCard[^>]*validateStatus=\"(danger|invalid)\"" apps
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
