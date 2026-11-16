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
 * top-level key moves under `metadata`, lists are joined with single spaces. Required resources
 * become skill-relative paths; repository-only evidence becomes contributor_sources. A portable
 * scope notice separates consumer prerequisites from source-checkout contributor instructions.
 *
 * The parser covers the YAML subset these files use — `key: scalar`, `key: >`/`|` block scalars,
 * `key:` + `  - item` lists and `key:` + `  sub: scalar` maps — and throws on anything else, so an
 * unexpected construct fails loudly instead of being rewritten wrongly.
 */

/**
 * Workflow skills written for the plugin itself. They exist only in the bundle; every other
 * bundled skill is generated from libs/ui/skills/ (which also has `ui-kit-*` skills, so a name
 * prefix cannot tell the two apart).
 */
export const AUTHORED_SKILLS = new Set([
  "ui-new-component",
  "ui-tokens",
  "ui-story",
  "ui-validate",
  "ui-theme-brand",
  "ui-figma-sync",
  "ui-release-check",
  "ui-component-usage",
])

/** Canonical resources copied by sync; paths resolve from the plugin root. */
export const BUNDLED_RESOURCES = [
  {
    source: "docs/component-contracts.md",
    path: "references/component-contracts.md",
    evidence: "libs/ui/docs/component-contracts.md",
  },
  {
    source: "skills/_artifacts/consumer_app_usage_rules.md",
    path: "references/consumer_app_usage_rules.md",
    evidence: "libs/ui/skills/_artifacts/consumer_app_usage_rules.md",
  },
]

/** Authored workflow bodies stay authored; their dependency declarations are generated. */
export const AUTHORED_PREREQUISITES = {
  "ui-new-component": [
    "component-authoring",
    "zag-compound-components",
    "ui-validate",
  ],
  "ui-tokens": ["tailwind-token-authoring"],
  "ui-story": ["storybook-authoring"],
  "ui-validate": ["component-consistency-validation"],
  "ui-theme-brand": ["tailwind-token-authoring", "app-token-overrides"],
  "ui-figma-sync": ["figma-sync-handoff"],
  "ui-release-check": ["ui-kit-publish-readiness", "ui-validate"],
  "ui-component-usage": [
    "component-usage-ux",
    "ux-guidelines",
    "app-token-overrides",
  ],
}

const COMPONENT_SOURCE_RE =
  /libs\/ui\/src\/(atoms|molecules|organisms)\/([a-z0-9-]+)\.tsx/g

/** Consumer rules must describe installed declarations, not require source exploration. */
export function toPortableResource(source, resourcePath) {
  if (resourcePath !== "references/consumer_app_usage_rules.md") {
    return source
  }
  return source
    .replace(COMPONENT_SOURCE_RE, "@techsio/ui-kit/$1/$2")
    .replaceAll(
      "`libs/ui/src`",
      "the installed package's exported subpaths/types"
    )
}

