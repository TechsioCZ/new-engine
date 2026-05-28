## Token Usage Rule

In `_herbatica-<component>.css`, include only the tokens that are truly different from the default token logic in `libs/ui`.

In other words:

- If a `libs/ui` token already resolves to the correct value through the chain, for example `--color-button-fg-outlined-secondary -> --color-button-fg-outlined -> --color-fg-primary`, do not reference it again in the Herbatica component.
- If the result is already correct after configuring `_herbatica-semantic.css`, `_herbatica-typography.css`, or `_herbatica-spacing.css`, a component override is unnecessary.
- Use a component override only when you need to change the reference itself or the value specifically for that component because the general layer is not enough.

## Rule: Token-First, className-Last

When using `libs/ui` components in applications:

1. **Primarily, do not use inline `className` for component appearance**
   - Colors, borders, backgrounds, spacing, radius, typography, and states belong in the component tokens.

2. **When the appearance does not match the design, do not fix it in JSX with a class**
   - Adjust the token mapping in the application instead: `_application-semantic.css`, `_application-typography.css`, `_application-spacing.css`, or, if needed, `_application-<component>.css`.

3. **Use inline `className` only when it is necessary for composition or layout**
   - For example: `relative`, `absolute`, `flex`, `justify-*`, and `items-*` for specific element placement.
   - Only do this if the component does not already support it through `componentVariants = tv({ ... })` or its API.

4. **If the `libs/ui` token chain already produces the correct result, do not remap anything**
   - No redundant overrides.

5. **If the tokens cannot express it, it is an API gap**
   - Inline `className` may be used temporarily.
   - Long term, add the variant or token to `libs/ui` and remove the `className`.

### Hypothetical Example

`libs/ui`:

- `--color-button-fg: var(--color-fg-primary);`

The application wants a different result:

- In `_application-semantic.css`, remap the source token, for example `--color-fg-primary`.
- Or in `_application-button.css`, specifically remap `--color-button-fg` to the desired value.

Do not solve this in usage with a style like:

- `className="text-warning ..."`

Goal: **control component appearance with tokens in one place, not with repeated `className` values in every usage.**
