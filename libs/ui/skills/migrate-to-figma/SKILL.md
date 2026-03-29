---
name: migrate-to-figma
description: Migrate a UI library component from the codebase into Figma with proper variables, component sets, and VIGo-style documentation page. Use when the user wants to create or sync a component from libs/ui into a Figma file. Triggers on "migrate X to figma", "/migrate-to-figma X", "create X component in figma from code", "sync X to figma".
---

# Migrate Component to Figma

Analyze a UI library component (`.tsx` + `.css` tokens + `.stories.tsx`), create Figma variables, build a component set with variants and interactive properties, and generate documentation sections on the page.

## Prerequisites

- Verify Figma Console MCP is connected (`figma_get_status` returns `initialized: true`)
- Verify Desktop Bridge plugin is running in Figma
- Verify the target Figma file is open and connected

## Default Migration Mode

- Create a fresh page or wrapper section for each migration unless the user explicitly asks to update an existing Figma output in place
- Leave older experiments, smoke tests, and partial migrations untouched unless the user explicitly asks to reuse or replace them

## Step 1: Locate Component Files

Find the three source files in `libs/ui/`:

```text
src/atoms/<name>.tsx           OR  src/molecules/<name>.tsx
src/tokens/components/atoms/_<name>.css  OR  src/tokens/components/molecules/_<name>.css
stories/atoms/<name>.stories.tsx     OR  stories/molecules/<name>.stories.tsx
```

Read all three files completely. If any file is missing, warn the user and proceed with what is available.

## Step 2: Analyze Component

### From the `.tsx` file, extract

- `tv()` variants, compoundVariants, and defaultVariants
- props with TypeScript types and defaults
- variant dimensions such as `variant`, `theme`, `size`, `state`
- state-related props such as `disabled`, `isLoading`, and data attributes
- boolean or structural features such as icon support, block layout, uppercase, helper labels, triggers, and optional subparts

### From the `.css` file, extract

- the canonical CSS token inventory: exact token names and counts from the source file
- reference layer tokens such as `--color-<component>-<variant>`
- derived tokens for `bg`, `fg`, `border`, hover, active, disabled, and other states
- spacing tokens such as `--spacing-<component>-*`, `--padding-<component>-*`, `--gap-<component>-*`
- typography tokens such as `--text-<component>-*`
- border and radius tokens such as `--radius-<component>-*`, `--border-<component>-width-*`
- focus ring tokens such as `--color-<component>-ring`
- root-level variables in `:root {}`
- binding constraints: note any canonical token that cannot be bound as a single Figma variable, for example shorthand tokens such as `--padding-<component>-*`

### From the `.stories.tsx` file, extract

- showcased combinations and story matrices
- real-world examples such as icons, loading states, block layout, validation states, or embedded actions
- argTypes and controls showing the supported API surface

## Step 3: Check Figma Connection

```js
// Use figma_get_status to verify connection.
// Expect: initialized: true
// Expect: transport.active: "websocket"
```

If not connected, instruct the user to open or re-run the Desktop Bridge plugin.

## Step 4: Create Variable Collections

### 4a. Primitives Collection

Create once and reuse across components. Skip if it already exists.

Use it for primitive color values used by `_semantic.css`.

```js
const collections = await figma.variables.getLocalVariableCollectionsAsync();
// If "Primitives" exists, reuse it.
```

### 4b. Semantic Collection

Create once and reuse across components. Skip if it already exists.

Map it to `_semantic.css` with Light and Dark modes.

Expected inventory includes:

- `color/primary` .. `color/danger`
- `color/primary/light` .. `color/danger/light`
- `color/fg/primary`, `color/fg/reverse`, `color/fg/secondary`, `color/fg/placeholder`
- accent and status foreground aliases
- `color/base`, `color/surface`, `color/overlay`
- `color/bg/disabled`, `color/fg/disabled`, `color/border/disabled`
- `color/border/primary`
- `color/fill/base`, `color/fill/hover`, `color/fill/active`
- `color/ring`
- `spacing/50..950`
- `radius/sm`, `radius/md`, `radius/lg`, `radius/full`
- `font/size/xs..4xl`
- `border-width/sm`, `border-width/md`, `border-width/lg`
- `ring/width`, `ring/offset`

Use direct values or aliases as appropriate.

### 4c. Component Collection

Always create a fresh collection for the migrated component:

```js
const compCol = figma.variables.createVariableCollection('Component/<Name>');
compCol.renameMode(compCol.modes[0].modeId, 'Light');
const darkId = compCol.addMode('Dark');
```

### Token naming and CSS export contract

- Treat the component token `.css` file as the source of truth
- Preserve the canonical source token inventory even if Figma bindings require extra implementation detail
- Keep internal Figma names component-scoped and readable for designers
- Make Dev Mode CSS export match the canonical source token names from the component `.css` file via Web code syntax
- Do not invent a parallel naming model unless you also define the exact Web code syntax mapping for it

Prefer component-scoped Figma names for internal design usage:

