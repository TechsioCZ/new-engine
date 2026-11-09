<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/rating--2774-14985.md (+ token-icon rating, rating-half), edited. Storybook: Atoms/Rating → UX guidelines. -->

# Rating: UX guidelines

Rating shows a score on a known star scale, or collects the user's own score
in a clearly separate input mode.

## When to use

- Showing a score with its scale and, for aggregates, the review count:
  `4.6 out of 5 (128 reviews)`.
- Collecting a rating in a review or satisfaction form.

## Use something else when

| Need | Use instead |
| --- | --- |
| Yes / no agreement | `FormCheckbox` |
| A progress or score that isn't a rating | text or a meter |

## Anatomy

- **Stars**: the scale (`count`, default 5). Outlined empty, filled selected,
  half-filled only with `allowHalf`.
- **Label**: `labelText`, `aria-label` or `aria-labelledby`.
- **Numeric score**: shown next to the stars; for aggregates the app adds the
  review count.
- **Help text** (optional): `helpText` + `validateStatus` in input mode.

## Variants and states

The three modes are the main decision; Figma doesn't model them yet.

| Figma | Code | Meaning |
| --- | --- | --- |
| — | default (interactive) | The user's own score; a radio group with a form value. |
| — | `readOnly` | A submitted or locked score in a form: focusable, submitted, can't change. |
| — | `displayOnly` | An aggregate (average) shown as an image: no tab stop, no form value. |
| `disabled=true` | `disabled` | Input temporarily unavailable, for a reason the user can find. Never for showing an average. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. Interactive stars keep a 32 px target at every size. |
| `dir=ltr` / `rtl` | `dir` | Reading direction. |
| `direction=vertical` / `horizontal` | — | Not in code. Stars always run in one row and wrap. |
| `allowHalf` | `allowHalf` (default `true`) | Halves only where the precision is real. For input, pass `allowHalf={false}` unless the product needs halves. |
| — | `validateStatus`, `helpText` | Error, warning or success feedback in input mode. |

## Behaviour

**May:** show a score, its scale and the review count; accept the user's own
score in a clearly identified input mode.

**Must not:** mix up the average and the user's own vote; submit a vote on
hover or just by showing the result.

- Hovering stars previews; only a click or keyboard choice sets the value.
  Setting the value in a form is a draft until the form is submitted.
- A display updates only when the real score or scale changes.
- A missing score is not 0. With no reviews, show `No reviews yet` instead of
  empty stars.
- If there is no verified way to submit a vote, don't make the stars look
  clickable; link to a separate review form.

## Content and copy

- Label an input rating with a question: `Rate this product` — cs:
  `Ohodnoťte produkt`.
- Aggregate: value with the app locale, scale and count: `4.6 (128 reviews)` —
  cs: `4,6 (128 hodnocení)`. The count is not the score.
- Name a `displayOnly` image fully: `Average product rating: 4.6 out of 5`.

## Accessibility

- The kit gives input mode radio semantics and announces the exact value
  ("4.5 stars"); `displayOnly` exposes one `role="img"` with its label.
- Selected stars differ from empty ones by shape (filled vs outlined), not
  colour alone, and the numeric value is always visible.
- Interactive ratings need a meaningful name; the fallback "Rating" is not
  enough for a form.

## Edge cases

- **Product with no reviews**: `No reviews yet`, never five empty stars that
  read as five negative votes.
- **Average 4.5 next to the user's own 4**: keep them in separate places with
  separate labels; a half star never means "your answer in progress".
- **Disabled used for a read-only average**: wrong; use `displayOnly` (or
  `readOnly` inside a form).

## Related

- [States](../../ux-guidelines/references/states.md): read-only vs disabled.
- [Formatting](../../ux-guidelines/references/formatting.md): numbers in the app locale.
- [Accessibility](../../ux-guidelines/references/accessibility.md): meaning without colour.
