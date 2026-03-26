---
name: migrate-to-figma
description: Migrate a UI library component from the codebase into Figma with proper variables, component sets, and VIGo-style documentation page. Use when the user wants to create or sync a component from libs/ui into a Figma file. Triggers on "migrate X to figma", "/migrate-to-figma X", "create X component in figma from code", "sync X to figma".
---

# Migrate Component to Figma

Analyzes a UI library component (`.tsx` + `.css` tokens + `.stories.tsx`), creates Figma variables, builds a proper component set with all variants and interactive properties (booleans, text props), and generates documentation sections on the page.

## Mandatory Rule: 1:1 Token Fidelity

**This is the most important rule in the entire migration process.** Every CSS custom property used by the component MUST be migrated into Figma as a variable with the **exact same name** (converted to Figma's `/`-separated path convention). No tokens may be skipped, invented, or approximated.

### The principle

The codebase's design tokens ARE the source of truth. Figma variables must be a 1:1 mirror — same names, same hierarchy, same alias chains. If the code has `--color-button-bg-primary` aliasing `--color-button-primary` which aliases `--color-primary`, then Figma must have `button/bg/primary` → `button/color/primary` → `color/primary` with the same chain.

### Before creating ANY Figma variables or components, you MUST:

1. **Read the component's CSS file completely** (`tokens/components/atoms/_<name>.css` or `tokens/components/molecules/_<name>.css`)
2. **Read `_semantic.css`** to understand where reference-layer tokens point
3. **Build a complete token inventory** — a flat list of EVERY `--<prefix>-<component>-*` custom property in the CSS file
4. **Trace each token's alias chain** — follow `var(--...)` references until you reach a concrete value or a primitive
5. **Categorize every token** by type:
   - `COLOR` — any `--color-*` token (backgrounds, foregrounds, borders, ring, disabled states)
   - `FLOAT` — any `--spacing-*`, `--padding-*`, `--gap-*`, `--text-*`, `--radius-*`, `--border-width-*`, `--opacity-*` token
6. **Account for state variations** — hover, active, disabled, focus tokens are separate variables, not runtime modifications. Each `--color-button-bg-primary-hover` becomes its own Figma variable.
7. **Account for theme variations** — if the component has solid/light/outlined/borderless themes, each theme's tokens (bg, fg, border) for each variant must all be individual variables
8. **Verify completeness** — cross-check the inventory against the CSS file line by line. If the CSS has 80 custom properties, Figma must get 80 component-level variables (plus any prerequisite semantic/primitive variables they alias to)

### Naming convention: CSS → Figma

Convert CSS custom property names to Figma variable paths using this rule:

```
CSS:    --color-button-bg-primary-hover
Figma:  button/bg/primary-hover          (in Component/Button collection, type: COLOR)

CSS:    --spacing-button-sm
Figma:  button/spacing/sm                (in Component/Button collection, type: FLOAT)

CSS:    --radius-button-md
Figma:  button/radius/md                 (in Component/Button collection, type: FLOAT)

CSS:    --border-button-width-sm
Figma:  button/border-width/sm           (in Component/Button collection, type: FLOAT)

CSS:    --text-button-md
Figma:  button/font-size/md              (in Component/Button collection, type: FLOAT)

CSS:    --color-button-ring
Figma:  button/ring                      (in Component/Button collection, type: COLOR)
```

The pattern: strip the type prefix (`--color-`, `--spacing-`, `--radius-`, etc.), replace remaining `-` path segments with `/`, keep compound segments hyphenated.

### Token inventory template

Before proceeding to variable creation, produce this inventory (adapt columns to the component):

```
| CSS Custom Property                          | Figma Variable Path           | Type  | Alias Target                    |
|----------------------------------------------|-------------------------------|-------|---------------------------------|
| --color-button-primary                       | button/color/primary          | COLOR | → color/primary (Semantic)      |
| --color-button-bg-primary                    | button/bg/primary             | COLOR | → button/color/primary          |
| --color-button-bg-primary-hover              | button/bg/primary-hover       | COLOR | → oklch(from primary +hover)    |
| --color-button-fg-primary                    | button/fg/primary             | COLOR | → button/fg (shared)            |
| --color-button-border-primary                | button/border/primary         | COLOR | → button/color/primary          |
| --spacing-button-sm                          | button/spacing/sm             | FLOAT | → spacing/150 (Semantic)        |
| --padding-button-sm                          | button/padding-x/sm, padding-y/sm | FLOAT | → spacing/200, spacing/50   |
| --text-button-sm                             | button/font-size/sm           | FLOAT | → font/size/sm (Semantic)       |
| --radius-button-sm                           | button/radius/sm              | FLOAT | → radius/sm (Semantic)          |
| --border-button-width-sm                     | button/border-width/sm        | FLOAT | → border-width/sm (Semantic)    |
| --color-button-bg-disabled                   | button/bg/disabled            | COLOR | → color/bg/disabled (Semantic)  |
| --color-button-fg-disabled                   | button/fg/disabled            | COLOR | → color/fg/disabled (Semantic)  |
| --color-button-border-disabled               | button/border/disabled        | COLOR | → color/border/disabled (Sem.)  |
| --color-button-ring                          | button/ring                   | COLOR | → color/ring (Semantic)         |
| ...                                          | ...                           | ...   | ...                             |
```

**NEVER skip tokens.** If the CSS file has `--opacity-outlined-hover` in `:root {}`, that must also be tracked and either created as a Figma variable or resolved to a direct value during oklch approximation.

### Handling oklch / computed values

CSS tokens using `oklch(from var(...) calc(l + var(--state-hover)) c h)` cannot be directly aliased in Figma. For these:
1. Compute the approximate RGB value by evaluating the oklch expression
2. Set the Figma variable to a **direct color value** (not an alias) with a comment noting the source formula
3. Create both Light and Dark mode values — the oklch shift direction may differ

### Validation checkpoint

After creating all component variables in Figma, verify:
- [ ] Count of Figma variables matches count of CSS custom properties
- [ ] Every alias chain in Figma mirrors the `var()` chain in CSS
- [ ] No variable is named differently from its CSS counterpart (modulo the naming convention)
- [ ] All COLOR variables have both Light and Dark mode values
- [ ] All FLOAT variables have correct numeric values (mid-point of any fluid clamp)

**Do NOT proceed to building the component set (Step 5) until this checklist passes.**

## Prerequisites

- Figma Console MCP connected (`figma_get_status` returns `initialized: true`)
- Desktop Bridge plugin running in Figma
- Target Figma file open and connected

## Step 1: Locate Component Files

Find the three source files in `libs/ui/`:

```
src/atoms/<name>.tsx           OR  src/molecules/<name>.tsx
tokens/components/atoms/_<name>.css  OR  tokens/components/molecules/_<name>.css
stories/atoms/<name>.stories.tsx     OR  stories/molecules/<name>.stories.tsx
```

Read all three files completely. If any file is missing, warn the user and proceed with what's available.

## Step 2: Analyze Component

### From the `.tsx` file, extract:
- **`tv()` call**: all `variants`, `compoundVariants`, `defaultVariants`
- **Props type**: all props with their TypeScript types and defaults
- **Variant dimensions**: e.g. `variant: [primary, secondary, ...]`, `theme: [solid, light, ...]`, `size: [sm, md, lg]`
- **State-related props**: `disabled`, `isLoading`, data attributes
- **Boolean features**: icon support, block/full-width, uppercase, etc.
- **Token class usage**: which `tv()` class strings reference component tokens (e.g. `bg-button-bg-primary`) — cross-reference with the CSS file to ensure all used tokens are in your inventory

### From the `.css` file — DEEP TOKEN ANALYSIS (MANDATORY):

**This is the most critical step.** Read the entire CSS file and extract EVERY custom property. Do not skim or summarize — enumerate them all.

1. **`:root {}` block**: extract all root-level properties (e.g. `--opacity-outlined-hover`) — these are non-themed constants
2. **`@theme static {}` block**: extract every single line that defines a `--<prefix>-<component>-*` property
3. **Group by category and count**:
   - Reference layer (`--color-<comp>-<variant>`) — count: ___
   - Background colors (`--color-<comp>-bg-*`) including hover/active states — count: ___
   - Foreground colors (`--color-<comp>-fg-*`) including theme-specific — count: ___
   - Border colors (`--color-<comp>-border-*`) — count: ___
   - Disabled states (`--color-<comp>-*-disabled`) — count: ___
   - Spacing (`--spacing-<comp>-*`, `--padding-<comp>-*`, `--gap-<comp>-*`) — count: ___
   - Typography (`--text-<comp>-*`) — count: ___
   - Radius (`--radius-<comp>-*`) — count: ___
   - Border width (`--border-<comp>-width-*`) — count: ___
   - Focus/ring (`--color-<comp>-ring`) — count: ___
   - Other (`--opacity-*`, `--shadow-*`, etc.) — count: ___
4. **Total token count**: ___ (this number must match the final Figma variable count)
5. **For each token, note the alias target**: `var(--color-primary)` → Semantic collection, `oklch(...)` → needs computed value

**Output the complete token inventory table (see "Mandatory Rule" section above) before proceeding.**

### From the `.stories.tsx` file, extract:
- **Story variants**: which combinations are showcased
- **Real-world examples**: icon usage, loading states, block layout
- **ArgTypes**: control definitions showing all configurable props

## Step 3: Check Figma Connection

```js
// Use figma_get_status to verify connection
// Must show: initialized: true, transport.active: "websocket"
```

If not connected, instruct user to open Desktop Bridge plugin.

## Step 4: Create Variable Collections

### 4a. Primitives Collection (create once, reuse across components)

Skip if already exists. Contains Tailwind color palette values used by `_semantic.css`:

```js
// Check: const cols = await figma.variables.getLocalVariableCollectionsAsync();
// If 'Primitives' exists, skip this step.

const primCol = figma.variables.createVariableCollection('Primitives');
// Single mode: 'Default'
// Create COLOR variables for each Tailwind color used:
// color/blue/300, color/sky/300, color/orange/500, color/amber/400,
// color/pink/300, color/rose/400, color/emerald/500, color/emerald/300,
// color/teal/500, color/cyan/300, color/yellow/500, color/yellow/400,
// color/red/400, color/red/300, color/gray/50..950, color/slate/950,
// color/white, color/black
```

### 4b. Semantic Collection (create once, reuse across components)

Skip if already exists. Maps to `_semantic.css` with Light/Dark modes:

```js
// Colors: color/primary..danger (alias to Primitives, different per mode)
// Light variants: color/primary/light..danger/light (direct oklch-approximated values)
// Foreground: color/fg/primary, fg/reverse, fg/secondary, fg/placeholder
// Accent FG: color/primary/accent-fg..danger/fg (WCAG AAA text colors)
// Backgrounds: color/base, surface, overlay
// Disabled: color/bg/disabled, fg/disabled, border/disabled
// Borders: color/border/primary
// Fill: color/fill/base, fill/hover, fill/active
// Ring: color/ring
// Spacing: spacing/50..950 (FLOAT, mid-point of fluid clamp)
// Radius: radius/sm(4), md(8), lg(12), full(9999)
// Typography: font/size/xs..4xl (FLOAT)
// Border widths: border-width/sm(1), md(2), lg(3)
// Ring: ring/width(2), ring/offset(2)
```

### 4c. Component-Specific Collection — 1:1 Token Migration

Always create fresh for each component. Name: `Component/<ComponentName>`

```js
const compCol = figma.variables.createVariableCollection('Component/<Name>');
compCol.renameMode(compCol.modes[0].modeId, 'Light');
const darkId = compCol.addMode('Dark');
```

**Use the token inventory table from Step 2 as your checklist.** Create one Figma variable for every row in the table. Do NOT freestyle variable names — they must follow the naming convention defined in the "Mandatory Rule" section.

Create variables in this order (matching CSS file structure):

1. **Reference layer** (COLOR): `<name>/color/<variant>` → alias to `color/<variant>` in Semantic collection
   - One per `--color-<name>-<variant>` token
2. **Background colors** (COLOR): `<name>/bg/<variant>` → alias to `<name>/color/<variant>` within this collection
   - Solid: alias to reference layer
   - Hover/active: direct oklch-computed values (not alias — Figma can't do oklch math)
   - Light: alias to `color/<variant>/light` in Semantic
   - Light hover/active: direct oklch-computed values
   - Outlined: transparent for base, alpha-computed for hover/active
   - Borderless: transparent base, `color/fill/hover` and `color/fill/active` for states
3. **Foreground colors** (COLOR): `<name>/fg/<theme>-<variant>`
   - Solid fg, light fg, outlined fg, borderless fg — each per variant if distinct in CSS
4. **Border colors** (COLOR): `<name>/border/<variant>` → alias to reference layer
5. **Disabled states** (COLOR): `<name>/bg/disabled`, `<name>/fg/disabled`, `<name>/border/disabled` → alias to Semantic disabled tokens
6. **Spacing** (FLOAT): `<name>/spacing/<size>` → alias to Semantic spacing
   - Split `--padding-<name>-*` shorthand into `<name>/padding-x/<size>` and `<name>/padding-y/<size>`
7. **Typography** (FLOAT): `<name>/font-size/<size>` → alias to Semantic font/size
8. **Radius** (FLOAT): `<name>/radius/<size>` → alias to Semantic radius
9. **Border width** (FLOAT): `<name>/border-width/<size>` → alias to Semantic border-width
10. **Ring** (COLOR): `<name>/ring` → alias to `color/ring` in Semantic
11. **Root-level constants**: any `:root {}` values (e.g. `--opacity-outlined-hover`) → create as FLOAT in a shared or component collection

**After creating all variables, count them and compare to the token inventory total. They MUST match.**

### Key API patterns for variables:

```js
// Alias to another variable:
v.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: targetVar.id });

// Direct color value:
v.setValueForMode(modeId, { r: 0.5, g: 0.5, b: 0.5, a: 1 });

// Bind paint to variable (for fills/strokes):
const paint = figma.variables.setBoundVariableForPaint(
  figma.util.solidPaint('#000000'), 'color', variable
);
comp.fills = [paint];

// Bind float to variable (padding, radius, fontSize, strokeWeight, itemSpacing):
comp.setBoundVariable('paddingLeft', variable);
comp.setBoundVariable('topLeftRadius', variable);
text.setBoundVariable('fontSize', variable);
```

## Step 5: Build Component Set

### 5a. Determine variant matrix

From the `tv()` analysis, identify all dimensions:
- Example: `variant` x `theme` x `size` x `state`
- States should include: `default`, `hover`, `active`, `focus`, `disabled`, `loading` (if component supports them)

### Mandatory page pattern for atom migrations

For atoms, the migration target is not just a component set. The page must follow the top-to-bottom structure:

1. A large component set at the top of the page
2. Four documentation sections stacked below it:
   - `Theme Showcase`
   - `Interactive States`
   - `Examples`
   - `Properties & Tokens`

This is the default output pattern for atom migrations unless the user explicitly asks for a different layout.

#### Required component set layout

The component set should match this structure:

- `layoutMode = 'HORIZONTAL'`
- `layoutWrap = 'WRAP'`
- `itemSpacing = 12`
- `counterAxisSpacing = 12`
- `padding = 32`
- `fills = [{ r: 0.98, g: 0.98, b: 0.99 }]`
- `width = 2400`
- Positioned at `x = 0`, `y = 0`

#### Forbidden output

- Do not stop after creating only the component set
- Do not place documentation frames at `(0,0)`
- Do not let frames cover the component set or cover each other
- Do not create a full-page wrapper frame that visually covers content underneath

### 5b. Create individual components

```js
await figma.loadFontAsync({ family: "Inter", style: "Medium" });

for (each combination of variant dimensions) {
  const comp = figma.createComponent();
  comp.name = `Variant=${v}, Theme=${t}, Size=${s}, State=${st}`;

  // Auto-layout
  comp.layoutMode = 'HORIZONTAL';
  comp.primaryAxisAlignItems = 'CENTER';
  comp.counterAxisAlignItems = 'CENTER';
  comp.primaryAxisSizingMode = 'AUTO';
  comp.counterAxisSizingMode = 'FIXED';
  comp.resizeWithoutConstraints(100, heightForSize);

  // Bind spacing variables
  comp.setBoundVariable('itemSpacing', gapVar);
  comp.setBoundVariable('paddingLeft', pxVar);
  // ... etc for all padding, radius

  // Background fill bound to variable
  comp.fills = [makePaintBound(bgVariable)];

  // Strokes for outlined/bordered variants
  comp.strokes = [makePaintBound(borderVariable)];
  comp.setBoundVariable('strokeWeight', borderWidthVar);
  comp.strokeAlign = 'INSIDE';

  // Focus state: use strokes with strokeAlign = 'OUTSIDE'

  // Icon placeholder (hidden by default)
  const icon = figma.createFrame();
  icon.name = "Icon";
  icon.resizeWithoutConstraints(16, 16);
  icon.visible = false;
  comp.appendChild(icon);

  // Text node
  const text = figma.createText();
  text.fontName = { family: "Inter", style: "Medium" };
  text.characters = stateLabel;
  text.setBoundVariable('fontSize', fontSizeVar);
  text.fills = [makePaintBound(fgVariable)];
  comp.appendChild(text);
}
```

### 5c. Combine into component set

```js
const componentSet = figma.combineAsVariants(components, figma.currentPage);
componentSet.name = '<ComponentName>';
componentSet.layoutMode = 'HORIZONTAL';
componentSet.layoutWrap = 'WRAP';
componentSet.itemSpacing = 12;
componentSet.counterAxisSpacing = 12;
componentSet.padding* = 32;
componentSet.primaryAxisSizingMode = 'FIXED';
componentSet.counterAxisSizingMode = 'AUTO';
componentSet.resizeWithoutConstraints(2400, 100);
componentSet.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
```

### 5d. Add component properties (booleans, text, instance swap)

Figma component properties simulate real component props. Add them to the **component SET**, then wire them to child nodes in each variant.

#### Boolean properties (toggles)
Use for: `showIcon`, `showRequired`, `isLoading`, `disabled`, `block`
```js
// Add boolean prop to component SET
const propKey = componentSet.addComponentProperty('showIcon', 'BOOLEAN', false);

// Wire to visibility of a child node in each variant
for (const variant of componentSet.children) {
  const iconNode = variant.children.find(c => c.name === 'Icon');
  if (iconNode) {
    iconNode.componentPropertyReferences = { visible: propKey };
  }
}
```

#### Text properties (editable labels)
Use for: `children`, `label`, `placeholder`, `loadingText`
```js
// Add text prop — the text node's characters become editable in the properties panel
const textPropKey = componentSet.addComponentProperty('label', 'TEXT', 'Default Text');

// Wire to a text node in each variant
for (const variant of componentSet.children) {
  const textNode = variant.findOne(n => n.type === 'TEXT' && n.name === 'Label');
  if (textNode) {
    textNode.componentPropertyReferences = { characters: textPropKey };
  }
}
```

#### Variant properties
These are automatic from the component naming (`Size=sm, State=default`). Ensure:
- ALL variants have the EXACT same set of property names
- Use consistent casing: `Size=sm` not `size=sm`
- Don't mix property counts between variants (causes "conflicting properties" error)

### 5e. Simulating complex component behavior

For compound components (NumericInput, Rating, etc.):
- Create the visual assembly as a single component (input + buttons together)
- Use nested auto-layout to replicate the DOM structure
- Add boolean properties for optional sub-parts (e.g., `showLabel`, `showTriggers`)
- Add text properties for editable content areas
- Represent states (hover, focus, disabled, invalid) as variant dimensions

## Step 6: Generate Documentation Sections

Each component page has the **component set at the top**, followed by documentation sections stacked vertically below it. Each section is a white Frame with rounded corners, a colored header bar, and content rows.

### Section structure

Each section is built as:
1. **Container frame** — white bg, `cornerRadius: 8`, `layoutMode: 'VERTICAL'`, drop shadow, `counterAxisSizingMode: 'FIXED'` at 1200px width
2. **Header frame** — colored bar (56px tall), `topLeftRadius: 8`, `topRightRadius: 8`, contains bold title + subtitle text in white
3. **Content rows** — horizontal auto-layout frames with label + component instances, separated by 1px dividers

### Required sections (adapt to component complexity):

**For simple components** (single variant dimension like Badge):
| Section | Header Color (RGB) | Content |
|---------|-------------------|---------|
| Variant Showcase | orange `{0.93, 0.55, 0.15}` | Rows grouping variants by category (semantic, special, etc.) |
| Use Cases | green `{0.16, 0.65, 0.38}` | Real-world examples with meaningful labels |
| Properties & Tokens | teal `{0.13, 0.59, 0.56}` | Two-column: Component Props + CSS Variables |

**For complex components** (multiple dimensions like Button):
| Section | Header Color (RGB) | Content |
|---------|-------------------|---------|
| Theme Showcase | orange `{0.93, 0.55, 0.15}` | Grid per theme: rows=variants, cols=sizes |
| Interactive States | pink `{0.85, 0.25, 0.45}` | State progression: default→hover→active→focus→disabled→loading |
| Examples | green `{0.16, 0.65, 0.38}` | Sizes, icons, loading, block layout |
| Properties & Tokens | teal `{0.13, 0.59, 0.56}` | Two-column: Component Props + CSS Variables |

### Button documentation blueprint

When migrating `Button`, use this exact section structure:

#### Theme Showcase

- Theme groups in this order:
  - `Solid`
  - `Light`
  - `Outlined`
  - `Borderless`
- Under each theme group, add rows in this order:
  - `Primary`
  - `Secondary`
  - `Tertiary`
  - `Warning`
  - `Danger`
- Each row shows the `default` state in `sm`, `md`, and `lg`

#### Interactive States

- Add a header row with these columns:
  - `Default`
  - `Hover`
  - `Active`
  - `Focus`
  - `Disabled`
  - `Loading`
- Include these rows:
  - `primary/solid`
  - `primary/light`
  - `primary/outlined`
  - `primary/borderless`
  - `secondary/solid`
  - `danger/solid`
  - `warning/outlined`
- Use `md` size for the state showcase rows

#### Examples

- Include these rows:
  - `SM / MD / LG` for primary solid
  - `All themes` for primary at `md`
  - `Themes` for danger at `md`

#### Properties & Tokens

- Use a two-card body layout
- Left card: props, types, defaults
- Right card: token counts, token categories, and collection names

### Helper: Create section with header

```js
// Create container FIRST, then append header inside it
const container = figma.createFrame();
container.name = 'Section Name';
container.layoutMode = 'VERTICAL';
container.primaryAxisSizingMode = 'AUTO';
container.counterAxisSizingMode = 'FIXED';
container.resizeWithoutConstraints(1200, 100);
container.itemSpacing = 0;
container.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
container.cornerRadius = 8;
container.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.08 },
  offset: { x: 0, y: 2 }, radius: 8, visible: true, blendMode: 'NORMAL' }];
figma.currentPage.appendChild(container);

// Header (append to container, THEN set FILL)
const header = figma.createFrame();
header.name = 'Header';
header.layoutMode = 'HORIZONTAL';
header.counterAxisAlignItems = 'CENTER';
header.counterAxisSizingMode = 'FIXED';
header.resizeWithoutConstraints(1200, 56);
header.paddingLeft = 24; header.paddingRight = 24;
header.topLeftRadius = 8; header.topRightRadius = 8;
header.fills = [{ type: 'SOLID', color: headerColor }];
header.itemSpacing = 16;
container.appendChild(header);
header.layoutSizingHorizontal = 'FILL'; // AFTER appendChild!

// Title + subtitle text nodes inside header...
```

### Helper: Create content row with label + instances

```js
function createRow(label, variantNames, parent, componentSet) {
  const row = figma.createFrame();
  row.name = label;
  row.layoutMode = 'HORIZONTAL';
  row.counterAxisSizingMode = 'AUTO';
  row.counterAxisAlignItems = 'CENTER';
  row.itemSpacing = 12;
  row.paddingLeft = 24; row.paddingRight = 24;
  row.paddingTop = 16; row.paddingBottom = 16;
  row.fills = [];
  parent.appendChild(row);
  row.layoutSizingHorizontal = 'FILL'; // AFTER appendChild

  // Label
  const labelText = figma.createText();
  labelText.fontName = { family: "Inter", style: "Medium" };
  labelText.characters = label;
  labelText.fontSize = 13;
  labelText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
  row.appendChild(labelText);
  labelText.layoutSizingHorizontal = 'FIXED';
  labelText.resizeWithoutConstraints(140, labelText.height);

  // Instances
  for (const vName of variantNames) {
    const variant = componentSet.children.find(c => c.name.includes(vName));
    if (variant) row.appendChild(variant.createInstance());
  }
  return row;
}
```

### Properties & Tokens section

Always a two-column layout with gray cards:
- **Left column**: Component Props — list all props with types and defaults
- **Right column**: CSS Variables — list all token names grouped by category (bg, fg, border, spacing, etc.)

### Layout & Positioning (CRITICAL)

**Frames created via `figma_execute` default to position (0,0) and WILL overlap each other and the component set.** This happens every time — you MUST explicitly reposition after creation.

#### Approach 1: Position during creation (preferred)
Track `currentY` and set each frame's position immediately after adding to the page:
```js
let currentY = 0;
const gap = 48;

// Component set at top
componentSet.x = 0;
componentSet.y = currentY;
currentY += componentSet.height + gap;

// Each section below
section1.x = 0;
section1.y = currentY;
currentY += section1.height + gap;

section2.x = 0;
section2.y = currentY;
currentY += section2.height + gap;
// ... continue for all sections
```

#### Approach 2: Cleanup pass after all sections are created
If intermediate frames get orphaned (from failed attempts), do a final cleanup:
```js
const children = [...figma.currentPage.children];
// Identify the good nodes you want to keep (by name + type + expected height)
const toKeep = [];
for (const child of children) {
  if (isExpectedNode(child)) {
    toKeep.push(child);
  } else {
    child.remove(); // Remove orphaned/duplicate frames
  }
}
// Reposition toKeep nodes vertically
let y = 0;
for (const node of toKeep) {
  node.x = 0;
  node.y = y;
  y += node.height + 48;
}
```

#### Key rules:
- All sections stacked vertically with 48px gap between them
- Component set always at y=0
- `layoutSizingHorizontal = 'FILL'` can ONLY be set AFTER the frame is appended to an auto-layout parent — setting it before throws an error
- 2-column grid for theme showcases (solid+light side by side, outlined+borderless below)
- White section backgrounds with padding
- Consistent 24px padding inside section content areas
- The final page must read top-to-bottom with no covered content
- Always calculate the next section's `y` from the previous node's actual height
- If any section overlaps another node, the migration is incomplete and must be fixed before moving to the next component

## Step 7: Visual Comparison — Storybook vs Figma (MANDATORY)

After building the component in Figma, run a side-by-side visual validation against the real rendered component in Storybook. This is an **iterative loop** — keep fixing Figma until it matches 1:1.

### 7a. Launch Storybook

```bash
cd /Users/lukaschylik/Projects/new-engine/libs/ui && pnpm run storybook
```

Storybook runs on `http://localhost:6006` (default). Wait for it to be ready.

### 7b. Open the component in Storybook via Puppeteer MCP

Use the Puppeteer MCP server (`@modelcontextprotocol/server-puppeteer`, configured globally in `~/.claude/mcp.json`) to navigate to the migrated component's story:

1. **Navigate** to Storybook: `puppeteer_navigate` → `http://localhost:6006`
2. **Find the component** in the sidebar — navigate directly to the component's story iframe URL for clean screenshots:
   ```
   http://localhost:6006/iframe.html?id=<category>-<component>--<story>&viewMode=story
   ```
   For atoms: `http://localhost:6006/iframe.html?id=atoms-button--playground&viewMode=story`
   For molecules: `http://localhost:6006/iframe.html?id=molecules-combobox--playground&viewMode=story`
3. **Take a screenshot** of the Playground story with default props: `puppeteer_screenshot`
4. **Switch to the Variants story** (if it exists) and screenshot each variant combination
5. **Extract computed styles** for precise color comparison:
   ```js
   // Use puppeteer_evaluate to get exact computed token values
   puppeteer_evaluate({
     script: `
       const el = document.querySelector('[data-variant="primary"]');
       const styles = getComputedStyle(el);
       JSON.stringify({
         bg: styles.backgroundColor,
         color: styles.color,
         padding: styles.padding,
         borderRadius: styles.borderRadius,
         fontSize: styles.fontSize,
         borderColor: styles.borderColor,
         borderWidth: styles.borderWidth
       })
     `
   })
   ```
   This gives you exact RGB values to compare against Figma variables — no guessing from screenshots.

### 7c. Screenshot the Figma component

Use Figma MCP to capture the component set and documentation sections:
- `get_screenshot` of the component set frame
- `get_screenshot` of each documentation section (Theme Showcase, Interactive States, etc.)

### 7d. Compare — Iteration Loop

For each variant/theme/size/state combination, compare Storybook vs Figma and check:

| Check | What to compare | How to verify |
|-------|----------------|---------------|
| **Colors** | Background fill matches CSS token value | Compare hex/rgb visually between screenshots |
| **Typography** | Font size, weight, color match | Check text rendering in both |
| **Spacing** | Padding, gap, margins match | Compare component dimensions |
| **Border radius** | Corner rounding matches | Visual comparison of edges |
| **Border width & color** | Stroke matches outlined/bordered variants | Check stroke rendering |
| **States** | Hover, active, focus, disabled look correct | In Storybook: use `puppeteer_click` / `puppeteer_evaluate` to trigger states. In Figma: check State variant dimensions |
| **Disabled state** | Opacity, colors, cursor match | Compare disabled variants |
| **Focus ring** | Ring color, width, offset match | Trigger focus in Storybook, compare with Focus state variant in Figma |

### 7e. Iterate until 1:1 match

For each discrepancy found:

1. **Identify the root cause** — is it a missing variable, wrong alias, wrong computed color, or missing variant?
2. **Fix in Figma** — update the variable value, add missing variables, or adjust component properties
3. **Re-screenshot both** — verify the fix resolved the discrepancy
4. **Log the fix** — keep a running list of corrections made

**Common discrepancies and fixes:**

| Discrepancy | Likely cause | Fix |
|------------|-------------|-----|
| Background color is off | oklch approximation drift | Use `puppeteer_evaluate` to extract exact `getComputedStyle` RGB values, then update Figma variable to match |
| Hover state looks wrong | Missing hover state variable | Add `<name>/bg/<variant>-hover` variable with correct computed value |
| Text color doesn't match | Wrong fg token alias | Fix the alias chain: check which `--color-<name>-fg-*` token the `tv()` class resolves to |
| Spacing/padding is off | Wrong numeric value or wrong alias target | Check `--spacing-*` / `--padding-*` values in `_semantic.css`, update FLOAT variable |
| Missing variant entirely | Variant not included in component set | Add the missing variant component and combine into set |
| Border not visible | Missing stroke or wrong strokeWeight | Bind stroke paint and strokeWeight variable |
| Light theme colors wrong | Light mode values not set | Set Light mode values on the variable (Figma defaults to first mode) |

### 7f. Verify completeness against Storybook stories

Walk through ALL stories for the component (not just Playground):

1. **Playground** — default state matches
2. **Variants** — all variant values render correctly
3. **Sizes** — all size tokens produce correct dimensions
4. **States** — disabled, loading, focus, hover, active all match
5. **Component-specific stories** — icons, block layout, loading text, etc.

For each story, use Puppeteer MCP to:
- `puppeteer_navigate` to the story iframe URL
- `puppeteer_screenshot` to capture current state
- `puppeteer_click` / `puppeteer_evaluate` to trigger hover/focus/active states
- `puppeteer_evaluate` with `getComputedStyle` to extract exact token values
- Compare each capture and extracted values against the corresponding Figma variant

**The visual comparison loop is complete when:**
- [ ] Every variant/theme/size combination in Storybook has a matching Figma variant
- [ ] Colors match within acceptable tolerance (no visible difference at 1x zoom)
- [ ] Spacing and sizing match (padding, height, gap are visually identical)
- [ ] Interactive states (hover, active, focus, disabled) all have correct Figma representations
- [ ] No Storybook story shows functionality that is missing from the Figma component

### 7g. Token count re-validation

After all visual fixes, re-count Figma variables and compare to the CSS token inventory from Step 2. If fixes added new variables, update the inventory. The count must still match.

## Step 8: Proceed to Code Connect

Once the visual comparison passes (1:1 match between Storybook and Figma), the component migration is complete. The next step is to create the Code Connect mapping.

**Invoke the `code-connect` skill** (`/code-connect <ComponentName>`) to generate the `.figma.tsx` file that links the Figma component properties back to the React component's props. See: `libs/ui/skills/code-connect/SKILL.md`

This completes the full automation pipeline:
1. **write-to-figma** — Figma MCP infrastructure setup
2. **migrate-to-figma** (this skill) — component creation + visual validation
3. **code-connect** — property mapping for Dev Mode

## Troubleshooting

### "Cannot write to node with unloaded font"
Always load fonts before creating text:
```js
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
```

### "fills and strokes variable bindings must be set on paints directly"
Use `figma.variables.setBoundVariableForPaint()` — NOT `setBoundVariable('fills', ...)`:
```js
// WRONG: comp.setBoundVariable('fills', 0, 'color', variable);
// RIGHT:
const paint = figma.variables.setBoundVariableForPaint(
  figma.util.solidPaint('#000000'), 'color', variable
);
comp.fills = [paint];
```

### "Cannot call with documentAccess: dynamic-page"
Use `figma.currentPage.children.find()` instead of `figma.getNodeById()`.

### "Can only set component property definitions on a product component"
Boolean properties must be added to the **component set**, not individual variant components:
```js
// WRONG: comp.addComponentProperty(...)
// RIGHT: componentSet.addComponentProperty(...)
```

### "FILL can only be set on children of auto-layout frames"
You must append a child to its auto-layout parent BEFORE setting `layoutSizingHorizontal = 'FILL'`:
```js
// WRONG:
const row = figma.createFrame();
row.layoutSizingHorizontal = 'FILL'; // ERROR - not in a parent yet
parent.appendChild(row);

// RIGHT:
const row = figma.createFrame();
parent.appendChild(row); // Append first
row.layoutSizingHorizontal = 'FILL'; // Now it works
```

### Frames overlap at (0,0) after creation
All new frames default to position (0,0). Always reposition explicitly after creation using a `currentY` accumulator pattern. See "Layout & Positioning" section above.

### Connection drops
If `figma_execute` fails with connection error, ask user to re-run the Desktop Bridge plugin in Figma.

### Timeout on large operations
Split into multiple `figma_execute` calls. Max timeout is 30000ms.
Create variables in one call, components in batches, layout in a final call.