- `--color-button-primary` -> `button/color/primary`
- `--color-button-bg-primary` -> `button/bg/primary`
- `--color-button-fg-primary` -> `button/fg/primary`
- `--color-button-border-primary` -> `button/border/primary`
- `--spacing-button-sm` -> `button/spacing/sm`
- `--padding-button-sm` -> `button/padding/sm`
- `--text-button-sm` -> `button/text/sm`
- `--radius-button-sm` -> `button/radius/sm`
- `--border-button-width-sm` -> `button/border-width/sm`
- `--color-button-ring` -> `button/ring`

If internal Figma names differ from the canonical source token names, set each variable's Web code syntax so Dev Mode still exports the exact canonical CSS variable name from the source file.

### Canonical component inventory

Create canonical component variables that alias to the Semantic collection or hold direct component values:

- reference layer: `<name>/color/<variant>`
- background layer: `<name>/bg/<variant>` plus hover, active, light, outlined, disabled, and other states required by the source CSS
- foreground layer: `<name>/fg/<variant>` plus outlined, light, borderless, disabled, and other states required by the source CSS
- borders: `<name>/border/<variant>`
- spacing: `<name>/spacing/<size>`
- padding shorthand inventory: `<name>/padding/<size>`
- typography: `<name>/text/<size>`
- radius: `<name>/radius/<size>`
- border width: `<name>/border-width/<size>`
- ring: `<name>/ring`

### Binding strategy for Figma-only limitations

- Keep Figma-only binding implementation details secondary to the canonical inventory
- Do not create a helper collection by default just to decompose a shorthand token
- For shorthand tokens such as `--padding-button-sm`, keep the canonical shorthand token in the documented inventory and CSS export contract
- When binding node padding in Figma, bind the individual sides directly to the semantic or primitive spacing variables that the shorthand resolves to
- Do not list decomposed node bindings as canonical CSS variables
- Do not include decomposed node bindings in token-count statistics
- Only introduce explicit helper variables if the user specifically asks for them or if the Figma API limitation cannot be solved by binding existing semantic or primitive variables directly

### Key API patterns

```js
// Alias to another variable
v.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: targetVar.id });

// Direct color value
v.setValueForMode(modeId, { r: 0.5, g: 0.5, b: 0.5, a: 1 });

// Bind paint to variable
const paint = figma.variables.setBoundVariableForPaint(
  figma.util.solidPaint('#000000'),
  'color',
  variable,
);
comp.fills = [paint];

// Bind float-like properties to variables
comp.setBoundVariable('paddingLeft', variable);
comp.setBoundVariable('topLeftRadius', variable);
text.setBoundVariable('fontSize', variable);
```

## Step 5: Build Component Set

### 5a. Determine the variant matrix

Use the `tv()` analysis to identify all dimensions.

- Typical matrix: `variant x theme x size x state`
- Include states such as `default`, `hover`, `active`, `focus`, `disabled`, and `loading` when the component supports them

### 5b. Create individual components

```js
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

for (each combination of variant dimensions) {
  const comp = figma.createComponent();
  comp.name = `Variant=${v}, Theme=${t}, Size=${s}, State=${st}`;

  comp.layoutMode = 'HORIZONTAL';
  comp.primaryAxisAlignItems = 'CENTER';
  comp.counterAxisAlignItems = 'CENTER';
  comp.primaryAxisSizingMode = 'AUTO';
  comp.counterAxisSizingMode = 'FIXED';
  comp.resizeWithoutConstraints(100, heightForSize);

  comp.setBoundVariable('itemSpacing', gapVar);
  comp.setBoundVariable('paddingLeft', pxVar);
  // Bind the rest of the padding, radius, border width, and type scale.
  // If the canonical token is a shorthand such as padding,
  // keep it in the component inventory and docs, but bind node sides
  // directly to the semantic or primitive axis variables it resolves to.

  comp.fills = [makePaintBound(bgVariable)];
  comp.strokes = [makePaintBound(borderVariable)];
  comp.setBoundVariable('strokeWeight', borderWidthVar);
  comp.strokeAlign = 'INSIDE';

  const icon = figma.createFrame();
  icon.name = 'Icon';
  icon.resizeWithoutConstraints(16, 16);
  icon.visible = false;
  comp.appendChild(icon);

  const text = figma.createText();
  text.name = 'Label';
  text.fontName = { family: 'Inter', style: 'Medium' };
  text.characters = stateLabel;
  text.setBoundVariable('fontSize', fontSizeVar);
  text.fills = [makePaintBound(fgVariable)];
  comp.appendChild(text);
}
```

### 5c. Combine into a component set

```js
const componentSet = figma.combineAsVariants(components, figma.currentPage);
componentSet.name = '<ComponentName>';
componentSet.layoutMode = 'HORIZONTAL';
componentSet.layoutWrap = 'WRAP';
componentSet.itemSpacing = 12;
componentSet.counterAxisSpacing = 12;
componentSet.primaryAxisSizingMode = 'FIXED';
componentSet.counterAxisSizingMode = 'AUTO';
componentSet.resizeWithoutConstraints(2400, 100);
componentSet.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
```

