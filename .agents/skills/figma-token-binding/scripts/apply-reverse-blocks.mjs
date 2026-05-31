#!/usr/bin/env node
/*
 * Splice the splitter's regenerated dark fragment (which now includes
 * .reverse selectors) into each migrated component's _<comp>.css file.
 *
 * For each component:
 *   1. Regenerate fragments by running the splitter for that component.
 *   2. Find and remove the existing dark/@media blocks in _<comp>.css.
 *   3. Insert the new dark fragment body (sans header) at the original spot.
 *   4. Delete the scratch fragment files.
 *
 * Idempotent: if a file already has the new selectors, regenerate them anyway
 * (values come from Figma export so output is deterministic).
 *
 * Usage:
 *   node apply-reverse-blocks.mjs <comp> [<comp> ...]
 */

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..")
const COMP_DIR_ATOMS = join(REPO_ROOT, "libs/ui/src/tokens/components/atoms")
const FRAG_DIR_LIGHT = join(REPO_ROOT, "libs/ui/src/tokens/figma/light")
const FRAG_DIR_DARK = join(REPO_ROOT, "libs/ui/src/tokens/figma/dark")
const SPLITTER = join(__dirname, "split-figma-tokens.mjs")

// Component names must be plain kebab-case to be safe as filenames and CLI
// args. This rejects path traversal (../), shell metacharacters, and
// anything outside the expected token namespace.
const COMPONENT_NAME_RE = /^[a-z][a-z0-9-]*$/
function assertSafeComponentName(name) {
  if (!COMPONENT_NAME_RE.test(name)) {
    throw new Error(
      `Refusing unsafe component name: ${JSON.stringify(name)}. ` +
        "Expected lowercase kebab-case (e.g., 'button', 'numeric-input')."
    )
  }
}

function findClosingBrace(text, openIdx) {
  // openIdx points to '{'
  let depth = 0
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function removeFirstBlock(text, startRegex) {
  const m = text.match(startRegex)
  if (!m) return { text, removed: false }
  const start = m.index
  const open = text.indexOf("{", start)
  const close = findClosingBrace(text, open)
  if (close === -1) return { text, removed: false }
  // Also gobble the trailing newline(s)
  let end = close + 1
  while (end < text.length && text[end] === "\n") end++
  return { text: text.slice(0, start) + text.slice(end), removed: true }
}

function stripFragmentHeader(fragText) {
  const closing = fragText.indexOf("*/")
  if (closing === -1) return fragText
  let i = closing + 2
  while (i < fragText.length && (fragText[i] === "\n" || fragText[i] === " "))
    i++
  return fragText.slice(i)
}

function processComponent(component) {
  assertSafeComponentName(component)
  const compFile = join(COMP_DIR_ATOMS, `_${component}.css`)
  if (!existsSync(compFile)) {
    console.warn(`! skip ${component}: ${compFile} not found`)
    return
  }

  // 1. regenerate fragments — argv-style call, no shell interpolation.
  execFileSync(process.execPath, [SPLITTER, component], { stdio: "inherit" })

  const darkFragPath = join(FRAG_DIR_DARK, `${component}.css`)
  const lightFragPath = join(FRAG_DIR_LIGHT, `${component}.css`)
  if (!existsSync(darkFragPath)) {
    console.warn(`! skip ${component}: no dark fragment generated`)
    return
  }

  const fragText = stripFragmentHeader(
    readFileSync(darkFragPath, "utf8")
  ).trim()

  let comp = readFileSync(compFile, "utf8")

  // Remove every existing class-based dark block AND any reverse-related
  // blocks left over from earlier runs; we will reinsert from the fragment.
  // Order matters: collect insertion point, then strip, then insert.
  const darkStartRegex =
    /:is\(\.dark, \.always-dark\)(?:,\s*\n:is\(\.light, \.always-light\) \.reverse)? \{/
  let insertionIdx = -1
  const firstDarkMatch = comp.match(darkStartRegex)
  if (firstDarkMatch) insertionIdx = firstDarkMatch.index

  // Strip in repeated passes — there are up to 5 candidate selectors to remove.
  const candidateRegexes = [
    /:is\(\.dark, \.always-dark\),\s*\n:is\(\.light, \.always-light\) \.reverse \{/,
    /:is\(\.dark, \.always-dark\) \.reverse \{/,
    /:is\(\.dark, \.always-dark\) \{/,
    /@media \(prefers-color-scheme: dark\) \{/,
    /@media \(prefers-color-scheme: light\) \{/,
  ]
  for (let pass = 0; pass < 20; pass++) {
    let changed = false
    for (const re of candidateRegexes) {
      const { text, removed } = removeFirstBlock(comp, re)
      if (removed) {
        comp = text
        changed = true
      }
    }
    if (!changed) break
  }

  // Trim trailing whitespace before the insertion gap, then trim leading at gap
  comp = comp.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n"

  // Find the end of the last @theme block (or top of file if none) to insert after
  const inject = "\n" + fragText + "\n"
  // Find the position of the original first dark block in the original text — we
  // already lost it. Instead, append fragment after the last `}` of the
  // @theme static block, before any @utility or @keyframes blocks.
  // Heuristic: find the first @utility/@keyframes/@layer directive; insert before it.
  const insertAtMatch = comp.match(/^(@utility|@keyframes|@layer)/m)
  let out
  if (insertAtMatch) {
    const insertAt = insertAtMatch.index
    out =
      comp.slice(0, insertAt).trimEnd() +
      "\n\n" +
      fragText +
      "\n\n" +
      comp.slice(insertAt)
  } else {
    out = comp.trimEnd() + "\n\n" + fragText + "\n"
  }
  // Collapse 3+ blank lines
  out = out.replace(/\n{3,}/g, "\n\n")

  writeFileSync(compFile, out)
  console.log(`✓ patched ${compFile}`)

  // Clean up scratch fragments
  if (existsSync(lightFragPath)) unlinkSync(lightFragPath)
  if (existsSync(darkFragPath)) unlinkSync(darkFragPath)
}

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error("usage: apply-reverse-blocks.mjs <comp> [<comp> ...]")
    process.exit(1)
  }
  for (const c of args) processComponent(c)
}

main()
