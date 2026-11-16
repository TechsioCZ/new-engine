#!/usr/bin/env node
/**
 * Generates the per-client files from the portable Agent Plugins sources.
 *
 *   node scripts/build-client-manifests.mjs           # write every generated file
 *   node scripts/build-client-manifests.mjs --check   # fail if any is stale, missing or orphaned
 *
 * Sources of truth (Agent Plugins 1.0.0):
 * - `plugin.json`, `mcp.json`, `skills/` at the plugin root — portable, read natively by Codex
 *   and GitHub Copilot (CLI, VS Code, app);
 * - `com.openai/` — the Codex extension directory: `hooks.json` (referenced from
 *   `extensions["com.openai"].hooks`) and `agents/*.toml`. Hooks and agents are not portable
 *   component types, so every client keeps its own copy in its own namespace, derived from these.
 *
 * Generated (never edit by hand):
 * - `com.github.copilot/hooks/hooks.json` — Copilot hook config (`version: 1`, flat entries).
 *   Events keep their PascalCase names, which makes Copilot send the snake_case payload
 *   (`tool_name`, `tool_input.command`) the shared hook scripts already read; `${PLUGIN_ROOT}`
 *   is the Agent Plugins path variable.
 * - `com.github.copilot/agents/<name>.agent.md` — Copilot custom agents.
 * - `com.anthropic/hooks/hooks.json` + `com.anthropic/agents/<name>.md` — Claude Code hooks
 *   and subagents (`${CLAUDE_PLUGIN_ROOT}`).
 * - `.claude-plugin/plugin.json` — Claude Code does not read the root `plugin.json`, so this
 *   manifest carries the metadata, inlines the MCP servers (mapped to Claude's shape:
 *   `streamable-http` → `http`, `${PLUGIN_ROOT}` → `${CLAUDE_PLUGIN_ROOT}`) and points at the
 *   `com.anthropic/` hooks and agents.
 *
 * Every client ignores the other clients' namespaces and `.claude-plugin/`, so the copies never
 * override one another. JSON has no comments, so the "do not edit" notice lives in README.md;
 * `--check` (run by validate-plugin.mjs) catches hand edits and orphaned files.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseCodexAgentToml } from "./lib/codex-agent-toml.mjs"

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const check = process.argv.includes("--check")
const readText = (path) => readFileSync(join(pluginDir, path), "utf8")
const readJson = (path) => JSON.parse(readText(path))

const manifest = readJson("plugin.json")
const mcp = readJson("mcp.json")
const codex = manifest.extensions?.["com.openai"] ?? {}

// Literal placeholder names, not template strings — `$` + `{…}` are joined on purpose.
const placeholder = (name) => `$${"{"}${name}}`
const PLUGIN_ROOT = placeholder("PLUGIN_ROOT")
const CLAUDE_PLUGIN_ROOT = placeholder("CLAUDE_PLUGIN_ROOT")
/** The Codex hook commands fall back between both variables; each client gets its own. */
const CODEX_ROOT = `$${"{"}PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT}}`
const toClaudeVars = (value) =>
  value
    .replaceAll(CODEX_ROOT, CLAUDE_PLUGIN_ROOT)
    .replaceAll(PLUGIN_ROOT, CLAUDE_PLUGIN_ROOT)
    .replaceAll(placeholder("PLUGIN_DATA"), placeholder("CLAUDE_PLUGIN_DATA"))
const toPortableVars = (value) => value.replaceAll(CODEX_ROOT, PLUGIN_ROOT)

// Generated directories: every file in them must come from this script (orphans are removed).
const GENERATED_DIRS = [
  "com.anthropic/agents",
  "com.anthropic/hooks",
  "com.github.copilot/agents",
  "com.github.copilot/hooks",
]

/** path → file contents (string). */
const files = new Map()
const json = (content) => `${JSON.stringify(content, null, 2)}\n`

// ── MCP servers for Claude Code ─────────────────────────────────────────────
const mapServer = (server) => {
  if (server.type === "streamable-http" || server.type === "sse") {
    return {
      type: server.type === "sse" ? "sse" : "http",
      url: server.url,
      ...(server.headers ? { headers: server.headers } : {}),
    }
  }
  const command = server.command.startsWith("./")
    ? `${CLAUDE_PLUGIN_ROOT}/${server.command.slice(2)}`
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
              ? `${PLUGIN_ROOT}/${server.cwd.slice(2)}`
              : server.cwd
          ),
        }
      : {}),
  }
}

// ── Hooks ───────────────────────────────────────────────────────────────────
const codexHooks = codex.hooks ? readJson(codex.hooks).hooks : null

/** Claude Code reads the same nested format as Codex; only the path variable differs. */
const claudeHooks = (hooks) => ({
  hooks: Object.fromEntries(
    Object.entries(hooks).map(([event, groups]) => [
      event,
      groups.map((group) => ({
        ...group,
        hooks: group.hooks.map((hook) => ({
          ...hook,
          ...(hook.command ? { command: toClaudeVars(hook.command) } : {}),
        })),
      })),
    ])
  ),
})

