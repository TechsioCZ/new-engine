CLAUDE.MD This file provides guidance to Claude Code for the `frontend-demo` Next.js e-commerce app.

## 1. Quick Start & Assumptions

**IMPORTANT: Always assume the following are already running:**

- `frontend-demo` dev server on `http://localhost:3000` (started with `pnpm dev` in `apps/frontend-demo`).
- `@libs/ui` Storybook (started with `pnpm storybook` in `libs/ui`). Do not suggest starting these unless specifically asked or if a problem indicates they might not be running.

**Core Technologies:**

- Next.js 15 (App Router, static export)
- Tailwind CSS v4 (with custom design tokens)
- Zag.js (for complex UI components in `@libs/ui`)
- `tailwind-variants` (for component styling via `tv()`)
- pnpm for package management
- Biome for formatting/linting
- MCP Quillopy & Context7 for documentation research

## 2. Core Principles & Architecture

- **Atomic Design**: Adhere strictly to Atoms -> Molecules -> Organisms -> Templates -> Pages.
- **Component First**: **YOU MUST** thoroughly check `libs/ui/src` and `apps/frontend-demo/src/components` for existing reusable components before creating anything new.
- **Documentation Research**: Use **MCP Quillopy** and **Context7** to study relevant documentation (Tailwind CSS, `tailwind-variants`, Zag.js) when implementing or using components and styling.

## 3. Development Workflows

### 3.1. Workflow: Creating a New Component (Specific to `frontend-demo`)

_(Use this when a component is specific to `frontend-demo` and will NOT be added to `@libs/ui`)_

1. **Verify Necessity & Design**:

   - Confirm the component (or a suitable alternative) does NOT exist in `@libs/ui` or `apps/frontend-demo/src/components`.
   - Determine its place in the Atomic Design hierarchy.

2. **File Creation**:

   - Component: `apps/frontend-demo/src/components/[atoms|molecules|organisms]/component-name.tsx`.
   - CSS Tokens: `apps/frontend-demo/src/tokens/components/[atoms|molecules|organisms]/_component-name.css`.

