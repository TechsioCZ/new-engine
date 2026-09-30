/**
 * SKILL.md frontmatter helpers shared by sync-skills.mjs, validate-plugin.mjs and the repo's
 * scripts/check-skill-sync.mjs.
 *
 * Two formats meet here:
 *
 * - The AUTHORING format in libs/ui/skills/ (TanStack Intent flavoured): Agent Skills keys, the
 *   Intent scalars under `metadata` (`type`, `library`, `library_version`, `component`,
 *   `component_version`, …), and the Intent list keys `requires` / `sources` at top level.
 * - The PORTABLE format bundled into the plugin: strictly the Agent Skills spec
 *   (https://agentskills.io/specification) — top-level keys limited to name, description, license,
 *   compatibility, metadata and allowed-tools, and `metadata` a string→string map. Agent Plugins
 *   1.0.0 §7.1 requires clients to SKIP a non-conforming skill, so top-level lists cannot ship.
 *
 * `toPortableSkill()` converts the first into the second deterministically: every non-spec
 * top-level key moves under `metadata`, lists are joined with single spaces (the same convention
 * Agent Skills uses for `allowed-tools`). The body is copied byte-for-byte.
 *
 * The parser covers the YAML subset these files use — `key: scalar`, `key: >`/`|` block scalars,
 * `key:` + `  - item` lists and `key:` + `  sub: scalar` maps — and throws on anything else, so an
 * unexpected construct fails loudly instead of being rewritten wrongly.
 */

export const SPEC_KEYS = [
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]
export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/

/** Split a SKILL.md into its frontmatter lines and body. */
export function splitSkill(source) {
  const match = source.match(FRONTMATTER_RE)
  if (!match) {
    throw new Error("missing YAML frontmatter (file must start with ---)")
  }
  return { lines: match[1].split(/\r?\n/), body: source.slice(match[0].length) }
}

// A quoted scalar followed by an optional YAML comment: `"value" # note`.
const DOUBLE_QUOTED = /^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/
const SINGLE_QUOTED = /^'((?:[^']|'')*)'\s*(?:#.*)?$/
// In a plain scalar a comment starts at whitespace + `#`.
const PLAIN_COMMENT = /\s+#.*$/

const unquote = (raw) => {
  const value = raw.trim()
  const double = DOUBLE_QUOTED.exec(value)
  if (double) {
    return JSON.parse(double[1])
  }
  const single = SINGLE_QUOTED.exec(value)
  if (single) {
    return single[1].replace(/''/g, "'")
  }
  return value.replace(PLAIN_COMMENT, "")
}

