---
name: component-to-figma
description: "Migrate UI library components from code into the Figma component library with 1:1 visual parity, strict token inheritance, Storybook inspection, Figma validation, library integration, and Code Connect setup. Use when the user asks to move a component such as Button, Input, Badge, Rating, or a molecule from codebase to Figma, align existing Figma components to code, rebuild component tokens from CSS custom properties, or connect migrated components back to code."
---
 
# Component To Figma
 
Migrate one UI component from the codebase into the Figma design system library with strict code-first parity.
 
Use this for component-library work, not for product screens. For canvas writes, always use `$figma:figma-use`. For library structure and sequencing, also use `$figma:figma-generate-library`. For the final mapping step, use `$figma:figma-code-connect-components`.
 
## Non-Negotiable Rules
 
1. Codebase is the source of truth.
2. Match all visual component props 1:1 between code and Figma.
3. Migrate atoms before molecules. If a molecule depends on unmigrated atoms or helper components, migrate those first.
4. Never create component-specific Figma variables with raw values.
5. Component variables must always inherit from semantic or primitive variables.
6. Never duplicate tokens that already exist in the Figma library. Reuse or alias them.
7. **Three-tier token architecture is mandatory.** Every Figma variable must live in exactly one tier and inherit strictly downward:
   - **Core (primitives)** — raw values only. Short, flat names. No "Primitive", "Space", "Default" padding in names.
   - **Semantic** — aliases to core. Gives design meaning to raw values.
   - **Component-specific** — aliases to semantic (or core when no semantic exists). Never holds raw values.
8. **Figma modes are strictly light and dark.** No mobile, tablet, desktop, mode-1, or any pseudo-responsive modes. Responsive sizing is handled through the core→semantic→component inheritance chain, not through Figma variable modes. If existing Figma variables contain invalid modes (e.g., mobile, tablet, desktop, mode-1), **delete those modes and refactor the variables into the correct collection** before continuing.
9. **Figma variable collections** map 1:1 to tiers:
   - **Core** — one collection named `core` for all primitives.
   - **Semantic** — one collection named `semantic` for all semantic aliases.
   - **Component-specific** — one collection per component, named after the component (e.g., `button`, `badge`, `input`, `rating`). Each component gets its own collection so tokens stay scoped and manageable.
10. **Variable naming rules** differ by tier and token type:
   - **Core names** are maximally short: `size/8`, `size/16`, `color/red/500`, `radius/4`, `opacity/50`.
   - **Semantic names** add design meaning: `size/sm`, `size/md`, `color/primary/base`, `radius/sm`.
   - **Component color tokens** use up to 5 levels: `type/component/cssProperty/variant/state` — only for components with color-variant props AND interactive states (button, badge). Components without color variants drop the variant level. Components without states drop the state level.
   - **Component non-color tokens** use simplified flat naming: `type/component/size` — no redundant variant/state segments.
   - **Never use "default"** for the initial state. Use **"base"** (shorter, clearer). Example: `color/button/bg/primary/base`, not `…/default`.
11. Figma pages must follow the established library shell:
    - black canvas background
    - white section cards
    - `24px` radius on section cards
    - `36px` internal padding
    - consistent vertical gaps between sections
12. Validation is mandatory. Do not declare migration done until Storybook and Figma visually match.
13. `use_figma` calls must be sequential and incremental. Never batch the whole migration into one large write.
 
## What Counts As A Visual Prop
 
Migrate every prop whose value can change:
- size, variant, theme, state
- disabled, readonly, required, loading
- direction, alignment, count, allowHalf
- label text, helper text, status text, showIcon, icon position
- any prop that changes spacing, radius, border, foreground, background, opacity, layout, or visible content
 
Do not expose code-only props in Figma if they have no visual effect.
 
## Required Workflow
 
### Step 1: Resolve The Target Component
 
Find the requested component in the codebase first.
 
Search:
- `src/atoms`
- `src/molecules`
- component token CSS in `src/tokens/components`
- related stories in `stories/atoms` or `stories/molecules`
 
Read:
- the component `.tsx`
- its component token CSS
- any shared token CSS it inherits from
- helper atoms/molecules it composes
- its Storybook stories
 
Build a dependency map before touching Figma.
 
### Step 2: Inspect The Full Token Chain
 
Extract all relevant CSS custom properties from:
- the component token file
- shared token files
- semantic tokens
- primitives used upstream
 
Map the inheritance chain explicitly:
- primitive -> semantic/core -> component-specific
 
