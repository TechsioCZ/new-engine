---
name: phone-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit PhoneInput for
  international phone entry with country selection, libphonenumber details,
  hidden E.164 form value, native validation, validation status, and compound
  country picker slots.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - select-usage
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/phone-input.tsx"
  - "libs/ui/src/tokens/components/molecules/_phone-input.css"
  - "libs/ui/stories/molecules/phone-input.stories.tsx"
---

# @techsio/ui-kit PhoneInput Usage

Use PhoneInput for telephone fields. Do not compose country Select and Input
manually.

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