/**
 * Parse frontmatter lines into ordered entries:
 *   { key, kind: "scalar" | "block" | "list" | "map", raw: string[], value }
 * `raw` keeps the original lines so spec keys can be re-emitted untouched.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a single-pass line parser; splitting it would scatter the grammar
export function parseFrontmatter(lines) {
  const entries = []
  let current = null
  for (const line of lines) {
    if (line.trim() === "" && current?.kind !== "block") {
      continue
    }
    const top = line.match(/^([A-Za-z0-9_-]+):(?:\s(.*))?$/)
    if (top) {
      const [, key, rest = ""] = top
      const trimmed = rest.trim()
      if (trimmed === "") {
        current = { key, kind: "pending", raw: [line], value: undefined }
      } else if (/^[>|][-+]?$/.test(trimmed)) {
        current = { key, kind: "block", raw: [line], value: "" }
      } else {
        current = { key, kind: "scalar", raw: [line], value: unquote(trimmed) }
      }
      entries.push(current)
      continue
    }
    if (!(current && /^\s/.test(line))) {
      throw new Error(`unsupported frontmatter line: ${JSON.stringify(line)}`)
    }
    current.raw.push(line)
    if (current.kind === "block") {
      current.value += `${current.value ? " " : ""}${line.trim()}`
      continue
    }
    const item = line.match(/^\s+-\s+(.*)$/)
    const pair = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/)
    if (item && (current.kind === "pending" || current.kind === "list")) {
      current.kind = "list"
      current.value = [...(current.value ?? []), unquote(item[1])]
    } else if (pair && (current.kind === "pending" || current.kind === "map")) {
      current.kind = "map"
      current.value = { ...(current.value ?? {}), [pair[1]]: unquote(pair[2]) }
    } else {
      throw new Error(
        `unsupported frontmatter construct under "${current.key}": ${JSON.stringify(line)}`
      )
    }
  }
  for (const entry of entries) {
    if (entry.kind === "pending") {
      entry.kind = "scalar"
      entry.value = ""
    }
    if (entry.kind === "block") {
      entry.value = entry.value.replace(/\s+/g, " ").trim()
    }
  }
  return entries
}

const quote = (value) => JSON.stringify(String(value))

/**
 * Convert an authoring-format SKILL.md into a strictly Agent Skills–conformant one.
 * Idempotent: a file that is already portable comes back unchanged.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one linear conversion pass, kept together for readability
export function toPortableSkill(source) {
  const { lines, body } = splitSkill(source)
  const entries = parseFrontmatter(lines)
  const metadata = new Map()
  const out = []

  for (const entry of entries) {
    if (entry.key === "metadata") {
      if (entry.kind !== "map") {
        throw new Error("metadata must be a mapping")
      }
      for (const [k, v] of Object.entries(entry.value)) {
        metadata.set(k, v)
      }
    }
  }
  for (const entry of entries) {
    if (entry.key === "metadata") {
      continue
    }
    if (SPEC_KEYS.includes(entry.key)) {
      out.push(...entry.raw)
      continue
    }
    if (metadata.has(entry.key)) {
      throw new Error(
        `"${entry.key}" is set both at top level and under metadata`
      )
    }
    if (entry.kind === "list") {
      metadata.set(entry.key, entry.value.join(" "))
    } else if (entry.kind === "scalar" || entry.kind === "block") {
      metadata.set(entry.key, entry.value)
    } else {
      throw new Error(`cannot move nested mapping "${entry.key}" into metadata`)
    }
  }
  if (metadata.size > 0) {
    out.push("metadata:")
    for (const [k, v] of metadata) {
      out.push(`  ${k}: ${quote(v)}`)
    }
  }
  return `---\n${out.join("\n")}\n---\n${body}`
}

/** Validate a SKILL.md against the Agent Skills spec. Returns a list of problems. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a flat list of independent spec checks
export function validatePortableSkill(source, dirName) {
  const problems = []
  let entries
  try {
    entries = parseFrontmatter(splitSkill(source).lines)
  } catch (error) {
    return [error.message]
  }
  const byKey = new Map(entries.map((e) => [e.key, e]))
  for (const entry of entries) {
    if (!SPEC_KEYS.includes(entry.key)) {
      problems.push(
        `non-spec top-level key "${entry.key}" (move it under metadata)`
      )
    }
  }
  const name = byKey.get("name")?.value
  if (typeof name !== "string" || name === "") {
    problems.push("missing name")
  } else {
    if (name.length > 64) {
      problems.push("name exceeds 64 characters")
    }
    if (!SKILL_NAME_RE.test(name)) {
      problems.push(
        `name "${name}" must be lowercase letters, digits and single hyphens`
      )
    }
    if (name !== dirName) {
      problems.push(`name "${name}" does not match its directory "${dirName}"`)
    }
  }
  const description = byKey.get("description")?.value
  if (typeof description !== "string" || description === "") {
    problems.push("missing description")
  } else if (description.length > 1024) {
    problems.push(`description exceeds 1024 characters (${description.length})`)
  }
  const compatibility = byKey.get("compatibility")?.value
  if (
    compatibility !== undefined &&
    (typeof compatibility !== "string" || compatibility.length > 500)
  ) {
    problems.push("compatibility must be a string of at most 500 characters")
  }
  const metadata = byKey.get("metadata")
  if (metadata && metadata.kind !== "map") {
    problems.push("metadata must be a string→string mapping")
  }
  for (const key of ["license", "allowed-tools"]) {
    const entry = byKey.get(key)
    if (entry && entry.kind !== "scalar" && entry.kind !== "block") {
      problems.push(`${key} must be a string`)
    }
  }
  return problems
}

/** Read one metadata (or legacy top-level) scalar from an authoring-format SKILL.md. */
export function readSkillField(source, key) {
  const entries = parseFrontmatter(splitSkill(source).lines)
  const metadata =
    entries.find((e) => e.key === "metadata" && e.kind === "map")?.value ?? {}
  if (key in metadata) {
    return metadata[key]
  }
  const top = entries.find((e) => e.key === key)
  return top && (top.kind === "scalar" || top.kind === "block")
    ? top.value
    : undefined
}
