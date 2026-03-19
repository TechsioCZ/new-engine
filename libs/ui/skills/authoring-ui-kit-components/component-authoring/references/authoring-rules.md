# Authoring Rules

These are the canonical maintainer expectations for `libs/ui`.

## Non-Negotiable Rules

- Use `type`, not `interface`.
- Use `tv()` for component styling.
- Use component token classes, not direct semantic token classes, in component source.
- Use `ref` as a prop where needed; do not use `forwardRef`.
- Avoid arbitrary Tailwind values.
- Avoid default exports and barrel exports unless a framework requirement forces them.

## Maintainer Red Flags

- native elements where a library component should be used
- hardcoded or default Tailwind utility classes where a library token exists
- inline appearance `className` instead of token or API work
- inconsistent naming versus nearby files
- too many explanatory comments in otherwise straightforward code
- props introduced in the wrong layer or leaked to DOM or machine config
- compound patterns that do not match the established repo style

## Preferred Authoring Habit

Read the nearest analogue first:

1. source component
2. token CSS
3. story file

Then match the local pattern instead of inventing a new one.
