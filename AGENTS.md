# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is an Nx monorepo for an e-commerce platform built with Medusa.js. The project uses pnpm for package management and Nx for orchestrating builds and development workflows.

## Architecture

### Monorepo Structure
- **apps/**: Application projects
  - `medusa-be`: Medusa.js v2 backend
  - `medusa-demo`: Next.js demo frontend (reference implementation)
  - `medusa-fe`: Next.js frontend (reference implementation)
  - `herbatika`: Next.js 16 storefront app
- **libs/**: Shared libraries
  - `ui`: Component library built with Zag.js and Tailwind CSS
  - `storefront-data`: TanStack Query + Medusa storefront data layer

### Subtree Guidance
- When touching `apps/herbatika`, read `apps/herbatika/AGENTS.md` before editing.
  It overrides the root frontend-demo server assumption with Herbatika's
  `http://localhost:3001` runtime and routes work through the `libs/ui/skills`
  and `libs/storefront-data/skills` workflows.

### Key Technologies
- **Monorepo**: Nx
- **Frontend**: Modern.js, React 19, Tailwind CSS (we prefer Modern.js from Bytedance, but sometimes Next.js 15+ can be used)
- **Backend**: Medusa.js v2
- **Component Library**: Zag.js for React UI components using Tailwind
- **Build Tools**: RSLib for library builds
- **Testing**: Vitest
- **Code Quality**: Biome for linting and formatting

## MCP Servers for Enhanced Development

This project includes MCP (Model Context Protocol) servers configuration to enhance Codex capabilities. Start Codex with: `Codex --mcp-config .mcp.json`

### Available MCP Servers

1. **puppeteer-mcp** - Automated browser testing and screenshots
   - Use for: E2E testing, visual regression tests, automated screenshots
   - Example: "Use puppeteer to capture screenshots of all product pages"

2. **GitHub** - GitHub repository management
   - Use for: Creating PRs, managing issues, reviewing code
   - Example: "Create a GitHub issue for refactoring CSS tokens"

3. **tavily-mcp** - Advanced web search
   - Use for: Researching e-commerce best practices, competitor analysis
   - Example: "Search for modern e-commerce UI patterns for checkout flow"

4. **sequential-thinking** - Complex problem-solving
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

### Important: Development Server Assumptions
**NEVER ask to run `pnpm dev` or check if the dev server is running!**
- Always assume the development server is already running on http://localhost:3000 (for frontend-demo)
- Exception: `apps/herbatika` uses `http://localhost:3001`; follow `apps/herbatika/AGENTS.md` for Herbatika work.
- This saves time and avoids unnecessary communication
- If you need to interact with the running application, use MCP tools (especially puppeteer-mcp)

### Package Management
Always use CLI commands to install packages, never edit package.json directly:
```bash
pnpm add <package>           # Add dependency
pnpm add -D <package>        # Add dev dependency
pnpm add -w <package>        # Add to workspace root
```

### Running Development Servers
```bash
bunx nx run medusa-be:dev      # Start backend dev server
bunx nx run medusa-fe:dev      # Start frontend dev server
bunx nx run ui:storybook       # Start Storybook for UI library
```

### Building Projects
```bash
bunx nx run medusa-be:build    # Build backend
bunx nx run medusa-fe:build    # Build frontend
bunx nx run ui:build          # Build UI library
```

### Testing
We don't have tests much (yet), but it is planned.
```bash
bunx nx run medusa-be:test     # Run backend tests with Vitest
bunx nx run ui:test           # Run UI library tests with Vitest
```

### Code Quality
Run Biome only on the files or paths you changed:
```bash
bunx biome check --write path/to/file.tsx     # Lint and format a specific file or path
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

Runtime app import pattern:
```typescript
import { Button } from '@techsio/ui-kit/atoms/button'
import { Dialog } from '@techsio/ui-kit/molecules/dialog'
```

Use `@libs/ui/...` only in projects that define and verify that alias explicitly. The workspace package contract for app consumers is currently `@techsio/ui-kit/...`.

## Medusa Backend Structure

Key directories in `apps/medusa-be/src/`:
- `api/`: Custom API endpoints
- `modules/`: Custom Medusa modules
- `workflows/`: Business logic workflows
- `admin/`: Admin panel customizations
- `subscribers/`: Event subscribers
- `jobs/`: Background jobs

## Configuration Files

- **nx.json**: Nx workspace configuration
- **biome.json**: Linter and formatter settings (extends ultracite)
- **tsconfig.base.json**: Shared TypeScript configuration
- **pnpm-workspace.yaml**: Workspace package definitions
