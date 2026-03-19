# Token Chain Rules

Use these rules when deciding where an app-specific visual change belongs.

## Core Principle

Use tokens first and inline `className` last.

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

## Escalation Rule

If the desired appearance still requires inline appearance classes after you checked props and app tokens, treat it as an API gap. Call out the gap instead of normalizing the workaround.
