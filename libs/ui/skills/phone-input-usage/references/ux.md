<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/phoneinput--2774-23394.md, edited. Storybook: Molecules/PhoneInput → UX guidelines. -->

# PhoneInput: UX guidelines

PhoneInput joins a country (dial code) with a phone number so the number has
one unambiguous international meaning. A valid format is not a verified
contact.

## When to use

- Any telephone field, with a country context and a clear reason for asking.

## Use something else when

| Need | Use instead |
| --- | --- |
| Other identifiers or codes | `FormInput` |
| Numeric quantities | `FormNumericInput` |

## Anatomy

`PhoneInput.Label`, `PhoneInput.Control` with `PhoneInput.CountryPicker`
(trigger with flag and dial code, list with country name and dial code) and
`PhoneInput.Input`; `PhoneInput.StatusText` for help and errors. The form
submits the number in E.164 (`name`) and optionally the country
(`countryName`).

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding fields. |
| `state=default` | `validateStatus="default"` | No known problem. Not proof the number works. |
| `state=error` | `validateStatus="error"` | A specific, fixable problem; the typed number stays. |
| `state=success` | `validateStatus="success"` | The format was checked. Not "verified" and not "the form was saved". |
| `state=warning` | `validateStatus="warning"` | Needs attention; the user may continue. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | Number and country readable, focusable and copyable; neither can change. |

## Behaviour

**May:** pick a country and edit the number; tell a format check apart from
real verification.

**Must not:** call a number "verified" because the format is valid; change the
country so that the number silently means something else.

- Default the country from the store or locale; the user can change it.
- Pasting a full international number (`+420 …`) keeps the dial code and
  switches the country to match.
- Changing the country keeps the typed digits; it never clears them.
- Validate on blur. Spaces and dashes are normalised, never rejected.
- `onValueChange` reports `isPossible` and `isValid`; use them for the format
  message. Reachability is confirmed by the app (SMS, call), not the field.

## Content and copy

- Label `Phone` — cs: `Telefon`. Help says why you need it:
  `For delivery updates only.` — cs: `Jen pro informace o doručení.`
- Error shows the expected format: `Enter a phone number like +420 601 123 456.`
- The defaults are English: the placeholder (`Phone number`) and the country
  names. Pass a localized `placeholder` on `PhoneInput.Input` and localized
  `countries` (`Česko`, `Slovensko`) for Czech apps.

## Accessibility

- A country is identified by name and dial code, never by flag alone. The kit
  names the trigger `Czechia (+420)` and lists names with codes.
- The country picker has its own hidden label; messages are linked to the
  number input.
- Set `autoComplete="tel"` (the input's `type` and `inputMode` are set by the
  kit).

## Edge cases

- **Local number without country context**: never stored or shown as a
  confirmed international number.
- **Rejected on save**: the typed contact stays for correction; it is not
  replaced by the previously saved one.

## Related

- [FormInput](../../form-input-usage/references/ux.md): other text fields.
- [Select](../../select-usage/references/ux.md): the list behaviour behind the country picker.
- [States](../../ux-guidelines/references/states.md): validation, read-only vs disabled.
