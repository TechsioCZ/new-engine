# @techsio/ui-kit Consumer App Usage Rules

Generated during TanStack Intent domain discovery for `@techsio/ui-kit`.
These rules capture maintainer guidance for apps that consume the UI kit, such
as `apps/*`. They are the stable evidence source for consumer-facing skills.

## Scope

Use these rules for app UI implementation, refactors, and audits. They cover
component selection, component props, token overrides, framework adapters, and
UI/UX consistency. They do not cover app data fetching, backend workflows, or
business logic.

## Token-First, ClassName-Last

Drive component appearance through tokens first.

- Change app-wide visuals in semantic, typography, spacing, layout, or radius
  token files.
- Change component-specific visuals in an app component override file only when
  the general token layer cannot express the design.
- Do not override a component token if the default token chain already resolves
  to the desired value.
- Use inline `className` only for unavoidable local layout or composition.
- If a design cannot be expressed through existing tokens or props, treat it as
  a UI kit API gap. Use a temporary className only with that gap recorded.

Wrong:

```tsx
<Button className="bg-surface px-200 font-bold" />
```

Correct:

```css
@theme static {
  --color-button-bg-primary: var(--color-surface);
  --padding-button-md-x: var(--spacing-200);
  --font-weight-button: 700;
}
```

## Tailwind Token Class Mapping

Agents must understand how CSS tokens become Tailwind v4 utility classes.

- `--font-weight-*` tokens are used as `font-*` classes in TSX.
- `--container-*` tokens are width/container tokens. Use them for width and
  max-width utilities such as `w-xl` or `max-w-xl`, not for spacing.
- Prefer semantic spacing classes like `p-100`, `gap-50`, `mt-150` over raw
  Tailwind scale classes like `p-2`, `gap-1`, `mt-3`.
- Do not use arbitrary values for normal design-system styling.

## Component Usage Orchestration

Before building UI in an app:

1. Check whether `@techsio/ui-kit` already has a component for the UX need.
2. Load the component-specific usage guidance for that component.
3. Use only props, variants, themes, and sizes that exist on that component.
4. Prefer the component API over custom helper functions or local wrappers.
5. Add a wrapper only after checking that the component cannot support the use
   case through props, slots, adapter props, or token overrides.

For Zag.js-backed components, also read the matching official Zag React docs
before deciding advanced usage. The local UI-kit component may wrap or rename
parts of the machine API, but the Zag docs are the source for machine
capabilities, anatomy, controlled/uncontrolled props, collection helpers, and
interaction behavior. For example, Combobox usage should compare
`libs/ui/src/molecules/combobox.tsx` with
`https://zagjs.com/components/react/combobox`.

Examples of agent mistakes:

- Using native HTML instead of an existing UI-kit component.
- Using nonexistent props such as `variant="ghost"` on Button.
- Duplicating default Button colors in `className`.
- Creating a local wrapper around Button, Dialog, Breadcrumb, LinkButton, or
  TreeView before checking the component API.
- Reimplementing functions that Zag.js-backed components already provide.
- Ignoring Zag docs for a Zag-backed component and missing props such as
  controlled value/input state, collection mapping, multiple selection,
  disabled items, close-on-select, positioning, or machine part anatomy.

## Component-Specific Usage Skills

`component-usage-ux` should act as an orchestrator. Detailed rules belong in
component-specific usage skills or references, such as:

- `button-usage`
- `input-usage`
- `link-button-usage`
- `dialog-usage`
- `toast-usage`
- `breadcrumb-usage`
- `tree-view-usage`
- `skeleton-usage`

The exact set should follow the current component inventory in `libs/ui/src`.

## Framework Adapters

For Next.js apps, default to framework-native adapters:

- Use `NextLink` for navigation and pass it through UI-kit APIs where the
  component supports link adapter props.
- Use `NextImage` for optimized images and pass it through adapter-capable
  UI-kit components.
- Treat UI-kit `Link` and `Image` as framework-agnostic primitives, mainly for
  shared molecules/templates and non-Next consumers.

Do not add local adapter wrappers until the target component API has been
checked for supported adapter props.

## App Token Initialization

When setting up UI-kit tokens for an app, first determine whether values need
to change at all. Then gather only the missing design inputs:

- main brand colors and semantic roles
- typography family, scale, and weights
- spacing step or scale behavior
- layout/container widths
- radius and shadow preferences
- state colors and feedback roles

The maintainer can provide a compact description, such as main colors or a
spacing rule like "step by 2px". From that, propose the rest of the semantic
mapping similarly to `libs/ui`.

## Validation Expectations

For changes inside `libs/ui`, recommend relevant validation when the modified
area touches component code, tokens, stories, package exports, or release
readiness. The maintainer may confirm which commands to run.

For app changes, audits should focus on UI-kit usage correctness: token-first
styling, existing component usage, valid props, framework adapters, and removal
of duplicated className styles.
