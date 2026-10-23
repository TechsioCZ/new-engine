/* Shared, read-only inventory of the shipped CSS import graph. Raw exporter
 * snapshots are deliberately not roots. Keep CSS scopes and registrations. */
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const IMPORT = /^(?:url\()?['"]([^'"]+)['"]/
const TOKEN = /^--[\w-]+$/
const COMMENTS = /\/\*[\s\S]*?\*\//g
const BRAND = /\[data-theme\s*=\s*["']?([\w-]+)/
const DARK = /(?:^|[\s,(])\.(?:dark|always-dark)(?:[\s,:).]|$)/
const LIGHT = /(?:^|[\s,(])\.(?:light|always-light)(?:[\s,:).]|$)/
const BOUNDARY =
  /:root|:scope|\.(?:light|dark|always-light|always-dark|reverse)(?![\w-])|\[data-theme(?:\s*=\s*["']?[\w-]+["']?)?\s*\]/g
const NEGATION = /:not\([^)]*\)/g
const RAW_EXPORT = /figma\/(?:light|dark|akros|neo|business)\//
const WORDS = /\s+/
const SELECTOR_ALTERNATIVE = /:(?:where|is)\(/
const SCREEN_MEDIA = /^(?:all|screen)$/
const TARGET_SPLIT = /\s+(?![^[]*\])/
const COMBINATOR = /[>+~]/
const IMPORT_CLOSE = /^\)/
const IMPORT_LAYER = /^layer(?:\([^)]*\))?\s*/
const BRANDS = ["base", "neo", "business", "akros"]

function skipQuoted(value, start) {
  const quote = value[start]
  let index = start + 1
  for (; index < value.length; index += 1) {
    if (value[index] === "\\") {
      index += 1
      continue
    }
    if (value[index] === quote) {
      return index
    }
  }
  return index
}

// Shared balanced function bounds. Commas inside strings/functions are not
// fallback separators; escaped quotes must not terminate a string.
function functionBounds(value, start) {
  let depth = 1
  let comma = -1
  let end = start
  for (; end < value.length; end += 1) {
    const char = value[end]
    if (char === "\\") {
      end += 1
      continue
    }
    if (char === "'" || char === '"') {
      end = skipQuoted(value, end)
      continue
    }
    if (char === "(") {
      depth += 1
    }
    if (char === ")") {
      depth -= 1
    }
    if (!depth) {
      break
    }
    if (char === "," && depth === 1 && comma === -1) {
      comma = end
    }
  }
  return { end, comma }
}

export function variableCalls(value, includeStrings = false) {
  const calls = []
  const expression = value.replace(COMMENTS, "")
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index]
    if (char === "\\") {
      index += 1
      continue
    }
    if (!includeStrings && (char === "'" || char === '"')) {
      index = skipQuoted(expression, index)
      continue
    }
    if (!expression.startsWith("var(", index)) {
      continue
    }
    const start = index + 4
    const { end, comma } = functionBounds(expression, start)
    const name = expression.slice(start, comma === -1 ? end : comma).trim()
    if (!TOKEN.test(name)) {
      continue
    }
    calls.push({
      name,
      fallback: comma === -1 ? null : expression.slice(comma + 1, end),
      end: end + 1,
    })
    index = end
  }
  return calls
}

export function missingVariables(value, isDefined) {
  const missing = new Set()
  for (const { name, fallback } of variableCalls(value)) {
    if (isDefined(name)) {
      continue
    }
    if (fallback === null) {
      missing.add(name)
    } else {
      for (const token of missingVariables(fallback, isDefined)) {
        missing.add(token)
      }
    }
  }
  return [...missing]
}

export function referencedVariables(value, includeStrings = false) {
  return variableCalls(value, includeStrings).flatMap(({ name, fallback }) => [
    name,
    ...(fallback === null ? [] : referencedVariables(fallback, includeStrings)),
  ])
}

// Expand selector alternatives before classifying their TARGET element. A brand
// ancestor must never turn `[data-theme=akros] .widget` into a root definition.
function selectorBranches(selector) {
  return postcss.list.comma(selector).flatMap((branch) => {
    const match = SELECTOR_ALTERNATIVE.exec(branch)
    if (!match) {
      return [branch.trim()]
    }
    const start = match.index + match[0].length
    const { end } = functionBounds(branch, start)
    return selectorBranches(branch.slice(start, end)).flatMap((part) =>
      selectorBranches(
        branch.slice(0, match.index) + part + branch.slice(end + 1)
      )
    )
  })
}

function boundarySelector(selector) {
  const positive = selector.replace(NEGATION, "")
  return positive.length > 0 && positive.replace(BOUNDARY, "").trim() === ""
}

function conditionOf(node) {
  if (node.type !== "atrule") {
    return null
  }
  if (
    !["media", "supports", "container", "starting-style"].includes(node.name)
  ) {
    return null
  }
  const params = node.params.trim().replace(/\s+/g, " ")
  // An OS-appearance query is independent of the app's explicitly selected
  // color scheme, just like print/hover/viewport conditions.
  if (node.name === "media" && SCREEN_MEDIA.test(params)) {
    return null
  }
  return `${node.name}:${params}`
}

function selectorScopes(ancestors) {
  let branches = [""]
  for (const parent of [...ancestors].reverse()) {
    let selector = null
    if (parent.type === "rule") {
      selector = parent.selector
    }
    if (parent.type === "atrule" && parent.name === "scope") {
      selector = parent.params.split(" to ")[0].slice(1, -1)
    }
    if (!selector) {
      continue
    }
    branches = branches.flatMap((prefix) =>
      selectorBranches(selector).map((part) =>
        part.includes("&")
          ? part.replaceAll("&", prefix)
          : `${prefix} ${part}`.trim()
      )
    )
  }
  return branches
}

function selectorMode(selector) {
  const positive = selector.replace(NEGATION, "")
  const dark = DARK.test(positive)
  const light = LIGHT.test(positive)
  if (dark === light) {
    return null
  }
  return dark ? "dark" : "light"
}

function scopesOf(node, inheritedConditions = []) {
  const ancestors = []
  for (let parent = node.parent; parent; parent = parent.parent) {
    ancestors.push(parent)
  }
  const atRules = new Set(
    ancestors
      .filter((parent) => parent.type === "atrule")
      .map((parent) => parent.name)
  )
  const registered = atRules.has("theme")
  const utility = atRules.has("utility")
  const layered = registered || atRules.has("layer")
  const conditions = [
    ...new Set([
      ...inheritedConditions,
      ...ancestors.map(conditionOf).filter(Boolean),
    ]),
  ]
  return selectorScopes(ancestors).map((selector) => {
    const positive = selector.replace(NEGATION, "")
    // Only a boundary target can supply inherited aliases. A descendant, sibling
    // or arbitrary attribute/class is local even if a brand occurs earlier.
    const target = positive.split(TARGET_SPLIT).at(-1)
    const globalSelector =
      boundarySelector(positive) && !COMBINATOR.test(positive)
    return {
      brand: positive.match(BRAND)?.[1] ?? null,
      mode: selectorMode(target),
      registered,
      layered,
      global: registered || (!utility && globalSelector),
      utility,
      conditions,
      selector,
      owner: node.parent,
      ancestors,
    }
  })
}

function declarationEntries(node, file, inheritedConditions) {
  return scopesOf(node, inheritedConditions).map((scope) => ({
    file,
    line: node.source.start.line,
    name: node.prop,
    value: node.value,
    ...scope,
  }))
}

function indexUtilityDependency(node, inventory) {
  if (node.type !== "atrule" || node.name !== "apply") {
    return
  }
  let parent = node.parent
  while (parent && !(parent.type === "atrule" && parent.name === "utility")) {
    parent = parent.parent
  }
  if (!parent) {
    return
  }
  const dependencies =
    inventory.utilityDependencies.get(parent.params) ?? new Set()
  for (const dependency of node.params.split(WORDS)) {
    dependencies.add(dependency)
  }
  inventory.utilityDependencies.set(parent.params, dependencies)
}

function indexNode(node, file, inventory, inheritedConditions) {
  indexUtilityDependency(node, inventory)
  if (node.type === "atrule" && node.name === "utility") {
    inventory.utilities.add(node.params)
  }
  if (node.type !== "decl") {
    return
  }
  for (const entry of declarationEntries(node, file, inheritedConditions)) {
    if (node.prop.startsWith("--")) {
      inventory.definitions.push(entry)
      if (entry.registered) {
        inventory.registrations.add(node.prop)
      }
    } else {
      inventory.consumers.push(entry)
    }
  }
}

export function tokenInventory(files, entrypoints) {
  const sources = files instanceof Map ? files : new Map(files)
  const inventory = {
    files: [],
    registrations: new Set(),
    definitions: [],
    consumers: [],
    utilities: new Set(),
    utilityDependencies: new Map(),
  }
  const visited = new Set()
  function visit(input, inheritedConditions = [], importing = new Set()) {
    const file = path.normalize(input)
    const key = `${file}:${[...inheritedConditions].sort().join("|")}`
    if (visited.has(key) || importing.has(file)) {
      return
    }
    visited.add(key)
    const nextImports = new Set(importing).add(file)
    const raw = sources.get(file)
    if (raw === undefined) {
      throw new Error(`Missing active CSS import: ${file}`)
    }
    inventory.files.push([file, raw])
    const css = postcss.parse(raw, { from: file })
    css.walk((node) => {
      if (node.type === "atrule" && node.name === "import") {
        const match = node.params.match(IMPORT)
        const relative = match?.[1]
        if (relative?.startsWith(".")) {
          const suffix = node.params
            .slice(match[0].length)
            .replace(IMPORT_CLOSE, "")
            .trim()
            .replace(IMPORT_LAYER, "")
          const condition = suffix
            ? conditionOf({ type: "atrule", name: "media", params: suffix })
            : null
          visit(
            path.join(path.dirname(file), relative),
            [...inheritedConditions, ...(condition ? [condition] : [])],
            nextImports
          )
        }
      } else {
        indexNode(node, file, inventory, inheritedConditions)
      }
    })
  }
  const defaults = sources.has("src/tokens/_tokens-base.css")
    ? ["src/tokens/_tokens-base.css"]
    : [...sources.keys()].filter((file) => !RAW_EXPORT.test(file))
  for (const file of entrypoints ?? defaults) {
    visit(file)
  }
  return inventory
}

export function loadRuntimeInventory() {
  const files = new Map()
  function load(file) {
    if (files.has(file)) {
      return
    }
    const raw = readFileSync(path.join(ROOT, file), "utf8")
    files.set(file, raw)
    postcss.parse(raw).walkAtRules("import", (node) => {
      const relative = node.params.match(IMPORT)?.[1]
      if (relative?.startsWith(".")) {
        load(path.join(path.dirname(file), relative))
      }
    })
  }
  load("src/tokens/_tokens-base.css")
  return tokenInventory(files, ["src/tokens/_tokens-base.css"])
}

export const supportedScopes = BRANDS.flatMap((brand) =>
  (brand === "akros" || brand === "business"
    ? ["light"]
    : ["light", "dark"]
  ).map((mode) => ({ brand, mode }))
)

export function entryApplies(entry, { brand, mode, conditions = [] }) {
  return (
    (!entry.brand || entry.brand === brand) &&
    (!entry.mode || entry.mode === mode) &&
    entry.conditions.every((condition) => conditions.includes(condition))
  )
}

export function conditionalScopes(inventory) {
  const conditions = new Map([["", []]])
  for (const entry of [...inventory.definitions, ...inventory.consumers]) {
    const key = [...entry.conditions].sort().join("|")
    conditions.set(key, entry.conditions)
  }
  return supportedScopes.flatMap((scope) =>
    [...conditions.values()].map((assumptions) => ({
      ...scope,
      conditions: assumptions,
    }))
  )
}

export function effectiveDefinitions(inventory, scope) {
  const definitions = new Map()
  // @theme is layered. Unlayered application/brand overrides take precedence.
  for (const layered of [true, false]) {
    for (const entry of inventory.definitions) {
      if (entry.layered !== layered || !entry.global) {
        continue
      }
      if (!entryApplies(entry, scope)) {
        continue
      }
      definitions.set(entry.name, entry)
    }
  }
  return definitions
}
