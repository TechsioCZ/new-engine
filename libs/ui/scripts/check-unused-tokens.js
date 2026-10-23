#!/usr/bin/env node
/* Reachability, not textual occurrence counts. Public extension tokens are
 * candidates for review, never deletion instructions. Raw exports are not roots. */
import { globSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
  effectiveDefinitions,
  loadRuntimeInventory,
  referencedVariables,
  supportedScopes,
} from "./validate-token-graph.js"
import {
  extractSourceConsumers,
  extractTailwindClasses,
  extractTokensFromArbitraryUtility,
  mapClassToPossibleTokens,
  stripClassModifiers,
} from "./validate-token-usage.js"

const ROOT = fileURLToPath(new URL("../", import.meta.url))

/** Explicit extension-point classification. Do not make every export a root. */
export const publicExtensionTokens = new Set([
  "--font-sans",
  "--font-body",
  "--font-heading",
])

function sourceRoots(inventory, sources, publicTokens) {
  const roots = new Set(publicTokens)
  const utilities = new Set()
  for (const [, source] of sources) {
    for (const value of extractSourceConsumers(source).paint) {
      for (const token of referencedVariables(value)) {
        roots.add(token)
      }
    }
    for (const className of extractTailwindClasses(source)) {
      utilities.add(stripClassModifiers(className))
      for (const token of extractTokensFromArbitraryUtility(className)) {
        roots.add(token)
      }
      for (const candidate of mapClassToPossibleTokens(className)) {
        if (inventory.registrations.has(candidate)) {
          roots.add(candidate)
        }
      }
    }
  }
  return { roots, utilities }
}

function activeDependencies(inventory) {
  const tokens = new Map(),
    dependencies = new Map()
  for (const scope of supportedScopes) {
    for (const [name, entry] of effectiveDefinitions(inventory, scope)) {
      tokens.set(name, entry)
      const edges = dependencies.get(name) ?? new Set()
      for (const dependency of referencedVariables(entry.value)) {
        edges.add(dependency)
      }
      dependencies.set(name, edges)
    }
  }
  return { tokens, dependencies }
}

function styleRoots(inventory, roots, utilities) {
  const entries = [
    ...inventory.consumers,
    ...inventory.definitions.filter((entry) => !entry.global),
  ]
  for (const entry of entries) {
    const utility = entry.ancestors.find(
      (node) => node.type === "atrule" && node.name === "utility"
    )?.params
    if (utility && !utilities.has(utility)) {
      continue
    }
    for (const token of referencedVariables(entry.value)) {
      roots.add(token)
    }
  }
}

function dependencyClosure(roots, dependencies) {
  const used = new Set(roots)
  const queue = [...roots]
  // Array iterators include newly appended elements; no shift/repeated scanning.
  for (const name of queue) {
    for (const dependency of dependencies.get(name) ?? []) {
      if (!used.has(dependency)) {
        used.add(dependency)
        queue.push(dependency)
      }
    }
  }
  return used
}

export function analyzeUnusedTokens(
  inventory,
  sources,
  publicTokens = publicExtensionTokens
) {
  const { roots, utilities } = sourceRoots(inventory, sources, publicTokens)
  const { tokens, dependencies } = activeDependencies(inventory)
  for (const utility of utilities) {
    for (const dependency of inventory.utilityDependencies?.get(utility) ??
      []) {
      utilities.add(dependency)
    }
  }
  styleRoots(inventory, roots, utilities)
  const used = dependencyClosure(roots, dependencies)
  const unused = [...tokens]
    .filter(([name]) => !used.has(name))
    .map(([name, entry]) => ({ name, file: entry.file, line: entry.line }))
  return { unused, used, tokens }
}

function main() {
  const inventory = loadRuntimeInventory()
  const sources = globSync("{src,stories}/**/*.{ts,tsx,js,jsx}", {
    cwd: ROOT,
    exclude: ["**/*.test.*", "**/*.spec.*"],
  }).map((file) => [file, readFileSync(path.join(ROOT, file), "utf8")])
  const result = analyzeUnusedTokens(inventory, sources)
  const requested = process.argv
    .find((arg) => arg.startsWith("--token="))
    ?.slice(8)
  for (const token of result.unused) {
    if (!requested || requested === token.name) {
      console.log(
        `${token.file}:${token.line}: potentially unused ${token.name}`
      )
    }
  }
  console.log(
    `${result.tokens.size} active tokens; ${result.unused.length} review candidates. Public extension tokens are classified explicitly; external application usage still requires review.`
  )
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main()
}
