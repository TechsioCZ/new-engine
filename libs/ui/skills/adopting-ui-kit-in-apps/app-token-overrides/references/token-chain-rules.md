# Token Chain Rules

Use these rules when deciding where an app-specific visual change belongs.

## Core Principle

Use tokens first and inline `className` last.

## Prop-Only First

If the chosen component already exposes the right `variant`, `theme`, `size`, or other supported props, start with the cleanest prop-only JSX and treat that as the default correct shape.

Correct default:

- `<Badge variant="discount">Akcia</Badge>`
- `<Badge variant="success">Novinka</Badge>`
- `<Badge variant="warning">Tip</Badge>`
- `<Badge variant="tertiary">Fitness</Badge>`
- `<Badge variant="discount" size="lg">-4,50 EUR</Badge>`

Wrong starting point:

- `<Badge variant="discount" className="rounded-md px-200 py-100 text-xs font-bold">Akcia</Badge>`

If the prop-only form still does not match the design, adjust the token chain next. Do not jump straight to appearance `className`.

## Override Order

Start at the broadest layer that can solve the problem:

1. `_app-semantic.css`
2. `_app-typography.css`
3. `_app-spacing.css`
4. `_app-<component>.css`

Move downward only when the broader layer cannot produce the right result.

## Component Override Rule

Put a token into `_app-<component>.css` only when it is truly different from the default `libs/ui` token logic.

Do not repeat a reference that already resolves correctly through the existing chain.
Do not create a parallel app styling layer with new utility classes when the component already exposes the relevant token chain.

## Active Surface Rule

Override only the variant, size, and state that the app surface actually uses.

Do not automatically add `sm`, `lg`, or state overrides just because the library defines them.

## Redundant Override Example

If the library already resolves:

- `--color-button-fg-outlined-secondary`
- to `--color-button-fg-outlined`
- to `--color-fg-primary`

and the app gets the right result by changing `--color-fg-primary` in `_app-semantic.css`, then do not add a button-specific override.

## Component-Specific Example

Use `_app-button.css` only when the app must change the actual component-level reference or value because the semantic layer is no longer enough.

Example:

- library: `--color-button-border-secondary: var(--color-border-secondary);`
- app semantic remap makes `--color-border-secondary` correct elsewhere but wrong for this button case

That is the point where a component-specific override becomes justified.

## Wrong vs Correct

Wrong:

- creating `.app-footer-contact`, `.app-footer-card`, or `.app-footer-pill` utilities instead of overriding existing `--footer-*` tokens
- overriding `--text-footer-title-sm` and `--text-footer-title-lg` when the app only uses `size="md"`
- keeping inline `text-primary` when the same color already comes from the parent slot or token chain
- keeping inline badge classes for radius, padding, text size, or font weight after the component already exposes the right `variant` and `size`

Correct:

- changing `--spacing-footer-section-md` because `Footer.Section` actually consumes `gap-footer-section-md`
- changing `--padding-footer-bottom-md` because `Footer.Bottom` actually consumes `p-footer-bottom-md`
- removing a className when it only repeats the result of the existing slot default or token chain
- reducing usage to prop-only badge JSX first, then changing app token values if the Figma result still does not match

## Inline Class Audit

Before editing, classify inline `className` into:

- `redundant-inline`: repeats an existing slot default or token result
- `composition-inline`: local layout/composition around the component slots
- `api-gap-inline`: currently needed because props and existing tokens cannot express the design

## Escalation Rule

If the desired appearance still requires inline appearance classes after you checked props and app tokens, treat it as an API gap. Call out the gap instead of normalizing the workaround.
