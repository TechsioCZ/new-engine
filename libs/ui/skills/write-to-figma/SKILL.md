---
name: write-to-figma
description: Guide for writing designs into Figma using AI via Claude Desktop and MCP servers. Use this skill when the user wants to generate, create, or edit design system components, UI elements, color palettes, typography, or any visual design directly inside Figma using Claude. Also trigger when the user mentions Figma Console MCP, Desktop Bridge plugin, Design Systems Assistant MCP, or asks about AI-to-Figma workflows.
---

# Write to Figma with AI

Generate and edit designs directly inside Figma using Claude Desktop with 3 MCP servers and a Bridge plugin.

## Prerequisites

- **Figma Pro** ($20/month) — required for Dev Mode and advanced plugin features
- **Claude Pro or Max** ($20–$100/month) — sufficient token limits for complex iterations
- **Node.js** installed on the machine
- **Figma Desktop** app (not browser version)

## Architecture — The 4 Key Tools

Each tool has a specific role:

| Tool | Role | Type |
|------|------|------|
| **Figma Desktop MCP** (Official) | **Eyes** — reads context from Figma (colors, layout, components) so AI understands what exists | Local server via Extensions |
| **Figma Console MCP** (Southleft) | **Hands** — gives AI read/write access to draw, edit, and generate frames and tokens inside Figma | Local Node.js server |
| **Design Systems Assistant** (Southleft) | **Brain** — knowledge base of UX/UI best practices (accessibility, states, naming conventions) | Remote server |
| **Desktop Bridge Plugin** | **Pipeline** — local WebSocket that bypasses Figma's plugin sandbox for real-time AI↔Figma communication | Figma plugin |

## Setup Steps

### Step 1: Figma Desktop MCP (Eyes)

Install via Claude Desktop → Extensions → search "Figma" (official).

Figma Desktop must be launched with remote debugging enabled:

```bash
/Applications/Figma.app/Contents/MacOS/Figma --args --remote-debugging-port=9222
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-desktop": {
      "url": "http://127.0.0.1:3845/mcp"
    }
  }
}
```

### Step 2: Figma Console MCP (Hands)

Clone and build the Southleft repository:

```bash
git clone <southleft-figma-console-mcp-repo>
cd figma-console-mcp
npm install
npm run build local
```

Generate a **Figma Personal Access Token**: Figma → Settings → Security → Personal access tokens → Generate new token.

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-console-local": {
      "command": "node",
      "args": ["<path-to>/figma-console-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "<your-token>",
        "ENABLE_MCP_APPS": "true"
      }
    }
  }
}
```

### Step 3: Design Systems Assistant (Brain)

Remote server — no local installation needed.

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "design-systems": {
      "url": "https://design-systems-mcp.southleft.com/mcp"
    }
  }
}
```

### Step 4: Desktop Bridge Plugin (Pipeline)

Import in Figma: Plugins → Development → **Import plugin from manifest**.

Locate the `manifest.json` inside the Figma Desktop Bridge folder from the cloned figma-console-mcp repo.

Run the plugin — a floating window with **"MCP Ready"** confirms the connection.

## Workflow

1. Launch Figma Desktop with `--remote-debugging-port=9222`
2. Open Bridge plugin in Figma — wait for "MCP Ready"
3. Restart Claude Desktop to pick up config changes
4. Open a chat in Claude Desktop and verify Figma connection
5. Write a prompt describing what you want to generate
6. Claude generates palettes, typography, form inputs, cards, and interactive variants **directly on the Figma canvas** in real-time
7. Review output — fix minor layout bugs manually or with a follow-up prompt

## Example Prompts

- "Create a design system with a bold orange primary color. Include buttons, checkboxes, dropdowns, and a type system."
- "Generate a card component with hover and active states, following Material Design 3 conventions."
- "Add a dark mode color palette based on the existing light theme variables."

## Troubleshooting

- **Bridge not connecting**: Ensure Figma was launched with the remote debugging flag, not from the dock icon
- **Console MCP errors**: Verify the Personal Access Token has correct permissions and the path to `local.js` is absolute
- **AI not understanding canvas**: Make sure Figma Desktop MCP is installed and enabled in Dev Mode
- **Incomplete generation**: Claude may run into token limits on complex prompts — break the request into smaller pieces
