#!/usr/bin/env node
/**
 * Generates the legacy Claude Code manifest from the portable Agent Plugins files.
 *
 *   node scripts/build-client-manifests.mjs           # write .claude-plugin/*
 *   node scripts/build-client-manifests.mjs --check   # fail if they are stale
 *
 * `plugin.json` + `mcp.json` + `skills/` at the plugin root are the single source of truth
 * (Agent Plugins 1.0.0). Codex reads them natively and takes its client-specific data from
 * `extensions["com.openai"]` and the `com.openai/` extension directory.
 *
 * Claude Code does not read root `plugin.json` yet — it still loads `.claude-plugin/plugin.json`
 * and `.mcp.json`. This script derives that manifest so the two can never drift:
 *
 * - metadata is copied from `plugin.json`;
 * - MCP servers are inlined from `mcp.json`, mapped to Claude Code's config shape
 *   (`streamable-http` → `http`, `${PLUGIN_ROOT}` → `${CLAUDE_PLUGIN_ROOT}`, …);
 * - hooks point at `.claude-plugin/hooks.json`, a copy of `com.openai/hooks.json` (both clients
 *   run the same hook format, and the commands resolve `${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT}}`).
 *
 * JSON has no comments, so the "do not edit" notice lives in README.md; `--check` catches edits.
 *
 * Portable clients ignore `.claude-plugin/` entirely (it is neither a component location nor an
 * extension directory), so the shim never overrides the portable manifest.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const check = process.argv.includes("--check")
const readJson = (path) =>
  JSON.parse(readFileSync(join(pluginDir, path), "utf8"))

const manifest = readJson("plugin.json")
const mcp = readJson("mcp.json")
const codex = manifest.extensions?.["com.openai"] ?? {}

// Literal placeholder names, not template strings — `$` + `{…}` are joined on purpose.
const placeholder = (name) => `$${"{"}${name}}`
const toClaudeVars = (value) =>
  value
    .replaceAll(placeholder("PLUGIN_ROOT"), placeholder("CLAUDE_PLUGIN_ROOT"))
    .replaceAll(placeholder("PLUGIN_DATA"), placeholder("CLAUDE_PLUGIN_DATA"))

const mapServer = (server) => {
  if (server.type === "streamable-http" || server.type === "sse") {
    return {
      type: server.type === "sse" ? "sse" : "http",
      url: server.url,
      ...(server.headers ? { headers: server.headers } : {}),
    }
  }
  const command = server.command.startsWith("./")
    ? `\${CLAUDE_PLUGIN_ROOT}/${server.command.slice(2)}`
    : server.command
  return {
    type: "stdio",
    command,
    ...(server.args ? { args: server.args.map(toClaudeVars) } : {}),
    ...(server.env
      ? {
          env: Object.fromEntries(
            Object.entries(server.env).map(([k, v]) => [k, toClaudeVars(v)])
          ),
        }
      : {}),
    ...(server.cwd
      ? {
          cwd: toClaudeVars(
            server.cwd.startsWith("./")
              ? `\${PLUGIN_ROOT}/${server.cwd.slice(2)}`
              : server.cwd
          ),
        }
      : {}),
  }
}

const pick = (keys) =>
  Object.fromEntries(
    keys.filter((k) => k in manifest).map((k) => [k, manifest[k]])
  )

const files = new Map()
files.set(".claude-plugin/plugin.json", {
  ...pick([
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
  ]),
  ...(codex.hooks ? { hooks: "./.claude-plugin/hooks.json" } : {}),
  mcpServers: Object.fromEntries(
    Object.entries(mcp.mcpServers).map(([name, s]) => [name, mapServer(s)])
  ),
})
if (codex.hooks) {
  files.set(".claude-plugin/hooks.json", readJson(codex.hooks))
}

const stale = []
for (const [path, content] of files) {
  const text = `${JSON.stringify(content, null, 2)}\n`
  const target = join(pluginDir, path)
  if (check) {
    // Compare parsed JSON, so reformatting the file (biome) never reads as stale.
    const current = existsSync(target) ? readFileSync(target, "utf8") : "null"
    if (JSON.stringify(JSON.parse(current)) !== JSON.stringify(content)) {
      stale.push(path)
    }
    continue
  }
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, text)
}

if (check && stale.length) {
  console.error(
    `Stale client manifests: ${stale.join(", ")}\nRun: node libs/ui/agent-plugin/scripts/build-client-manifests.mjs`
  )
  process.exit(1)
}
console.log(
  check ? "Client manifests in sync." : `Wrote ${[...files.keys()].join(", ")}`
)
