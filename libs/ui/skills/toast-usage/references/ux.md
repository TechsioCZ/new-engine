<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/toast--2774-34895.md (+ token-icon-toast-close, -error, -info, -success, -warning), edited. Storybook: Molecules/Toast → UX guidelines. -->

# Toast: UX guidelines

A Toast is a short, non-blocking message about the result of something the
user just did. It never takes focus, and anything important it says can
also be found in the page.

## When to use

- Confirming a finished mutation the UI doesn't show clearly (drawer closed,
  row moved, background save).
- The result of async or background work: a `loading` toast that becomes
  `success` or `error`.
- `Undo` after a reversible destructive action.

## Use something else when

| Need | Use instead |
| --- | --- |
| A problem with one field or the form | inline error / `StatusText`, `FormErrorSummary` |
| A decision the user must make | `Dialog role="alertdialog"` |
| A lasting condition of the page | inline `StatusText` at the top of the content |
| Something to read, copy or act on later | inline content |

## Anatomy

- **Type icon**: set by `type`, decorative; the title carries the meaning.
- **Title**: what happened, `<Object> <past participle>`.
- **Description** (optional): one sentence, the record name or the reason.
- **Action** (optional, at most one): `Undo`, `View`, `Try again`.
- **Close** (when `closable`): hides this message only.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `type=success` | `type: "success"` | Only after the operation is confirmed. The result is also visible in the UI. |
| `type=error` | `type: "error"` | The operation failed. Say what, why if known, and the next step. |
| `type=warning` | `type: "warning"` | It worked, with a consequence worth knowing. |
| `type=info` | `type: "info"` | Neutral information about ongoing work. Use sparingly. |
| — | `type: "loading"` | Work in progress; it doesn't time out. Pass `closable: false` while unfinished, then update it in place to `success` or `error`. |
| `type=default` | `type: "message"` (Code Connect) | A neutral notice with no type icon. Prefer `info`. |
| close icon | `closable` | Shows the close button. |

Figma has no `loading` type yet; it exists in code and is the house pattern
for background work.

## Behaviour

**May:** report a confirmed success, a failure or important information;
offer `Undo` or `Try again` when the app really supports them.

**Must not:** take focus from the user's work; be the only place a critical
message or error lives; announce a pending operation as done.

- Show the toast after the real result, never before.
- Closing a toast or letting it time out never undoes the operation. Only an
  explicit `Undo` does.
- One toast per user action. Update a `loading` toast instead of stacking a
  second one; bulk actions get one summary toast.
- Timing must let the user read the message and use its action. Set
  `duration` explicitly: success and info about 5 s, warning about 8 s; an
  error with an action and `loading` stay until resolved or dismissed
  (`Infinity`). The underlying defaults are shorter (success 2 s).
- A timed action (`Undo`) must be reachable from the keyboard before the
  toast disappears.

## Content and copy

- Title `<Object> <past participle>`: `Product saved`, `3 products archived`
  — cs: `Produkt uložen`, `Doklad uložen`, `Produkt přidán do košíku`.
- Error: what happened + why + what to do: `Product not saved` +
  `The SKU is already used.` + `Try again` — cs: `Produkt nebyl uložen`.
- A service outage is never phrased as the user's mistake.
- Never `Success!`, `Done` or `Saved` alone.

## Accessibility

- The kit announces toasts politely through a live region and never moves
  focus. With `closable: false`, Escape doesn't dismiss it either.
- The close button is named `Close notification`; the action button is a
  real Button with a text label.
- The type icon is hidden from screen readers, so the title must say whether
  it worked.

## Edge cases

- **Save fails while the user keeps typing**: the error toast doesn't steal
  focus, and the draft stays in the form with the problem shown there.
- **`Undo` the app can't actually perform**: don't offer it.
- **Toast dismissed before it was read**: the result is still visible in the
  list or record.

## Related

- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): choosing the surface, toast placement and timing.
- [UX writing](../../ux-guidelines/references/ux-writing.md): success and error messages.
- [States](../../ux-guidelines/references/states.md): long background jobs.