### 5d. Add component properties

Add component properties to the component set, then wire them to child nodes in each variant.

Use boolean properties for toggles such as `showIcon`, `showRequired`, `isLoading`, `disabled`, `block`.

```js
const propKey = componentSet.addComponentProperty('showIcon', 'BOOLEAN', false);
for (const variant of componentSet.children) {
  const iconNode = variant.children.find((c) => c.name === 'Icon');
  if (iconNode) iconNode.componentPropertyReferences = { visible: propKey };
}
```

Use text properties for editable content such as `children`, `label`, `placeholder`, and `loadingText`.

```js
const textPropKey = componentSet.addComponentProperty('label', 'TEXT', 'Default Text');
for (const variant of componentSet.children) {
  const textNode = variant.findOne((n) => n.type === 'TEXT' && n.name === 'Label');
  if (textNode) textNode.componentPropertyReferences = { characters: textPropKey };
}
```

Keep variant property names consistent across all variants:

- use identical property names everywhere
- use consistent casing such as `Size=sm`, not `size=sm`
- avoid conflicting property sets between variants

### 5e. Model complex components

For compound components such as NumericInput or Rating:

- create the visual assembly as one component when that best matches the code contract
- use nested auto-layout to mirror the structural model
- add boolean properties for optional subparts
- add text properties for editable content
- represent interaction and validation states as variant dimensions

## Step 6: Generate Documentation Sections

Place the component set at the top of the page, then stack documentation sections vertically below it.

Each section should use:

1. a white container frame with rounded corners and shadow
2. a colored header bar with title and subtitle
3. content rows or cards below the header

### Required sections

For simple components such as Badge:

- `Variant Showcase`
- `Use Cases`
- `Properties & Tokens`

For complex components such as Button:

- `Theme Showcase`
- `Interactive States`
- `Examples`
- `Properties & Tokens`

### Properties & Tokens section

Use a two-column layout:

- left column: component props with types and defaults
- right column: canonical source token names grouped by category

Exclude Figma-only binding implementation details from this section.

### Layout and positioning

Frames created via `figma_execute` default to `(0, 0)`. Reposition them explicitly.

Use a `currentY` accumulator pattern:

```js
let currentY = 0;
const gap = 48;

componentSet.x = 0;
componentSet.y = currentY;
currentY += componentSet.height + gap;

section1.x = 0;
section1.y = currentY;
currentY += section1.height + gap;
```

Keep these rules:

- stack all sections vertically with a 48px gap
- keep the component set at `y = 0`
- set `layoutSizingHorizontal = 'FILL'` only after appending the child into an auto-layout parent
- use white section backgrounds and consistent internal padding

## Step 7: Validate

Validation is mandatory. Use all three checks below.

### 7a. Visual validation

Use `figma_capture_screenshot` to verify:

- all instances render correctly
- text contrast remains readable
- the component set exposes the expected variants and properties

### 7b. Variables table validation

Open Dev Mode and inspect `Open variables table`.

Verify:

- the component collection exists
- category counts match the canonical source `.css` token inventory
- Figma-only binding details are excluded from the reported token totals
- internal designer-facing names remain component-scoped and readable

### 7c. Dev Mode code validation

Select representative instances in Dev Mode and inspect CSS output.

Verify exported CSS variable names against the canonical source token names from the component `.css` file.

Check at least:

- `background`
- `color`
- `border`
- `border-radius`
- `gap`
- `padding`

If a shorthand token cannot be shown as a single node binding because of a Figma limitation, validate both:

- the canonical exported CSS token, for example `--padding-button-sm`
- the underlying decomposition used for node binding, for example `spacing/50` and `spacing/200`

Do not silently accept a renamed export or invent an extra helper collection just to hide that limitation.

## Troubleshooting

### Unloaded font error

Load fonts before creating text:

```js
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
```

### Paint variable binding error

Bind fills and strokes on paint objects, not via `setBoundVariable('fills', ...)`.

```js
const paint = figma.variables.setBoundVariableForPaint(
  figma.util.solidPaint('#000000'),
  'color',
  variable,
);
comp.fills = [paint];
```

### Dynamic page access error

Use `figma.currentPage.children.find()` instead of `figma.getNodeById()`.

### Component property definition error

Add component properties to the component set, not to individual variants.

### Auto-layout fill sizing error

Append the child to its parent before setting `layoutSizingHorizontal = 'FILL'`.

### Frames overlap at `(0, 0)`

Reposition everything explicitly after creation.

### Dev Mode CSS export does not match the component `.css` file

- verify the canonical token inventory came from the component token file
- verify the component docs list canonical source tokens, not helper bindings
- if internal Figma names differ, set Web code syntax so Dev Mode exports the exact canonical CSS token names
- do not accept mismatches such as `button/bg/primary` -> `--button-bg-primary` when the source token is `--color-button-bg-primary`

### Connection drops

Ask the user to re-run the Desktop Bridge plugin.

### Timeout on large operations

Split work into multiple `figma_execute` calls:

- variables first
- component creation in batches
- layout and cleanup last
