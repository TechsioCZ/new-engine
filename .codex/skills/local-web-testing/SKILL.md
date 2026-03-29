---
name: local-web-testing
description: Manual testing of local web apps running on localhost, including smoke passes, click-through QA, login/registration verification, screenshots, and DevTools triage (console/elements/network). Use when asked to explore or test a local dev server or Storybook, or when the user wants lightweight manual QA or optional Puppeteer automation.
---

# Local Web Testing

## Overview

Manually validate local web apps on localhost, confirm core flows, capture evidence, and report issues with DevTools context.

## Workflow

1. Confirm scope, commands, and base URL.
Ask for the exact dev command and URL. Default to `pnpm dev` and `http://localhost:3000` if not specified. If Storybook is requested, prefer `pnpm storybook` or the script found in `package.json`. Ask for login credentials or whether registration is allowed.

2. Start the local server.
Run the provided command from the repo root. Wait for a ready log or reachable URL before testing.

3. Run a smoke pass.
Follow the core navigation and primary flows. Use `references/checklists.md` for detailed smoke steps.

4. Verify authentication.
If credentials are provided, test login and logout. If registration is allowed, create a new account and then log in. Capture any error messages and the exact steps to reproduce.

5. Use DevTools for triage.
Check the Console for errors and warnings. Review Network for failed requests, status codes, and slow responses. Use Elements to confirm layout issues or missing content.

6. Capture evidence.
Take screenshots for failures or key checkpoints. Name files by flow and step (for example `login-error-1.png`). Note the URL and time for each capture.

7. Report results.
Summarize pass/fail for each flow. Provide reproduction steps, expected vs actual, and DevTools notes. List screenshots and any console/network snippets.

## Optional Automation

If the user requests automation, check `D:\025\projects\new-engine\.mcp.json` for `puppeteer-mcp` or `browsermcp`. If available, use MCP to drive navigation and capture screenshots. If not available, continue manually and ask whether to install or enable the MCP server.

## Resources

Use `references/checklists.md` for detailed smoke, auth, Storybook, and DevTools checklists.
