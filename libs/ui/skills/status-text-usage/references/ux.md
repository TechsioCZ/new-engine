<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/statustext--2774-19238.md (+ token-icon-status-text-error, -success, -warning), edited. Storybook: Atoms/StatusText → UX guidelines. -->

# StatusText: UX guidelines

StatusText is a short message next to a specific field, section or operation.
It explains a requirement, a problem or a checked result, and tells the user
what to do next.

## When to use

- Field help, a validation error, a warning or a checked result, right under
  the field it belongs to.
- A section-level condition: `Last saved 2 minutes ago`, `Sync paused`.

## Use something else when

| Need | Use instead |
| --- | --- |
| A passing confirmation of an action | `Toast` |
| All form errors after submit | `FormErrorSummary` |
| A short state label | `Badge` |
| Product stock or availability | `AvailabilityStatus` |
| A blocking decision | `Dialog` |
| A field's name | `Label` (StatusText never replaces it) |

## Anatomy

- **Icon**: decorative, by `status` (none for `default`); it supports the
  text and is never the only signal.
- **Message**: one sentence.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `status=default` | `status="default"` | Neutral help or an instruction. Claims no error and no success. |
| `status=error` | `status="error"` | A specific, fixable problem. Names the field and the fix; the user's value stays to be corrected. |
| `status=warning` | `status="warning"` | Needs attention, but the user can continue. Never hides a blocking error. |
| `status=success` | `status="success"` | This value was actually checked. Not proof that the whole form or transaction was saved. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` (default `md`) | Match the size of the control it describes. |
| — | `align="start" \| "center"` (default `start`) | `center` only under centred content. |
| — | `showIcon` (default `true`), `icon` | Keep the icon for validation. |

## Behaviour

**May:** explain a format, a fixable error, a real success or an important
warning, linked to the right field or task.

**Must not:** turn a service failure into a claim that the user's input is
wrong; present `success` colour as confirmation of a whole transaction;
replace the label.

- The message changes with the real state of its source; text, colour and
  icon update together.
- Setting `status` doesn't validate anything. The app decides when
  (on blur or submit) and links the message to its field with
  `aria-describedby` (and `aria-errormessage` for errors).
- A fix or retry is a separate named control, not the message.
- Don't stack several messages under one field; summarise.

## Content and copy

- Error = what is wrong + how to fix it, in the field's words:
  `Enter an SKU with at least 4 characters.` — cs: `Zadejte SKU s alespoň 4
  znaky.`
- Help explains format or consequence: `Uppercase, dash-separated.` — cs:
  `Velká písmena, oddělená pomlčkou.`
- A service failure says so: `Couldn't check the SKU. Try again.` — cs:
  `SKU se nepodařilo ověřit. Zkuste to znovu.`

## Accessibility

- The kit gives `error` `role="alert"` and `warning`/`success`
  `role="status"`; neutral help is silent and is read through the field's
  `aria-describedby`. If a parent already announces, override the role so
  it isn't read twice.
- The message is understandable without colour or icon.
- An important change is never just a brief visual flash.

## Edge cases

- **Save fails because the server is down**: the correctly filled number is
  not marked invalid; the failure is reported on the form or in a toast.
- **Warning vs error**: a condition that blocks continuing is an `error`, not
  a softer `warning`.
- **Checked one field**: `success` under it doesn't mean the project was
  created or saved.

## Related

- [UX writing](../../ux-guidelines/references/ux-writing.md): errors, warnings and help text.
- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): inline message vs toast.
- [States](../../ux-guidelines/references/states.md): validation timing.
- [FormInput](../../form-input-usage/references/ux.md): field help and errors.
