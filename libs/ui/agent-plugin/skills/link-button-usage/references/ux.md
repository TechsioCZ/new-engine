<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/linkbutton--2774-37412.md, edited. Storybook: Atoms/LinkButton → UX guidelines. -->

# LinkButton: UX guidelines

A LinkButton is a real link with a button's visual weight. It stresses an
important navigation step and promises a destination, never a submission.

## When to use

- An important navigation step that must stay a link: `Go to checkout`,
  `View order`, a marketing CTA, `Back to list` when it is a real URL.
- Opening a "New …" page. Opening the form doesn't create the record; the
  form's submit `Button` does.

## Use something else when

| Need | Use instead |
| --- | --- |
| Save, delete, submit, open a dialog | `Button` |
| A link inside text or a list | `Link` |

## Anatomy

- **Label**: the destination or intent. Always present.
- **Icon** (optional): `icon` + `iconPosition`, same rules as Button.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=primary` … `danger` | `variant="primary" \| "secondary" \| "tertiary" \| "warning" \| "danger"` | Same hierarchy as Button: one primary per surface. `danger` only for navigation into a destructive flow (leave, cancel an order). |
| `theme=solid` / `light` / `outlined` / `borderless` | same values | Emphasis only. There is no `ghost`; use `borderless`. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` (default `md`) | Density only. |
| `state=hover` | not a prop | A browser state; it navigates nowhere. |
| `state=disabled` | `disabled` | Navigation blocked for a reason the user can find. The kit drops `href`, sets `aria-disabled`, removes it from the tab order and swallows clicks. |

There is no loading state: navigation shows progress on the page that loads.

## Behaviour

**May:** open the named destination; stand out from secondary links.

**Must not:** submit a form, save, or change data; look like a confirmation.

- A primary LinkButton doesn't make its destination an approved or required
  step; it is only the most likely next page.
- A disabled LinkButton really blocks navigation (no `href`), not just its
  colour. The reason is visible nearby.
- Navigation never discards an unsaved draft without the app's leave-page
  handling.

## Content and copy

- Name the destination or intent: `Go to cart`, `View order`, `Continue shopping` — cs: `Přejít do košíku`, `Otevřít objednávku`.
- Never an action verb that promises a result navigation can't deliver:
  `Confirm`, `Save`, `Place order` belong on a `Button`.
- Say when it opens a new tab.

## Accessibility

- The kit renders a native anchor (or your router adapter through `as`); a
  disabled one renders an inert `span` with `role="link"` and `aria-disabled`.
- The label must make sense read alone, like any link.
- Availability is never shown by colour alone.

## Edge cases

- **"Confirm" on a page that only navigates**: rename it to the destination;
  the next page does the confirming.
- **Checkout CTA looks like an order button**: pressing it never places the
  order. Only the final submit `Button` does.
- **Destination unavailable**: `disabled` plus a visible reason; never a
  live-looking button that does nothing.

## Related

- [Button](../../button-usage/references/ux.md): actions and button hierarchy.
- [Link](../../link-usage/references/ux.md): inline navigation.
- [Component selection](../../ux-guidelines/references/component-selection.md): Link vs LinkButton vs Button.