/**
 * Copilot's own format: `version: 1` and a flat list of command entries per event, each with an
 * optional anchored `matcher`. PascalCase event names select the snake_case payload, and with it
 * every shell tool reports as `Bash`, which the Codex matcher (`Bash|shell|local_shell`) covers.
 */
const copilotHooks = (hooks) => ({
  version: 1,
  hooks: Object.fromEntries(
    Object.entries(hooks).map(([event, groups]) => [
      event,
      groups.flatMap((group) =>
        group.hooks.map((hook) => {
          if (hook.type !== "command" || !hook.command) {
            throw new Error(
              `${codex.hooks}: ${event} hook must be a command hook to map it to Copilot`
            )
          }
          return {
            type: "command",
            ...(group.matcher ? { matcher: group.matcher } : {}),
            command: toPortableVars(hook.command),
            ...(hook.timeout ? { timeoutSec: hook.timeout } : {}),
          }
        })
      ),
    ])
  ),
})

if (codexHooks) {
  files.set("com.anthropic/hooks/hooks.json", json(claudeHooks(codexHooks)))
  files.set(
    "com.github.copilot/hooks/hooks.json",
    json(copilotHooks(codexHooks))
  )
}

// ── Agents ──────────────────────────────────────────────────────────────────
const agentsDir = "com.openai/agents"
const agents = existsSync(join(pluginDir, agentsDir))
  ? readdirSync(join(pluginDir, agentsDir))
      .filter((file) => file.endsWith(".toml"))
      .sort()
      .map((file) =>
        parseCodexAgentToml(
          readText(`${agentsDir}/${file}`),
          `${agentsDir}/${file}`
        )
      )
  : []

/** Markdown agent: YAML frontmatter (JSON strings are valid YAML scalars) + the instructions. */
const markdownAgent = (agent) =>
  [
    "---",
    `name: ${JSON.stringify(agent.name)}`,
    `description: ${JSON.stringify(agent.description)}`,
    "---",
    "",
    `<!-- GENERATED from com.openai/agents/${agent.name}.toml by scripts/build-client-manifests.mjs — do not edit. -->`,
    "",
    agent.developer_instructions.trim(),
    "",
  ].join("\n")

for (const agent of agents) {
  files.set(`com.anthropic/agents/${agent.name}.md`, markdownAgent(agent))
  files.set(
    `com.github.copilot/agents/${agent.name}.agent.md`,
    markdownAgent(agent)
  )
}

// ── Claude Code manifest ────────────────────────────────────────────────────
const pick = (keys) =>
  Object.fromEntries(
    keys.filter((k) => k in manifest).map((k) => [k, manifest[k]])
  )

files.set(
  ".claude-plugin/plugin.json",
  json({
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
    ...(codexHooks ? { hooks: "./com.anthropic/hooks/hooks.json" } : {}),
    ...(agents.length
      ? {
          agents: agents.map(
            (agent) => `./com.anthropic/agents/${agent.name}.md`
          ),
        }
      : {}),
    mcpServers: Object.fromEntries(
      Object.entries(mcp.mcpServers).map(([name, s]) => [name, mapServer(s)])
    ),
  })
)

// ── Write or check ──────────────────────────────────────────────────────────
const same = (path, expected, current) =>
  path.endsWith(".json")
    ? // Compare parsed JSON, so reformatting the file (biome) never reads as stale.
      JSON.stringify(JSON.parse(current)) ===
      JSON.stringify(JSON.parse(expected))
    : current === expected

const problems = []
const orphans = GENERATED_DIRS.flatMap((dir) =>
  existsSync(join(pluginDir, dir))
    ? readdirSync(join(pluginDir, dir))
        .map((name) => `${dir}/${name}`)
        .filter((path) => !files.has(path))
    : []
)
// Files this script used to write and no longer does.
for (const legacy of [".claude-plugin/hooks.json"]) {
  if (existsSync(join(pluginDir, legacy))) {
    orphans.push(legacy)
  }
}

for (const [path, content] of files) {
  const target = join(pluginDir, path)
  if (check) {
    const current = existsSync(target) ? readFileSync(target, "utf8") : null
    if (current === null) {
      problems.push(`${path} (missing)`)
    } else if (!same(path, content, current)) {
      problems.push(`${path} (stale)`)
    }
    continue
  }
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

for (const path of orphans) {
  if (check) {
    problems.push(`${path} (not generated — remove it)`)
  } else {
    rmSync(join(pluginDir, path))
  }
}

if (check && problems.length) {
  console.error(
    `Client files out of date:\n  ${problems.join("\n  ")}\nRun: node libs/ui/agent-plugin/scripts/build-client-manifests.mjs`
  )
  process.exit(1)
}
console.log(
  check
    ? `Client files in sync (${files.size} generated).`
    : `Wrote ${files.size} client files${orphans.length ? `, removed ${orphans.join(", ")}` : ""}.`
)