3. **Component Implementation (`component-name.tsx`)**:

   - Define props with TypeScript interfaces.
   - Implement logic using functional components and hooks.
   - Style using `tv()` with `slots` only if file need more variants/sizes (see "Component  
     Styling with `tv()`" below).
   - Import its CSS token file (e.g., `import './_component-name.css';`).

4. **CSS Token Definition (`_component-name.css`)**:

   - Import global semantic tokens (e.g., `@import "../../_semantic.css";`).
   - Define component-specific CSS variables. **Primarily, these variables SHOULD reference variables from `_semantic.css`** (e.g., `--color-component-xyz-bg: var(--color-primary);`).
   - Adhere strictly to "CSS Token Guidelines" and "CSS Token Naming Convention" (see sections below).
   - If unsure about Tailwind CSS features or `tailwind-variants` usage, use **MCP Quillopy/Context7** to research their documentation.

**EXAMPLE**

### Token Definition Rules

**IMPORTANT**: All component tokens must be defined in `@theme static` blocks:

```css
/*If you need to specify different values for breakpoints*/
:root {
  @media (min-width: 768px) {
    --color-button-bg: var(--color-secondary);
    --spacing-button-sm: var(--spacing-2xs);
  }
}
/* libs/ui/src/tokens/components/_component-name.css */
@theme static {
  /* Category-Component-Property-State pattern */
  --color-button-bg: var(--color-primary);
  --color-button-bg-hover: oklch(
    from var(--color-button-bg) calc(l + var(--state-hover)) c h
  );
  --spacing-button-sm: var(--spacing-xs);
}
```

5. **Integrate CSS**:

   - Import the new `_component-name.css` into the main component token stylesheet (e.g., `apps/frontend-demo/src/tokens/components.css`).

6. **Testing & Validation**:

   - Write unit/integration tests.
   - Capture UI screenshots: `node scripts/capture-ui-screenshots.js` (from `apps/frontend-demo`).
   - Run TypeScript check: `bunx tsc --noEmit` (from `apps/frontend-demo`).
   - Run Biome: `bunx biome check --write .` (from monorepo root).

### 3.2. Workflow: Using Components from `@libs/ui`

1. **Discover & Identify**:

   - Check Storybook (assumed running) or search `libs/ui/src` (e.g., `grep -r "ComponentName" libs/ui/src` from root).

2. **Understand the Component (CRITICAL)**:

   - Use **MCP Quillopy** to study the **Zag.js documentation** for the specific component being used (e.g., Dialog, Combobox).
   - Pay close attention to its **props, expected data structures, types, and API**. Understand how it's assembled and its state machine if applicable.

3. **Implementation**:

   - Import the component (e.g., `import { Dialog } from '@libs/ui/molecules/dialog';`).
   - Use it according to its documented API and props.

### 3.3. Workflow: Styling Existing Components / UI Changes

1. **Identify**: Locate the component's `.tsx` file and its corresponding `_component-name.css` token file.
2. **CSS Token Modification**:
   - Modify/add CSS tokens in `_component-name.css`, primarily referencing `_semantic.css` variables and adhering to all token guidelines.
   - Use **MCP Quillopy/Context7** to research Tailwind CSS/`tailwind-variants` documentation if needed.
3. **`tv()` Updates**: If file has `tv()` with `slots` Update `slots` in the `tv()` definition within the `.tsx` file if necessary to apply new/changed styles.
4. **Testing & Validation**: Follow step 6 from "Workflow: Creating a New Component".

## 4. Styling, Theming & Component Development Details

### 4.2. Design Tokens & Theming

- **Global Tokens**:
  - Located in `libs/ui/src/tokens/` or `apps/frontend-demo/src/tokens/`.
  - Key files: `_semantic.css` (colors with `light-dark()`), `_spacing.css`, `_typography.css`.
- **Component-Specific Tokens**:
  - Location: `apps/frontend-demo/src/tokens/components/[atoms|molecules|organisms]/_component-name.css`.
- **Theme Responsiveness**:
  - **IMPORTANT**: Semantic color tokens in `_semantic.css` (or equivalent) **MUST** use the CSS `light-dark()` function for theme-responsive colors. Example: `--color-fg-primary: light-dark(var(--gray-900), var(--gray-100));`
- **Theme System (`next-themes`)**:
  - Provider: `next-themes` in `apps/frontend-demo/src/components/providers.tsx`.
  - Activation: Tailwind `dark:` prefix.

### 4.3. CSS Token Guidelines

- **Allowed Token Prefixes**:
  - `--color-`: All color values
  - `--text-`: Font sizes (must map to Tailwind text sizes)
  - `--font-weight-`: Font weights (100-900 or semantic)
  - `--border-`: Border width, style, color
  - `--opacity-`: Transparency values (0-100%)
  - `--spacing-`: Padding, margin, gap, AND width/height values that need max/min variants
  - `--width-`: Width values (only when you don't need max/min variants)
  - `--height-`: Height values (only when you don't need max/min variants)
  - `--gap-`: Flex/grid gaps
  - `--padding-`: Padding values
  - `--margin-`: Margin values
  - `--radius-`: Border radius
  - `--shadow-`: Box shadows
- **IMPORTANT**: Use `--spacing-` prefix for any width/height values that need `max-w`/`min-w`/`max-h`/`min-h` utilities!
- **Forbidden Patterns**:
  - ❌ `--grid-cols-product-grid-base` (too specific)
  - ❌ `--layout-*` (use specific properties like `--spacing-` or `--width-`)
  - ❌ `--component-specific-anything` (aim for generic, reusable token names within the component's scope, referencing semantic globals)

### 4.4. CSS Token Naming Convention

- **Pattern**: `--[type]-[component_abbr_opt]-[element_opt]-[modifier_opt]-[purpose_opt]-[state_opt]`
  - **Slots**: Use descriptive names (e.g., `root`, `container`, `list`, `item`, `icon`, `label`).
- **Rules**:
  - **Type** (required): `color`, `spacing`, `text`, `font-weight`, `border`, `opacity`, `radius`, `shadow`, etc.
  - **Component Abbreviation** (optional, for clarity in complex components): Use readable abbreviations (e.g., `btn`, `pc`, `nav`).
  - **Element** (optional): Specific part like `title`, `container`, `button-icon`.
  - **Modifier** (optional): Size (`sm`, `md`, `lg`) or variant (`primary`, `secondary`).
  - **Purpose** (primarily for colors): `fg` (foreground: text/icons), `bg` (background), `border`, `ring`, `shadow`.
  - **State** (optional): `hover`, `active`, `disabled`, `focus`.
- **Size Naming**:
  - Single size: use `-size` suffix (e.g., `--text-hero-title-size`).
  - Multiple sizes: use size directly as a modifier (e.g., `--text-pc-name-sm`, NOT `--text-pc-name-size-sm`).
- **Common Abbreviations**: `btn` (button), `pc` (product-card), `nav` (navigation), `acc` (accordion), `cb` (checkbox).
- **Examples**: `libs/ui/src/tokens/components/atoms/_button.css` `libs/ui/src/tokens/components/molecules/_combobox.css`

### Token Usage in Components

```typescript
// ✅ CORRECT - Use Tailwind classes that reference your tokens
"bg-button-bg" // Uses --color-button-bg
"text-button-fg" // Uses --color-button-fg
"p-button-sm" // Uses --spacing-button-sm

// ❌ WRONG - Never use arbitrary values
"bg-[var(--color-button-bg)]"
"p-[var(--spacing-button-sm)]"
```

### 4.5. CSS File Organization (`apps/frontend-demo`)

- **Location**: `apps/frontend-demo/src/tokens/app-components/` folders: "atoms", "molecules", "organisms", "templates", "pages"
- **Import**: Always add new component CSS file imports to `apps/frontend-demo/src/tokens/app-components.css` (or the main CSS entry point for component tokens).

## 5. Core Commands (Contextual Execution)

- **Build `frontend-demo` (for Netlify)**:
  ```bash
  # (Run from apps/frontend-demo)
  pnpm build:static
  ```
- **Testing `frontend-demo`**:
  ```bash
  # (Run from apps/frontend-demo)
  node scripts/test-login.js # Example, adapt to actual test scripts
  node scripts/capture-ui-screenshots.js
  ```
- **Code Quality (Monorepo Root)**:
  ```Bash
  # (Run from monorepo root)
  bunx biome check --write .
  ```
- **TypeScript Check `frontend-demo`**:
  ```bash
  # (Run from apps/frontend-demo)
  bunx tsc --noEmit
  ```

## 6. MCP-Enhanced Workflows (General)

_(This section is for general guidance on how MCP tools can be leveraged, specific usage is detailed in workflows above)_

- Use **MCP Quillopy** and **Context7** for:
  - Researching Tailwind CSS, `tailwind-variants`, and Zag.js documentation.
  - Understanding API details of `@libs/ui` components (especially Zag.js parts).
- For visual testing or complex E2E flows, you might ask Claude to help generate Puppeteer scripts:

  ```
  "Help me write a Puppeteer script to test the complete login flow."
  "Generate a script to capture screenshots of all pages in mobile/tablet/desktop."
  ```

## 7. Do's and Don'ts

### DO:

✅ Check existing components first in @app-components.md. ✅ Follow Atomic Design. ✅ Use design tokens for ALL styling. ✅ If component has more variants style it via tv() and CSS variables, referencing semantics(_semantic.css). ✅ Use MCP Quillopy/Context7 to research documentation (Zag.js, Tailwind, etc.) ✅ Use tv() with slots for component styles. ✅ Ensure CSS variables primarily reference _semantic.css variables.

### DON'T:

❌ Create duplicate components. ❌ Hardcode colors or spacing directly in JSX/TSX (use tokens/tv()). ❌ Edit package.json manually (use pnpm add). ❌ Forget mobile viewport testing. ❌ Use variants in tv() unless absolutely critical and discussed.

## 8. Repository Etiquette

### Git Workflow

- Branch naming: `feat/`, `fix/`, `chore/`, `docs/`
- Commit with descriptive messages (Conventional Commits).
- Use meaningful commit squashing when merging to `main` - preserve important granularity especially when working with AI tools. Only squash truly related commits.
- **Always run `bunx biome check --write .` (from root) and `bunx tsc --noEmit` (in `apps/frontend-demo`) before committing.**

## 9. Deployment (`frontend-demo` to Netlify)

- Build command (run from `apps/frontend-demo`):

  ```bash
  pnpm build:static # Creates 'out' directory
  ```

- Deploy command (run from `apps/frontend-demo` after login to Netlify CLI):

  ```bash
  netlify deploy --prod
  # or for a draft:
  netlify deploy
  ```

**IMPORTANT**: All dynamic routes must work with static generation.

## 10. Keeping This Updated

- After each session, ask:

  > "Based on our conversation and Claude Code best practices, is there anything that should be added to `CLAUDE.MD`, or does anything make current instructions obsolete?"

- After each "No" to a suggestion from Claude, think about what should be added or edited in `CLAUDE.MD` to make the instructions clearer for next time.
