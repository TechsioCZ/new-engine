# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Nx monorepo that holds only the shared libraries of an e-commerce platform: the design system and the storefront utility libraries. The applications that consume them live in a separate repository. The project uses pnpm for package management and Nx for orchestrating builds.

## Architecture

### Monorepo Structure
- **libs/**: Shared libraries
  - `ui`: Component library built with Zag.js and Tailwind CSS (`@techsio/ui-kit`)
  - `storefront-data`: TanStack Query + Medusa storefront data layer
  - `storefront-i18n`: Storefront market resolution and backend-managed messages
  - `storefront-security`: Next.js storefront security headers and CSP presets
  - `analytics`: Analytics adapters for storefronts

### Key Technologies
- **Monorepo**: Nx
- **Frontend**: Modern.js, React 19, Tailwind CSS (we prefer Modern.js from Bytedance, but sometimes Next.js 15+ can be used)
- **Backend SDK**: Medusa.js v2 JS SDK (storefront-data, storefront-i18n)
- **Component Library**: Zag.js for React UI components using Tailwind
- **Build Tools**: RSLib for library builds
- **Testing**: Vitest
- **Code Quality**: Biome for linting and formatting

## MCP Servers for Enhanced Development

This project includes MCP (Model Context Protocol) servers configuration to enhance Claude Code capabilities. Start Claude Code with: `claude --mcp-config .mcp.json`

### Available MCP Servers

1. **puppeteer-mcp** - Automated browser testing and screenshots
   - Use for: E2E testing, visual regression tests, automated screenshots
   - Example: "Use puppeteer to capture screenshots of all product pages"

2. **github** - GitHub repository management
   - Use for: Creating PRs, managing issues, reviewing code
   - Example: "Create a GitHub issue for refactoring CSS tokens"

3. **tavily-mcp** - Advanced web search
   - Use for: Researching e-commerce best practices, competitor analysis
   - Example: "Search for modern e-commerce UI patterns for checkout flow"

4. **sequential-thinking** - Complex problem solving
   - Use for: Architecture decisions, refactoring planning
   - Example: "Plan the migration of all CSS files to new naming convention"

5. **desktop-commander** - File system operations
   - Use for: Batch file operations, asset management
   - Example: "Rename all product images to follow naming convention"

6. **taskmaster** - Project management
   - Use for: Sprint planning, task tracking, backlog management
   - Example: "Create a task list for implementing dark mode"

### Recommended MCP Workflows

**Component Documentation**:
```
1. Use puppeteer to screenshot component variations
2. Use taskmaster to track documentation tasks
3. Use github to create PR with docs
```

**CSS Refactoring**:
```
1. Use sequential-thinking to plan refactoring strategy
2. Use desktop-commander for batch file operations
3. Use github to create refactoring PR
```

**Feature Implementation**:
```
1. Use tavily to research best practices
2. Use taskmaster to break down into subtasks
3. Use puppeteer for visual testing
```

## Development Commands

### Package Management
Always use CLI commands to install packages, never edit package.json directly:
```bash
pnpm add <package>           # Add dependency
pnpm add -D <package>        # Add dev dependency
pnpm add -w <package>        # Add to workspace root
```

### Running Storybook
```bash
bunx nx run ui:storybook       # Start Storybook for UI library
```

### Building Projects
```bash
bunx nx run ui:build                         # Build UI library
bunx nx run-many -t build                    # Build all libraries
```

### Testing
```bash
bunx nx run-many -t lint test                # Lint and test all libraries
pnpm --dir libs/ui typecheck                 # Typecheck the UI library
```

### Code Quality
Always run Biome globally over the entire repository:
```bash
bunx biome check --write .     # Lint and format entire repository
```

### Nx Utilities
```bash
bunx nx graph                  # View project dependency graph
bunx nx affected:build         # Build only affected projects
bunx nx affected:test          # Test only affected projects
```

## UI Library (`libs/ui`)

The UI library uses Zag.js for React components with custom styling with Tailwind:
- **Atoms**: Basic components (button, input, badge, etc.)
- **Molecules**: Composite components (accordion, dialog, form components, etc.)
- **Tokens**: Design system tokens for colors, spacing, typography
- **Storybook**: Run `bunx nx run ui:storybook` to view components

Import pattern:
```typescript
import { Button } from '@libs/ui/atoms/button'
import { Dialog } from '@libs/ui/molecules/dialog'
```

## Configuration Files

- **nx.json**: Nx workspace configuration
- **biome.json**: Linter and formatter settings (extends ultracite)
- **tsconfig.base.json**: Shared TypeScript configuration
- **pnpm-workspace.yaml**: Workspace package definitions