If the code uses a calculated color or derived value:
1. Inspect the rendered Storybook component in the browser.
2. Read the final computed value from the DOM/CSS.
3. Backfill the missing primitive or semantic variable first.
4. Alias the component variable to that upper-level variable.
 
Never stop at the computed raw value. The final Figma component token still must inherit from an upper layer.
 
### Step 3: Prepare Browser Inspection
 
Use Storybook to inspect the live component before building or fixing Figma.
 
Preferred flow:
1. If Storybook is already running, use it.
2. Otherwise run `bunx nx run ui:storybook`.
3. Open the relevant Storybook URL for the component.
4. Use Chrome DevTools MCP to inspect the rendered HTML and final CSS.
 
If Chrome DevTools MCP is missing in the current environment, install or configure it first before continuing.
 
Inspect at minimum:
- height and width behavior
- spacing and padding
- border radius
- border width
- font size and line height
- default, hover, focus, active, disabled, validation, loading, readonly states
- icon spacing and alignment
- label/helper/status alignment for compound form controls
 
Take screenshots when useful, but rely on computed CSS for exact values.
 
### Step 4: Inspect And Clean Existing Figma State

Before creating anything:
- inspect the target Figma file
- list existing pages, components, collections, modes, and variables
- reuse existing primitives and semantic variables when names and values already match
- detect whether the component page already exists and whether it needs update instead of recreation

**Mode and collection audit** (mandatory):
1. List all variable collections and their modes.
2. If any collection contains modes other than light/dark (e.g., mobile, tablet, desktop, mode-1), those modes are invalid.
3. Delete invalid modes.
4. If variables from invalid modes hold unique values, refactor them into the correct tier collection with proper naming before deleting the mode.
5. Ensure collections match the required structure: `core`, `semantic`, and one collection per component.
6. If a single catch-all collection exists with all variables mixed together, split it into the correct per-tier/per-component collections.

Do not recreate tokens already present in the library.
 
### Step 5: Migrate Tokens First

Create or update Figma variables strictly in tier order: core first, then semantic, then component-specific.

**Collection structure**:
- `core` collection — all primitives (single mode for non-color, light+dark for color)
- `semantic` collection — all semantic aliases (single mode for non-color, light+dark for color)
- `button` / `badge` / `input` / etc. — one collection per component for its component-specific variables

#### Tier 1: Core (Primitives)

Core variables hold **raw values only**. Names must be maximally short — strip all redundant words like "Primitive", "Space", "Default".

**Naming pattern**: `type/value`

Examples — sizing and spacing:
- `--spacingPrimitiveSpace50Default` => `size/3` (0.1875rem = 3px)
- `--spacingPrimitiveSpace100Default` => `size/5` (0.3125rem = 5px)
- `--spacingPrimitiveSpace200Default` => `size/15` (0.9375rem = 15px)
- Use pixel-based scale numbers: `size/4`, `size/8`, `size/12`, `size/16`, `size/24`, `size/32`, `size/48`, `size/64`

Examples — typography:
- `--textPrimitiveSizeSmDefault` => `text/sm`
- `--textPrimitiveSizeBaseDefault` => `text/base`
- `--textPrimitiveSizeLgDefault` => `text/lg`
- `--textPrimitiveSizeXlDefault` => `text/xl`

Examples — color:
- `color/red/500`, `color/red/600`, `color/blue/400`
- `color/neutral/100`, `color/neutral/900`
- `color/white`, `color/black`

Examples — other:
- `radius/4`, `radius/8`, `radius/16`, `radius/full`
- `opacity/50`, `opacity/100`
- `border-width/1`, `border-width/2`
- `font-weight/400`, `font-weight/500`, `font-weight/700`

Core variables use **light and dark modes only** for color values. Non-color core variables have a single mode.

#### Tier 2: Semantic

Semantic variables **alias core variables**. They never hold raw values. They give design meaning to the raw scale.

**Naming pattern**: `type/role` or `type/role/state`

Examples — sizing:
- `size/sm` => aliases `size/8`
- `size/md` => aliases `size/16`
- `size/lg` => aliases `size/32`

Examples — spacing:
- `spacing/sm` => aliases `size/8`
- `spacing/md` => aliases `size/16`
- `spacing/lg` => aliases `size/24`

Examples — typography:
- `text/sm` => aliases core `text/sm`
- `text/md` => aliases core `text/base`
- `text/lg` => aliases core `text/lg`

