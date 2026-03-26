---
name: code-connect
description: Generate Figma Code Connect files (*.figma.tsx) that map Figma component properties to codebase components. Use when the user wants to create or update Code Connect mappings after a component has been created in both code (libs/ui) and Figma (via write-to-figma + migrate-to-figma). Triggers on "code connect X", "/code-connect X", "connect X to figma code", "create figma mapping for X", "link X component to figma".
---

# Create Code Connect Mapping

Generates a `<Component>.figma.tsx` file that maps a Figma component's properties (variants, booleans, text, instance swaps) to the corresponding React component in `libs/ui`. This is the third step in the design system automation pipeline:

1. **write-to-figma** — sets up Figma MCP infrastructure
2. **migrate-to-figma** — creates the component in Figma with variables, variants, and docs
3. **code-connect** (this skill) — links the Figma component back to code via Code Connect

## Prerequisites

- Component exists in `libs/ui` (either `src/atoms/` or `src/molecules/`)
- Component has been migrated to Figma (via migrate-to-figma skill)
- `@figma/code-connect` package is installed (`pnpm add -D @figma/code-connect`)
- Figma file URL with the component's node ID is known

## Step 1: Locate Component Source Files

Find the component's source files in `libs/ui/`:

```
src/atoms/<name>.tsx           OR  src/molecules/<name>.tsx
tokens/components/atoms/_<name>.css  OR  tokens/components/molecules/_<name>.css
stories/atoms/<name>.stories.tsx     OR  stories/molecules/<name>.stories.tsx
```

Read the `.tsx` file completely. This is the primary source of truth for the Code Connect mapping.

## Step 2: Analyze Component Props and Variants

### From the `.tsx` file, extract:

- **`tv()` call**: all `variants` keys and their values — these become `figma.enum()` mappings
- **Props type**: all props with TypeScript types — determines which `figma.*` helper to use
- **Boolean props**: `disabled`, `isLoading`, `block`, icon toggles — map to `figma.boolean()`
- **Text/children props**: `children`, `label`, `placeholder` — map to `figma.string()`
- **Compound sub-components**: `Component.Sub` patterns — may need `figma.instance()` or `figma.nestedProps()`

### Mapping rules (component prop type -> Code Connect helper):

| Component Prop | Figma Property Type | Code Connect Helper |
|---------------|--------------------|--------------------|
| `variant`, `size`, `theme` (union/enum) | Variant property | `figma.enum('Property Name', { FigmaValue: 'codeValue' })` |
| `disabled`, `isLoading`, `block` (boolean) | Boolean property | `figma.boolean('Property Name')` |
| `children`, `label` (string/ReactNode) | Text property | `figma.string('Property Name')` |
| `icon`, `leadingIcon` (ReactNode) | Instance swap | `figma.instance('Property Name')` |
| Nested component props | Nested instance | `figma.nestedProps('Container', { ... })` |

## Step 3: Get the Figma Node URL

The user must provide the Figma component URL, or you can retrieve it using the Figma MCP tools:

```
https://www.figma.com/design/<fileKey>/<fileName>?node-id=<nodeId>
```

If using Figma MCP, call `get_metadata` or `get_code_connect_suggestions` to find the component's node ID.

## Step 4: Create the Code Connect File

### File naming and location

Place the file next to the component source:

```
src/atoms/<name>.figma.tsx       # for atoms
src/molecules/<name>.figma.tsx   # for molecules
```

### File structure

```tsx
import figma from '@figma/code-connect'
import { ComponentName } from './<component-name>'

figma.connect(
  ComponentName,
  'https://www.figma.com/design/<fileKey>/<fileName>?node-id=<nodeId>',
  {
    props: {
      // Map each Figma property to its code equivalent
    },
    example: (props) => (
      // Render the component with mapped props
    ),
  }
)
```

### Example: Button with full mapping

Given a Button component with `tv()` variants for `variant`, `theme`, `size`, plus boolean `disabled`, `isLoading`, and text `children`:

```tsx
import figma from '@figma/code-connect'
import { Button } from './button'

figma.connect(
  Button,
  'https://www.figma.com/design/abc123/Design-System?node-id=1:456',
  {
    props: {
      variant: figma.enum('Variant', {
        Primary: 'primary',
        Secondary: 'secondary',
        Danger: 'danger',
        Warning: 'warning',
        Success: 'success',
        Info: 'info',
      }),
      theme: figma.enum('Theme', {
        Solid: 'solid',
        Light: 'light',
        Outlined: 'outlined',
        Borderless: 'borderless',
      }),
      size: figma.enum('Size', {
        Small: 'sm',
        Medium: 'md',
        Large: 'lg',
      }),
      disabled: figma.boolean('Disabled'),
      isLoading: figma.boolean('Loading'),
      label: figma.string('Label'),
      icon: figma.boolean('Has Icon', {
        true: <IconPlaceholder />,
        false: undefined,
      }),
    },
    example: ({ variant, theme, size, disabled, isLoading, label, icon }) => (
      <Button
        variant={variant}
        theme={theme}
        size={size}
        disabled={disabled}
        isLoading={isLoading}
        icon={icon}
      >
        {label}
      </Button>
    ),
  }
)
```

