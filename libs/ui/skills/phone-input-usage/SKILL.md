---
name: phone-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit PhoneInput for
  international phone entry with country selection, libphonenumber details,
  hidden E.164 form value, native validation, validation status, and compound
  country picker slots.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - select-usage
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/phone-input.tsx"
  - "libs/ui/src/tokens/components/molecules/_phone-input.css"
  - "libs/ui/stories/molecules/phone-input.stories.tsx"
---

# @techsio/ui-kit PhoneInput Usage

Use PhoneInput for telephone fields. Do not compose country Select and Input
manually.

## Shared field contract

Use `sm`, `md` (default), or `lg`. The prefix uses a compact, component-token
width so the phone number retains useful space, including at large size.
`PhoneInput.StatusText` generates a unique ID for each mounted message and merges
all messages with the input's existing description; errors also register an
error-message association. Error, warning and success messages keep their icons.
The country picker mounts its own visually hidden label so its accessible name
never points at an absent Select label.

`readOnly` preserves focus, text selection/copy and the hidden form value while
blocking both number and country mutations. The control uses the shared readonly
surface and a text-selection cursor on the number; disabled remains the stronger state. Use a distinct “Read-only” example
rather than treating it as disabled.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `PhoneInput`.

**Use it when**

- Any telephone field, with country code selection and formatting.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Other numeric identifiers | FormInput |

**Do**

- Default the country from the store/locale; allow changing it.
- Validate on blur with a message showing the expected format.
- Set `autoComplete="tel"`.

**Don't**

- Compose a country Select and an Input by hand.
- Reject valid numbers because of spaces or dashes — normalise instead.

**Copy and states**

- Label `Phone`; help text says why you need it (`For delivery updates only.`).

## Setup

```tsx
import { PhoneInput } from "@techsio/ui-kit/molecules/phone-input"

<PhoneInput name="phone" defaultCountry="CZ" onValueChange={setPhoneDetails}>
  <PhoneInput.Label>Phone</PhoneInput.Label>
  <PhoneInput.Control>
    <PhoneInput.CountryPicker />
    <PhoneInput.Input />
  </PhoneInput.Control>
</PhoneInput>
```

Supported root props:

```text
countries, country/defaultCountry, value/defaultValue
name, countryName, form
required, disabled, readOnly, nativeValidation, nativeValidationMessage
validateStatus: default | error | success | warning
onValueChange(details), onCountryChange(details)
size: sm | md | lg
```

## Core Patterns

### Use the compound parts

Use `Label`, `Control`, `CountryPicker` or lower-level country slots, and
`Input`.

### Consume structured details

`onValueChange` gives `value`, `e164`, `country`, `callingCode`,
`nationalNumber`, `isPossible`, and `isValid`.

### Let PhoneInput own country selection

It uses Select internally for countries and syncs country from typed values.

## Common Mistakes

### HIGH Native tel input only

Wrong:

```tsx
<Input type="tel" name="phone" />
```

Correct:

```tsx
<PhoneInput name="phone"><PhoneInput.Control><PhoneInput.CountryPicker /><PhoneInput.Input /></PhoneInput.Control></PhoneInput>
```

Source: libs/ui/src/molecules/phone-input.tsx

### HIGH Manual country select wrapper

Wrong:

```tsx
<Select items={countries} /><Input type="tel" />
```

Correct:

```tsx
<PhoneInput.CountryPicker />
```

Source: libs/ui/src/molecules/phone-input.tsx

### HIGH Inline validation styling

Wrong:

```tsx
<PhoneInput validateStatus="error" className="border-red-500" />
```

Correct:

```tsx
<PhoneInput validateStatus="error" nativeValidation />
```

Source: libs/ui/src/tokens/components/molecules/_phone-input.css

## Validation Commands

```sh
rg -n "type=\"tel\"|<PhoneInput\\b(?!\\.)[^>]*className=.*(border-|bg-|text-|p-)" apps
rg -U -P -n "<PhoneInput\\b(?!\\.)(?![\\s\\S]{0,600}<PhoneInput\\.Input)" apps
rg -n "<PhoneInput\\b(?!\\.)[^>]*validateStatus=\"(danger|invalid)\"" apps
```

### Editing, reset and refs

Formatting preserves logical digit positions for middle insertion, deletion,
replacement and international paste. Deleting beside a generated separator
removes the adjacent digit rather than trapping the caret. IME composition is
left unformatted until composition ends.

An uncancelled native form reset restores uncontrolled number/country defaults
together, including explicit `form` association. Controlled props remain owned
by the parent. Reset is not a user edit and does not emit change callbacks.
`PhoneInput.Input` supports React 19 callback-ref cleanup and legacy/object refs.

The shared focus outline appears only while a descendant is focus-visible;
validation borders remain persistent. Neutral interaction surfaces preserve
prefix/placeholder contrast, and highlighted/selected country metadata inherits
the option foreground.