const RESOURCE_PATHS = BUNDLED_RESOURCES.map(({ path }) => `../../${path}`)
const PORTABLE_NOTICE = "> Portable scope: "
const isConsumerSkill = (name) =>
  name.endsWith("-usage") ||
  name.startsWith("app-") ||
  [
    "component-usage-ux",
    "ux-guidelines",
    "framework-consumer-integration",
  ].includes(name)

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
  const name = entries.find((entry) => entry.key === "name")?.value ?? ""
  const sources = String(metadata.get("sources") ?? "")
    .split(/\s+/)
    .filter(Boolean)
  const contributorSources = String(metadata.get("contributor_sources") ?? "")
    .split(/\s+/)
    .filter(Boolean)
  const portableSources = []
  for (const sourcePath of sources) {
    const resource = BUNDLED_RESOURCES.find(
      ({ evidence }) => evidence === sourcePath
    )
    if (resource) {
      portableSources.push(`../../${resource.path}`)
    } else if (
      sourcePath.startsWith("libs/") ||
      sourcePath.startsWith(".agents/")
    ) {
      contributorSources.push(sourcePath)
    } else {
      portableSources.push(sourcePath)
    }
  }
  if (sources.length) {
    metadata.set("sources", [...new Set(portableSources)].join(" "))
  }
  if (contributorSources.length) {
    metadata.set(
      "contributor_sources",
      [...new Set(contributorSources)].join(" ")
    )
  }
  metadata.set(
    "resources",
    [
      ...new Set([
        ...String(metadata.get("resources") ?? "")
          .split(/\s+/)
          .filter(Boolean),
        ...RESOURCE_PATHS,
      ]),
    ].join(" ")
  )
  metadata.set("audience", isConsumerSkill(name) ? "consumer" : "contributor")
  let portableBody = body
  for (const { evidence, path } of BUNDLED_RESOURCES) {
    portableBody = portableBody.replaceAll(evidence, `../../${path}`)
  }
  if (!portableBody.includes(PORTABLE_NOTICE)) {
    const scope = isConsumerSkill(name)
      ? "Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks."
      : "Source-authoring steps and monorepo commands require an explicit kit source checkout. In an installed consumer app, route to ../component-usage-ux/SKILL.md instead; do not run contributor commands or require repository artifacts."
    portableBody = `\n${PORTABLE_NOTICE}${scope} Resolve ../../references/ paths from this skill's folder, not the app working directory.\n${portableBody}`
  }
  if (metadata.size > 0) {
    out.push("metadata:")
    for (const [k, v] of metadata) {
      out.push(`  ${k}: ${quote(v)}`)
    }
  }
  return `---\n${out.join("\n")}\n---\n${portableBody}`
}

/** Refresh only generated prerequisites/scope for plugin-authored workflow skills. */
export function toAuthoredPortableSkill(source, name) {
  const dependencies = AUTHORED_PREREQUISITES[name]
  if (!dependencies) {
    throw new Error(`unknown authored skill: ${name}`)
  }
  const portable = toPortableSkill(source)
  const { lines, body } = splitSkill(portable)
  const entries = parseFrontmatter(lines)
  const updated = entries.flatMap((entry) => {
    if (entry.key !== "metadata") {
      return entry.raw
    }
    const metadata = { ...entry.value, requires: dependencies.join(" ") }
    return [
      "metadata:",
      ...Object.entries(metadata).map(
        ([key, value]) => `  ${key}: ${quote(value)}`
      ),
    ]
  })
  return `---\n${updated.join("\n")}\n---\n${body}`
}

/** Dependency validation is independent of a monorepo checkout. */
export function validateSkillPrerequisites(source, name, exists) {
  const problems = []
  for (const dependency of String(readSkillField(source, "requires") ?? "")
    .split(/\s+/)
    .filter(Boolean)) {
    if (
      !(SKILL_NAME_RE.test(dependency) && exists(`../${dependency}/SKILL.md`))
    ) {
      problems.push(`missing bundled prerequisite skill "${dependency}"`)
    }
  }
  const declared = String(readSkillField(source, "requires") ?? "").split(/\s+/)
  for (const dependency of AUTHORED_PREREQUISITES[name] ?? []) {
    if (!declared.includes(dependency)) {
      problems.push(`missing authored workflow prerequisite "${dependency}"`)
    }
  }
  const resources = String(readSkillField(source, "resources") ?? "")
    .split(/\s+/)
    .filter(Boolean)
  for (const resource of RESOURCE_PATHS) {
    if (!resources.includes(resource)) {
      problems.push(`missing bundled resource declaration "${resource}"`)
    }
  }
  for (const resource of resources) {
    if (
      !(
        // Resolve from SKILL.md: plugin-wide, own or sibling-skill references.
        // Only reference subtrees are allowed; no arbitrary parent traversal.
        /^(?:\.\.\/\.\.\/|\.\.\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?references\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.md$/.test(
          resource
        ) && exists(resource)
      )
    ) {
      problems.push(`missing or invalid bundled resource "${resource}"`)
    }
  }
  return problems
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
