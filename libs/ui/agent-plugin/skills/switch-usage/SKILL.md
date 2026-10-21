---
name: switch-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Switch for
  boolean settings using Zag.js switch behavior, hidden input, label children,
  checked/defaultChecked, validation status, help text, required, disabled, and
  read-only state.
metadata:
  component_version: "1.2.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "https://zagjs.com/components/react/switch"
  contributor_sources: "libs/ui/src/molecules/switch.tsx libs/ui/src/tokens/components/molecules/_switch.css libs/ui/stories/molecules/switch.stories.tsx libs/ui/src/molecules/switch.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit Switch Usage

Use Switch for immediate boolean settings. Use Checkbox for terms, multi-select
lists, or non-immediate boolean form choices.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Switch`.

**Use it when**

- Settings that take effect immediately (and confirm with a toast): notifications, feature toggles, visibility.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A choice saved with a form's submit | FormCheckbox |
| Agreements and consent | FormCheckbox |
| More than two states | RadioGroup / Select |

**Do**

- Label the setting, not the state (`Email notifications`), and describe the effect in `helpText`.
- Apply on change; on failure revert the switch and show an error toast with `Try again`.
- Keep switches and explicitly-saved fields in separate groups (Settings story rule).

**Don't**

- Put switches in a form that also needs `Save changes` — users can't tell what is already saved.
- Use `On/Off` text inside the label.

**Copy and states**

- Confirmation toast: `Email notifications turned on`.

## Setup

```tsx
<Switch name="marketing" defaultChecked onCheckedChange={setEnabled}>
  Marketing emails
</Switch>
```

Supported props:

```text
checked/defaultChecked, onCheckedChange
name, value, required, disabled, readOnly, dir
validateStatus: default | error | success | warning
helpText, showHelpTextIcon
```

## Core Patterns

### Controlled proposals and native reset

A rejected `onCheckedChange` proposal does not change native submission or
validity. Native reset restores the initial uncontrolled default after the
browser reset action, including imperative `form.reset()` while focused.
Canceled resets do not change state or emit reset proposals. Controlled parents
retain ownership: a reset is a proposal, not permission to overwrite props.
The label shrinks and safely wraps long/localized words without shrinking the
track. Enabled unchecked and invalid thumbs have a contrasting state-aware fill.


### Sizes, semantics and read-only values

Use `size="sm" | "md" | "lg"` (default `md`) to scale the track, label and feedback.
The native input has `role="switch"` and reflects `aria-checked`; `dir="rtl"`
mirrors the thumb travel inside the track. `readOnly` preserves focus and form
submission but prevents pointer and Space changes; disabled takes priority.
`aria-describedby` merges caller IDs with inline guidance. Errors set
`aria-invalid` and `aria-errormessage` on the input. Validation always keeps its
status icon; `showHelpTextIcon` only changes optional neutral-help icons.


### Use for settings

Feature toggles, notification preferences, and visibility toggles fit Switch.

### Use children as label

The component renders Label and hidden input internally.

### Use validateStatus for invalid state

Do not style invalid switch state manually.

## Native input ref and cancellation-safe forms

`ref?: Ref<HTMLInputElement>` targets the focusable native input with
`role="switch"`, not the track/thumb/label. `inputProps` accepts native
focus/blur/key/change observers, input ARIA and external `form`; top-level
`checked`, `defaultChecked`, `disabled`, `readOnly`, `required`, `name`, `value`
and `id` remain component-owned. Do not use `inputProps` to replace the input
type or value ownership. Descriptions merge with help text. Consumer event
handlers run before machine handlers and respect `preventDefault()`.

```tsx
import { useRef, useState } from "react"
import { Switch } from "@techsio/ui-kit/molecules/switch"

function Notifications() {
  const input = useRef<HTMLInputElement>(null)
  const [enabled, setEnabled] = useState(false)
  return <Switch ref={input} name="notifications" checked={enabled}
    onCheckedChange={setEnabled} inputProps={{ form: "preferences" }}>
    Enable notifications
  </Switch>
}
```

Uncontrolled reset restores its initial default only after native/React reset
cancellation has settled. Canceled resets do not change the value or emit a
reset proposal. The actual native input owner is followed through external-form
ID changes and reparenting; listeners/pending work are disposed on unmount.
Controlled `checked` remains parent-owned even when a proposal is rejected;
applications must explicitly update it when they want a reset. Do not reset by
activating the input or moving focus. Native nested-fieldset disabling and
first-legend exceptions apply; read-only is still focusable and submitted.
Object refs and React 19 callback-ref cleanup are supported.

## Common Mistakes

### HIGH Checkbox for setting toggle

Wrong:

```tsx
<Checkbox checked={enabled} /> Enable notifications
```

Correct:

```tsx
<Switch checked={enabled} onCheckedChange={setEnabled}>Enable notifications</Switch>
```

Source: libs/ui/src/molecules/switch.tsx

### HIGH Wrong callback

Wrong:

```tsx
<Switch onChange={(e) => setEnabled(e.target.checked)} />
```

Correct:

```tsx
<Switch onCheckedChange={setEnabled} />
```

Source: https://zagjs.com/components/react/switch

### HIGH Inline state styling

Wrong:

```tsx
<Switch className="data-[state=checked]:bg-green-600" />
```

Correct:

```tsx
<Switch validateStatus="default" />
```

Source: libs/ui/src/tokens/components/molecules/_switch.css

## Validation Commands

```sh
rg -n "<Switch[^>]*onChange=|<Switch[^>]*className=.*(bg-|text-|data-\\[state|rounded-)" apps
rg -n "<Checkbox[\\s\\S]{0,120}(Enable|Disable|notifications|toggle)" apps -U
rg -n "<Switch[^>]*validateStatus=\"(danger|invalid)\"" apps
```