Examples — color:
- `color/primary/base` => aliases `color/red/600`
- `color/primary/hover` => aliases `color/red/700`
- `color/secondary/base` => aliases `color/blue/500`
- `color/danger/base` => aliases `color/red/500`
- `color/fg/base` => aliases `color/neutral/900`
- `color/fg/muted` => aliases `color/neutral/500`
- `color/bg/base` => aliases `color/white`
- `color/border/base` => aliases `color/neutral/200`

Examples — radius:
- `radius/sm` => aliases `radius/4`
- `radius/md` => aliases `radius/8`
- `radius/lg` => aliases `radius/16`
- `radius/full` => aliases `radius/full`

Semantic color variables use **light and dark modes** (values change per theme by pointing to different core aliases). Non-color semantic variables have a single mode.

#### Tier 3: Component-Specific

Component variables **alias semantic variables** (or core when no suitable semantic exists). Never raw values.

Component tokens follow two naming tracks:

**Color tokens** — up to 5 levels for interactive components:

Pattern: `color/component/cssProperty/variant/state`

Button (has color variants + states):
- `color/button/bg/primary/base` => aliases `color/primary/base`
- `color/button/bg/primary/hover` => aliases `color/primary/hover`
- `color/button/bg/primary/disabled` => aliases `color/neutral/200`
- `color/button/fg/secondary/base` => aliases `color/secondary/base`

Badge (has color variants + states):
- `color/badge/bg/success/base` => aliases `color/success/base`
- `color/badge/fg/error/base` => aliases `color/danger/base`

Input (no color variant, has states — 4 levels):
- `color/input/border/base` => aliases `color/border/base`
- `color/input/border/hover` => aliases `color/border/hover`
- `color/input/border/error` => aliases `color/danger/base`
- `color/input/bg/disabled` => aliases `color/bg/muted`

Components without color-variant properties omit the variant level.
Components without interactive states omit the state level.
Solve depth case-by-case per component.

**Non-color tokens** — simplified flat naming:

Pattern: `type/component/size` or `type/component` (when size-independent)

**Critical rules for non-color tokens:**
- **Only add a state segment when the token value actually changes between states.** Padding, radius, spacing, border-width, font-size, and font-weight are identical across hover/active/disabled/focus — so they have no state axis and no state suffix at all. Drop `/base`, `/default`, or any other state segment when the value is state-invariant.
- **Never include `root`, `gap`, `x`, `y`, or other implementation details** in the token name. The CSS property type prefix (`radius/`, `spacing/`, `padding/`) already describes the role. Drop all intermediate segments that echo the CSS variable's internal anatomy.
- Non-color tokens use at most **3 levels**: `type/component` or `type/component/size`.

From code CSS custom properties:

**Size / text / font-weight**:
- `--text-badge-size-sm` => `text/badge/sm` => aliases `text/sm`
- `--text-badge-size-md` => `text/badge/md` => aliases `text/md`
- `--font-weight-badge-weight-sm` => `font-weight/badge/sm` => aliases `font-weight/500`
- `--text-input-size-sm` => `text/input/sm` => aliases `text/sm`

**Spacing / gap**:
- `--spacing-button-sm` (used as `gap`) => `spacing/button/sm` => aliases `spacing/sm`
- `--spacing-button-md` => `spacing/button/md` => aliases `spacing/md`
- No `gap` segment in the name. `spacing/button/sm` is the gap for button-sm.

**Padding**:
- `--padding-badge-all-sm` => `padding/badge/sm` => aliases `spacing/sm`
- `--padding-button-sm` (shorthand x+y) => `padding/button/sm` => aliases `spacing/sm`
- When code has separate `--padding-button-x-sm` + `--padding-button-y-sm`, still create **one** Figma token `padding/button/sm` pointing to the dominant or semantic equivalent. If x and y differ significantly, create `padding/button/x/sm` and `padding/button/y/sm` — but even then, drop any `/base` or `/default` suffix.

**Radius**:
- `--radius-button-sm` => `radius/button/sm` => aliases `radius/sm`. **Never** add `root` — the component only has one radius target.
- `--radius-input-sm` => `radius/input/sm` => aliases `radius/sm`
- `--radius-badge` => `radius/badge` => aliases `radius/md`
- When the component uses the same radius across all sizes: drop the size segment (`radius/badge` not `radius/badge/md`).

**Border-width** (`type/component`):
- `--border-width-badge-root` => `border-width/badge` => aliases `border-width/1`
- `--border-width-input` => `border-width/input` => aliases `border-width/1`

