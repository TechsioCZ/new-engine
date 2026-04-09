---
name: component-to-figma
description: "Migrate UI library components from code into the Figma component library with 1:1 visual parity, strict token inheritance, Storybook inspection, Figma validation, library integration, and Code Connect setup. Use when the user asks to move a component such as Button, Input, Badge, Rating, or a molecule from codebase to Figma, align existing Figma components to code, rebuild component tokens from CSS custom properties, or connect migrated components back to code."
---
 
# Component To Figma
 
Migrate one UI component from the codebase into the Figma design system library with strict code-first parity.
 
Use this for component-library work, not for product screens. For canvas writes, always use [$figma:figma-use](/Users/lukaschylik/.codex/plugins/cache/openai-curated/figma/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/figma-use/SKILL.md). For library structure and sequencing, also use [$figma:figma-generate-library](/Users/lukaschylik/.codex/plugins/cache/openai-curated/figma/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/figma-generate-library/SKILL.md). For the final mapping step, use [$figma:figma-code-connect-components](/Users/lukaschylik/.codex/plugins/cache/openai-curated/figma/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/figma-code-connect-components/SKILL.md).
 
## Non-Negotiable Rules
 
1. Codebase is the source of truth.
2. Match all visual component props 1:1 between code and Figma.
3. Migrate atoms before molecules. If a molecule depends on unmigrated atoms or helper components, migrate those first.
4. Never create component-specific Figma variables with raw values.
5. Component variables must always inherit from semantic or primitive variables.
6. Never duplicate tokens that already exist in the Figma library. Reuse or alias them.
7. Variable naming is mandatory: `type/component/cssProperty/variant/state`.
8. Figma pages must follow the established library shell:
   - black canvas background
   - white section cards
   - `24px` radius on section cards
   - `36px` internal padding
   - consistent vertical gaps between sections
9. Validation is mandatory. Do not declare migration done until Storybook and Figma visually match.
10. `use_figma` calls must be sequential and incremental. Never batch the whole migration into one large write.
 
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
2. Otherwise run `pnpm run storybook`.
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
 
### Step 4: Inspect Existing Figma State
 
Before creating anything:
- inspect the target Figma file
- list existing pages, components, collections, and variables
- reuse existing primitives and semantic variables when names and values already match
- detect whether the component page already exists and whether it needs update instead of recreation
 
Do not recreate tokens already present in the library.
 
### Step 5: Migrate Tokens First
 
Create or update Figma variables in this order:
1. primitives
2. semantic/core
3. component-specific
 
Component-specific variables must use this naming:
- `color/button/bg/primary/default`
- `color/button/bg/primary/hover`
- `color/input/border/error/default`
- `spacing/input/x/md/default`
- `radius/form-control/root/md/default`
 
Guidelines:
- `type` examples: `color`, `spacing`, `padding`, `gap`, `radius`, `border`, `text`, `size`, `opacity`
- `component` must use the real component name in lowercase slash style
- `cssProperty` should describe the visual role: `bg`, `fg`, `border`, `ring`, `x`, `y`, `root`, `height`, `icon-gap`
- `variant` and `state` must match code semantics
 
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
 
Use [$figma:figma-generate-library](/Users/lukaschylik/.codex/plugins/cache/openai-curated/figma/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/figma-generate-library/SKILL.md) conventions for sequencing and library hygiene.
 
### Step 9: Create Repo-Side Code Connect Files
 
After the component is visually correct in Figma:
1. create or update `<component>.figma.tsx` beside the component implementation
2. follow the pattern used by `/Users/lukaschylik/Projects/new-engine/libs/ui/src/atoms/button.figma.tsx`
3. map the real Figma node and the real visual props
4. keep prop names aligned with code and Figma
5. run local parse validation
 
### Step 10: Create Figma Code Connect Mapping
 
Use [$figma:figma-code-connect-components](/Users/lukaschylik/.codex/plugins/cache/openai-curated/figma/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/figma-code-connect-components/SKILL.md) after the Figma component is published and the account has the required Figma plan.
 
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