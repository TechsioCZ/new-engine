#!/usr/bin/env node
/**
 * Validates this plugin against Agent Plugins 1.0.0 (https://agent-plugins.org, spec/1.0.0.md)
 * and every bundled skill against the Agent Skills spec (https://agentskills.io/specification).
 *
 *   node scripts/validate-plugin.mjs
 *
 * Checks, in the order a conformant client loads the package:
 *   §4.1  every file stays inside the plugin root (no symlink escapes)
 *   §5    plugin.json: closed manifest, required $schema + name, name constraints, field types
 *   §6-7  skills/<name>/SKILL.md discovery + Agent Skills frontmatter conformance
 *   §7.2  mcp.json: closed config, matching $schema version, one closed variant per server
 *   §8    top-level directories are component locations, reverse-domain extension directories,
 *         or plain support files — and extensions[] keys are reverse-domain namespaces
 * plus the generated artifacts: the Claude Code shim and (in the monorepo) the skill bundle.
 */
import { execFileSync } from "node:child_process"
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { validatePortableSkill } from "./lib/skill-frontmatter.mjs"

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SPEC = "1.0.0"
const PLUGIN_SCHEMA = `https://agent-plugins.org/schemas/${SPEC}/plugin.schema.json`
const MCP_SCHEMA = `https://agent-plugins.org/schemas/${SPEC}/mcp.schema.json`
const NAME_RE = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/
const NAMESPACE_RE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/
const MANIFEST_FIELDS = [
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]

const errors = []
const fail = (where, message) => errors.push(`${where}: ${message}`)
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v)
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(join(pluginDir, path), "utf8"))
  } catch (error) {
    fail(path, `not valid JSON (${error.message})`)
    return
  }
}

// §4.1 — containment.
const root = realpathSync(pluginDir)
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name === "node_modules" || name === ".git") {
      continue
    }
    const real = realpathSync(path)
    if (real !== root && !real.startsWith(root + sep)) {
      fail(relative(pluginDir, path), "resolves outside the plugin root")
      continue
    }
    if (lstatSync(path).isDirectory()) {
      walk(path)
    }
  }
}
walk(pluginDir)

// §5 — manifest.
const manifest = readJson("plugin.json")
if (isObject(manifest)) {
  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_FIELDS.includes(key)) {
      fail(
        "plugin.json",
        `unknown top-level field "${key}" (client data belongs under extensions)`
      )
    }
  }
  if (manifest.$schema !== PLUGIN_SCHEMA) {
    fail("plugin.json", `$schema must be ${PLUGIN_SCHEMA}`)
  }
  if (
    typeof manifest.name !== "string" ||
    manifest.name.length > 64 ||
    !NAME_RE.test(manifest.name)
  ) {
    fail(
      "plugin.json",
      "name must be 1-64 chars of a-z 0-9 - . , alphanumeric at both ends, no -- or .."
    )
  }
  for (const key of [
    "version",
    "description",
    "homepage",
    "repository",
    "license",
  ]) {
    if (key in manifest && typeof manifest[key] !== "string") {
      fail("plugin.json", `${key} must be a string`)
    }
  }
  if ("author" in manifest) {
    if (isObject(manifest.author)) {
      for (const [k, v] of Object.entries(manifest.author)) {
        if (!["name", "email", "url"].includes(k) || typeof v !== "string") {
          fail("plugin.json", `author.${k} is not allowed or not a string`)
        }
      }
    } else {
      fail("plugin.json", "author must be an object")
    }
  }
  if (
    "keywords" in manifest &&
    !(
      Array.isArray(manifest.keywords) &&
      manifest.keywords.every((k) => typeof k === "string")
    )
  ) {
    fail("plugin.json", "keywords must be an array of strings")
  }
  if ("extensions" in manifest) {
    if (isObject(manifest.extensions)) {
      for (const [ns, value] of Object.entries(manifest.extensions)) {
        if (!NAMESPACE_RE.test(ns)) {
          fail(
            "plugin.json",
            `extensions key "${ns}" is not a reverse-domain namespace`
          )
        }
        if (!isObject(value)) {
          fail("plugin.json", `extensions["${ns}"] must be an object`)
        }
      }
    } else {
      fail("plugin.json", "extensions must be an object")
    }
  }
  // Codex (com.openai) resolves its extension paths against the root and requires "./".
  const codexHooks = manifest.extensions?.["com.openai"]?.hooks
  if (
    codexHooks !== undefined &&
    (typeof codexHooks !== "string" ||
      !codexHooks.startsWith("./com.openai/") ||
      !existsSync(join(pluginDir, codexHooks)))
  ) {
    fail(
      "plugin.json",
      `extensions["com.openai"].hooks must be an existing ./com.openai/ path`
    )
  }
} else if (manifest !== undefined) {
  fail("plugin.json", "must contain a JSON object")
}

// §6–7.1 — skills.
const skillsDir = join(pluginDir, "skills")
let skillCount = 0
if (existsSync(skillsDir)) {
  for (const name of readdirSync(skillsDir)) {
    const file = join(skillsDir, name, "SKILL.md")
    if (!lstatSync(join(skillsDir, name)).isDirectory()) {
      continue
    }
    if (!existsSync(file)) {
      fail(`skills/${name}`, "directory has no SKILL.md")
      continue
    }
    skillCount += 1
    for (const problem of validatePortableSkill(
      readFileSync(file, "utf8"),
      name
    )) {
      fail(`skills/${name}/SKILL.md`, problem)
    }
  }
}