When a non-color token has one value across all sizes, drop the size segment.
When it varies by size, keep `type/component/size`.

#### Naming Guidelines Summary

- **Core**: `type/value` — e.g., `size/8`, `color/red/500`, `radius/4`, `font-weight/700`
- **Semantic**: `type/role` — e.g., `size/sm`, `color/primary/base`, `radius/md`
- **Component color**: `color/component/cssProperty/variant/state` — depth varies per component
- **Component non-color**: `type/component/size` — flat, no redundant segments (`root`, `gap`, `x`, `y` are forbidden), no state suffix because these values don't change between states
- **State suffix rule — add a state segment only when the value varies by state:**
  - Color tokens with multiple states: use **"base"** for the resting state, never "default" (e.g., `color/button/bg/primary/base`, `color/button/bg/primary/hover`)
  - Tokens that are state-invariant (padding, radius, spacing, border-width, text size, font-weight): **no state suffix at all** — not "base", not "default". The name ends at the size or role segment (e.g., `radius/button/sm`, `padding/button/sm`, `spacing/button/sm`).
- **Modes**: light and dark only, applied to color variables. No responsive modes.
- **Inheritance is strict**: component => semantic => core. No skipping tiers except when no semantic equivalent exists.

Set scopes correctly. Never leave component variables overly broad.
 
### Step 6: Build Or Update The Component In Figma
 
Create or update the dedicated component page in the library.
 
Page structure should match the existing library pattern:
1. top component set or showcase block
2. size/variant/state showcase sections
3. properties and tokens section
4. optional examples or usage sections
 
For atoms:
- create the component set directly
 
For molecules:
- compose the page from already-migrated atoms
- migrate missing child atoms first if needed
- keep component property names aligned with code
 
Expose Figma properties with the same names as code whenever the prop has visual impact.
 
### Step 7: Validate Against Storybook
 
Compare Figma against the live Storybook component until it matches.
 
Check:
- exact size behavior
- exact visual states
- radius and border thickness
- text alignment and icon alignment
- disabled and readonly treatment
- validation states
- spacing around nested labels, helper text, and status text
 
If Figma differs from Storybook:
1. inspect computed CSS again
2. inspect variable bindings again
3. fix the token chain or component layout
4. revalidate
 
Do not proceed to library integration until the component is visually aligned.
 
### Step 8: Add The Component To The Figma Library
 
After validation:
- place the component page in the correct atom or molecule section
- keep page naming consistent with the library taxonomy
- update page order if needed
- keep the same shell styling and spacing rhythm as the existing component pages
 
Use `$figma:figma-generate-library` conventions for sequencing and library hygiene.
 
### Step 9: Create Repo-Side Code Connect Files
 
After the component is visually correct in Figma:
1. create or update `<component>.figma.tsx` beside the component implementation
2. follow the pattern used by `libs/ui/src/atoms/button.figma.tsx`
3. map the real Figma node and the real visual props
4. keep prop names aligned with code and Figma
5. run local parse validation
 
### Step 10: Create Figma Code Connect Mapping
 
Use `$figma:figma-code-connect-components` after the Figma component is published and the account has the required Figma plan.
 
If Code Connect is blocked by plan or permissions:
- still create the local `.figma.tsx` file
- validate locally
- report the publish blocker explicitly
 
## Migration Checklist
 
Do not mark the work complete unless all items below are true:
 
- component source files were fully inspected
- all inherited token sources were traced
- all visual props were mapped 1:1 into Figma
- component-specific Figma tokens only alias semantic or primitive variables
- no duplicate existing Figma tokens were created
- Storybook visual states were inspected in browser devtools
- Figma page shell matches the library pattern
- Figma component visually matches Storybook
- component was added to the library section
- local `.figma.tsx` file was created or updated
- Code Connect mapping was created, or the blocker was documented
 
## Output Format
 
When the migration is done, send a short user summary in this format:
 
`Component <Name> was migrated to the Figma library 🚀`
 
Then add a short summary covering:
- what component or dependency pages were created or updated
- what token collections or aliases were added
- whether Storybook-to-Figma validation passed
- whether Code Connect was created, locally validated, or blocked by permissions
 
## Failure Handling
 
Stop and report clearly when:
- the code and Figma conflict and the source of truth is unclear
- the component depends on child components that cannot yet be mapped correctly
- Storybook is unavailable and there is no safe fallback for computed values
- the Figma account lacks file access or Code Connect permissions
 
In those cases, report the exact blocker and the next required action.