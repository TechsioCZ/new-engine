<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/FormErrorSummary → UX guidelines. -->

# FormErrorSummary: UX guidelines

FormErrorSummary lists every problem after a failed submit, with a link that
takes the user straight to each field. It is an index to the inline errors,
not a replacement for them.

## When to use

- A submit failed with two or more field errors. Put it above the form, or at
  the top of a long page.
- Server-side validation returned errors for several fields.

## Use something else when

| Need | Use instead |
| --- | --- |
| A single field error | the field's inline error only; focus that field |
| A failure that isn't about a field (network, permission) | `StatusText` above the actions, or an error `Toast` with `Try again` |
| Feedback while typing | inline field errors |

## Anatomy

- **Title** (`title`, default `There is a problem`): a heading that also names
  the alert.
- **Error list** (`errors`): one link per problem, each pointing at its field
  through `targetId`.

## Variants and states

There is no Figma component and no variants. It has two states: hidden (an
empty `errors` list renders nothing) and shown.

## Behaviour

**May:** move focus to a field, opening what hides it first (closed `details`
automatically; accordions, tabs or lazy fields through `revealField`).

**Must not:** appear before the user tries to submit; live in a toast or in a
separate alert dialog; replace the inline errors.

- After a failed submit, the app focuses the summary once it has rendered. The
  screen reader reads the title and the list.
- Each link focuses and scrolls to its field without changing the URL;
  `onFieldFocus` runs only after focus really landed.
- The summary goes away when the errors are fixed or on the next successful
  submit. It never lingers with stale items.

## Content and copy

- Title counts the problems: `There are 3 problems with this form` — cs:
  `Ve formuláři jsou 3 chyby` (plural forms through the app's i18n).
- Items use the same words as the inline messages, saying what to do:
  `Enter an SKU with at least 4 characters` — cs:
  `Zadejte SKU o délce alespoň 4 znaky`. Prefix the field label when the
  message alone is ambiguous.
- Order the items as the fields appear in the form.

## Accessibility

- The kit renders `role="alert"`, labelled by its heading, focusable without a
  tab stop (`tabIndex=-1`), with real fragment links.
- Don't wrap it in another live region; that doubles the announcement.
- `targetId` must be the `id` of the actual input, unique on the page.
- Every inline error also has its icon and text; the summary doesn't excuse
  colour-only field states.

## Edge cases

- **Form inside a Dialog**: the same two-or-more rule applies. Render the
  summary inside the dialog body, directly above the form fields, never in a
  second dialog or a toast. After a failed submit scroll the body to the top
  and focus the summary; it is inside the dialog's focus trap, so focus stays
  in the dialog. Each link focuses its field in the same dialog. Closing the
  dialog discards the summary with the draft; reopening starts clean. With a
  single error show only the inline message and keep focus on that field.

- **Field inside a closed accordion or a tab**: `revealField` opens it and
  resolves after the field mounts; if revealing fails, focus stays on the link.
- **Server returns an error for a field that isn't on screen** (hidden step,
  removed field): show it in StatusText above the actions, not as a dead link.

## Related

- [States](../../ux-guidelines/references/states.md): error, and when to show a summary.
- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): where errors live.
- [FormInput](../../form-input-usage/references/ux.md): the inline errors the summary links to.
