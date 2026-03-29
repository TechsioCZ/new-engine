# Figma Setup

Repo-local Codex Figma setup lives in:
- [../config.toml](../config.toml)
- [../figma-console-mcp/plugin/manifest.json](../figma-console-mcp/plugin/manifest.json)

## Included in repo

1. Official Figma MCP server config
2. Southleft `figma-console-mcp` server config
3. `design_systems` MCP config
4. Repo-local copy of Desktop Bridge plugin files:
   - [manifest.json](../figma-console-mcp/plugin/manifest.json)
   - [code.js](../figma-console-mcp/plugin/code.js)
   - [ui.html](../figma-console-mcp/plugin/ui.html)

## Still required outside repo

1. Figma Desktop app
2. Import the Desktop Bridge plugin from:
   - `D:\025\projects\new-engine-test\.codex\figma-console-mcp\plugin\manifest.json`
3. Run `Figma Desktop Bridge` inside the target file
4. Use `Design` mode for write operations
5. Use `Dev` mode for inspect/code export checks
6. Official Figma OAuth/login may still need to be completed per machine/session

## Notes

- The repo-level `.codex/config.toml` now contains the Figma MCP setup, so the project no longer depends on `C:\Users\pisez\.codex\config.toml` for these server definitions.
- The PAT token is currently embedded in repo config because this setup is being kept fully portable for this test environment.
- For a stricter setup later, move `FIGMA_ACCESS_TOKEN` back to environment or secrets management.