// §7.2 — MCP configuration.
if (existsSync(join(pluginDir, "mcp.json"))) {
  const mcp = readJson("mcp.json")
  if (isObject(mcp)) {
    for (const key of Object.keys(mcp)) {
      if (!["$schema", "mcpServers"].includes(key)) {
        fail("mcp.json", `unknown top-level field "${key}"`)
      }
    }
    if (mcp.$schema !== MCP_SCHEMA) {
      fail(
        "mcp.json",
        `$schema must be ${MCP_SCHEMA} (same version as plugin.json)`
      )
    }
    if (!isObject(mcp.mcpServers)) {
      fail("mcp.json", "mcpServers must be an object")
    }
    for (const [id, server] of Object.entries(mcp.mcpServers ?? {})) {
      const where = `mcp.json#${id}`
      const allowed = {
        stdio: ["type", "command", "args", "env", "cwd"],
        "streamable-http": ["type", "url", "headers"],
        sse: ["type", "url", "headers"],
      }[server?.type]
      if (!allowed) {
        fail(
          where,
          `type must be stdio, streamable-http or sse (got ${JSON.stringify(server?.type)})`
        )
        continue
      }
      for (const key of Object.keys(server)) {
        if (!allowed.includes(key)) {
          fail(
            where,
            `field "${key}" does not belong to the ${server.type} variant`
          )
        }
      }
      if (server.type === "stdio") {
        if (
          typeof server.command !== "string" ||
          !server.command ||
          /\s/.test(server.command)
        ) {
          fail(where, "command must be one executable token")
        }
        if (
          server.command?.startsWith("../") ||
          server.command?.includes("${")
        ) {
          fail(
            where,
            "command must be a bare name or ./ path without placeholders"
          )
        }
        if (
          server.env &&
          ("PLUGIN_ROOT" in server.env || "PLUGIN_DATA" in server.env)
        ) {
          fail(where, "env must not set PLUGIN_ROOT / PLUGIN_DATA")
        }
        if (
          server.cwd !== undefined &&
          !/^(?:\.\/|\$\{PLUGIN_ROOT\}(?:\/|$)|\$\{PLUGIN_DATA\}(?:\/|$))/.test(
            server.cwd
          )
        ) {
          fail(
            where,
            "cwd must start with ./, $PLUGIN_ROOT or $PLUGIN_DATA (placeholder form)"
          )
        }
      } else {
        let url
        try {
          url = new URL(server.url)
        } catch {
          fail(where, "url must be an absolute URL")
        }
        if (url) {
          const loopback =
            url.hostname === "localhost" ||
            url.hostname === "127.0.0.1" ||
            url.hostname === "[::1]"
          if (
            url.protocol !== "https:" &&
            !(url.protocol === "http:" && loopback)
          ) {
            fail(where, "non-loopback endpoints must use https")
          }
          if (url.username || url.password || url.hash) {
            fail(where, "url must not contain user info or a fragment")
          }
        }
      }
    }
  } else if (mcp !== undefined) {
    fail("mcp.json", "must contain a JSON object")
  }
}

// §8 — top-level layout.
const SUPPORT_DIRS = new Set(["scripts", ".claude-plugin"])
for (const name of readdirSync(pluginDir)) {
  if (
    !lstatSync(join(pluginDir, name)).isDirectory() ||
    name === "skills" ||
    name === "node_modules"
  ) {
    continue
  }
  if (NAMESPACE_RE.test(name)) {
    if (!(name in (manifest?.extensions ?? {}))) {
      fail(
        name,
        "extension directory has no matching extensions entry in plugin.json"
      )
    }
  } else if (!SUPPORT_DIRS.has(name)) {
    fail(
      name,
      "unexpected top-level directory (client files belong in a reverse-domain extension directory)"
    )
  }
}
for (const legacy of [".codex-plugin", ".mcp.json", "hooks", "agents"]) {
  if (existsSync(join(pluginDir, legacy))) {
    fail(
      legacy,
      "legacy location — the portable files are plugin.json, mcp.json, skills/ and com.openai/"
    )
  }
}

// Generated artifacts must be current.
const runCheck = (script) => {
  try {
    execFileSync(
      process.execPath,
      [join(pluginDir, "scripts", script), "--check"],
      { stdio: "pipe" }
    )
  } catch (error) {
    fail(
      `scripts/${script}`,
      (error.stderr?.toString() || error.message).trim()
    )
  }
}
runCheck("build-client-manifests.mjs")
if (existsSync(resolve(pluginDir, "../skills"))) {
  runCheck("sync-skills.mjs")
}

if (errors.length) {
  console.error(`✖ Agent Plugins ${SPEC} validation failed:\n`)
  for (const error of errors) {
    console.error(`  • ${error}`)
  }
  process.exit(1)
}
console.log(
  `✔ ${manifest.name}@${manifest.version} conforms to Agent Plugins ${SPEC} (${skillCount} skills, ${Object.keys(readJson("mcp.json")?.mcpServers ?? {}).length} MCP servers).`
)