### Example: Compound component (Accordion)

For components with sub-components, create separate connections for each part:

```tsx
import figma from '@figma/code-connect'
import { Accordion } from './accordion'

// Root connection
figma.connect(
  Accordion,
  'https://www.figma.com/design/abc123/Design-System?node-id=2:100',
  {
    props: {
      collapsible: figma.boolean('Collapsible'),
    },
    example: ({ collapsible }) => (
      <Accordion collapsible={collapsible}>
        <Accordion.Item value="item-1">
          <Accordion.Trigger>Trigger text</Accordion.Trigger>
          <Accordion.Content>Content here</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    ),
  }
)

// Item-level connection (if items are separate Figma components)
figma.connect(
  Accordion.Item,
  'https://www.figma.com/design/abc123/Design-System?node-id=2:200',
  {
    props: {
      triggerText: figma.string('Trigger'),
      contentText: figma.string('Content'),
    },
    example: ({ triggerText, contentText }) => (
      <Accordion.Item value="item">
        <Accordion.Trigger>{triggerText}</Accordion.Trigger>
        <Accordion.Content>{contentText}</Accordion.Content>
      </Accordion.Item>
    ),
  }
)
```

## Step 5: Ensure Configuration Exists

Check if `figma.config.json` exists at the UI library root (`libs/ui/figma.config.json`). If not, create it:

```json
{
  "codeConnect": {
    "parser": "react",
    "include": ["src/**/*.figma.tsx"],
    "label": "React",
    "language": "typescript",
    "importPaths": {
      "src/atoms/*": "@libs/ui/atoms",
      "src/molecules/*": "@libs/ui/molecules",
      "src/organisms/*": "@libs/ui/organisms"
    }
  }
}
```

## Step 6: Validate and Publish

### Dry run (preview what would be published)

```bash
cd libs/ui && npx figma connect publish --token $FIGMA_ACCESS_TOKEN --dry-run
```

### Publish to Figma

```bash
cd libs/ui && npx figma connect publish --token $FIGMA_ACCESS_TOKEN --label "React"
```

After publishing, the component in Figma Dev Mode will show the exact React code snippet with correct props when a designer selects an instance.

## Property Name Mapping Convention

Figma property names (set during migrate-to-figma) use **PascalCase** display names. Map them to the **camelCase** code props:

| Figma Property Name | Code Prop | Helper |
|--------------------|-----------|--------|
| `Variant` | `variant` | `figma.enum()` |
| `Theme` | `theme` | `figma.enum()` |
| `Size` | `size` | `figma.enum()` |
| `State` | — | Use `variant` prop in `figma.connect()` to target specific variant |
| `Disabled` | `disabled` | `figma.boolean()` |
| `Loading` | `isLoading` | `figma.boolean()` |
| `Has Icon` | `icon` | `figma.boolean()` with true/false rendering |
| `Label` | `children` | `figma.string()` |
| `Show Icon` | — | `figma.boolean()` controlling icon visibility |

## Handling Variant-Specific Connections

If a component has Figma variants that map to different code states (e.g., `State=hover` only affects CSS, not props), use the `variant` option in `figma.connect()` to scope the connection:

```tsx
// Connect only the "default" state variant
figma.connect(
  Button,
  'https://www.figma.com/design/abc123/Design?node-id=1:456',
  {
    variant: { State: 'Default' },
    props: { /* ... */ },
    example: (props) => <Button {...props} />,
  }
)
```

This prevents Figma from showing code snippets for pure visual states (hover, focus, active) that don't correspond to different prop values.

## Troubleshooting

### "No component found for node"
The Figma URL node ID must point to the **component set** (the parent that contains all variants), not an individual variant. Check the URL in Figma by selecting the component set frame.

### "Property 'X' not found on component"
The Figma property name in the `figma.enum()`/`figma.boolean()` call must match **exactly** (case-sensitive) the property name shown in the Figma properties panel. Open the component in Figma and verify the exact spelling.

### Import paths not resolving
Ensure `importPaths` in `figma.config.json` maps the source file paths to the public import paths consumers use. The key is the glob matching the source location, the value is the package path.

### Compound components not linking
Each Figma sub-component needs its own `figma.connect()` call with its own node ID. A single `figma.connect()` cannot map multiple Figma nodes.

### Publishing fails with auth error
Set the token via environment variable: `export FIGMA_ACCESS_TOKEN=<your-token>`. The token needs **File content** read access and **Code Connect** write access. Generate at: Figma > Settings > Security > Personal access tokens.

### Enum values don't match
The keys in `figma.enum()` mapping must match the Figma variant values exactly as they appear in Figma (usually PascalCase like `Primary`, `Small`). The values are what gets output in the code snippet (usually camelCase/lowercase like `primary`, `sm`).
