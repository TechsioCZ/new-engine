#!/usr/bin/env node
/// <reference types="node" />
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
import path from "node:path"
import process from "node:process"

/** @typedef {[number, number]} Region */

const scriptDirectory = import.meta.dirname
const REPO_ROOT = path.resolve(scriptDirectory, "..", "..", "..", "..")
const COMP_DIR_ATOMS = path.join(
  REPO_ROOT,
  "libs/ui/src/tokens/components/atoms",
)
const FRAG_DIR_LIGHT = path.join(REPO_ROOT, "libs/ui/src/tokens/figma/light")
const FRAG_DIR_DARK = path.join(REPO_ROOT, "libs/ui/src/tokens/figma/dark")
const SPLITTER = path.join(scriptDirectory, "split-figma-tokens.mjs")

// Region markers — block removal is scoped to the substring between them.
// Hand-authored selector blocks at file root are left alone.
const REGION_START = "/* === FIGMA-GENERATED OVERRIDES START === */"
const REGION_END = "/* === FIGMA-GENERATED OVERRIDES END === */"

/**
 * @param {string} css - Component CSS source to scan for the managed region.
 * @returns {Region | null} Start/end offsets of the region, or null if absent.
 */
const findRegion = (css) => {
  const startIdx = css.indexOf(REGION_START)
  if (startIdx === -1) {
    return null
  }
  const endIdx = css.indexOf(REGION_END, startIdx + REGION_START.length)
  if (endIdx === -1) {
    return null
  }
  return [startIdx, endIdx + REGION_END.length]
}

// Component names must be plain kebab-case to be safe as filenames and CLI
// args. This rejects path traversal (../), shell metacharacters, and
// anything outside the expected token namespace.
const COMPONENT_NAME_RE = /^[a-z][a-z0-9-]*$/u
/**
 * @param {string} name - Component name to validate.
 * @returns {void}
 */
const assertSafeComponentName = (name) => {
  if (!COMPONENT_NAME_RE.test(name)) {
    throw new Error(
      `Refusing unsafe component name: ${JSON.stringify(name)}. ` +
        "Expected lowercase kebab-case (e.g., 'button', 'numeric-input').",
    )
  }
}

/**
 * @param {string} fragText - Raw fragment text including its header comment.
 * @returns {string} Fragment text with the header comment and following
 *   whitespace removed.
 */
const stripFragmentHeader = (fragText) => {
  const closing = fragText.indexOf("*/")
  if (closing === -1) {
    return fragText
  }
  let i = closing + 2
  while (i < fragText.length && (fragText[i] === "\n" || fragText[i] === " ")) {
    i += 1
  }
  return fragText.slice(i)
}

/**
 * @param {string} component - Component name to process.
 * @returns {void}
 */
const processComponent = (component) => {
  assertSafeComponentName(component)
  const compFile = path.join(COMP_DIR_ATOMS, `_${component}.css`)
  if (!existsSync(compFile)) {
    console.warn(`! skip ${component}: ${compFile} not found`)
    return
  }

  // 1. regenerate fragments — argv-style call, no shell interpolation.
  execFileSync(process.execPath, [SPLITTER, component], { stdio: "inherit" })

  const darkFragPath = path.join(FRAG_DIR_DARK, `${component}.css`)
  const lightFragPath = path.join(FRAG_DIR_LIGHT, `${component}.css`)
  if (!existsSync(darkFragPath)) {
    console.warn(`! skip ${component}: no dark fragment generated`)
    return
  }

  const fragText = stripFragmentHeader(
    readFileSync(darkFragPath, "utf-8"),
  ).trim()

  let comp = readFileSync(compFile, "utf-8")

  // If a previous FIGMA-GENERATED region exists, REPLACE it (markers and
  // all) with the fresh fragText. Splicing the stripped inner back used
  // to leave the old markers behind, so the next run would find two
  // regions and the strip would target an empty one (CodeRabbit on #425).
  //
  // Capture the surrounding text as STRINGS, not as a numeric index into
  // `comp`. Any subsequent normalisation (e.g. collapsing `\n{3,}`) can
  // shift character positions, so an index recorded here would no longer
  // point at the removal gap — slicing on a stale index would split the
  // file mid-rule (CodeRabbit follow-up on the same PR).
  let preferredPrefix = null
  let preferredSuffix = null
  const region = findRegion(comp)
  if (region) {
    const [start, end] = region
    preferredPrefix = comp.slice(0, start)
    preferredSuffix = comp.slice(end)
    comp = preferredPrefix + preferredSuffix
  }

  // Normalise overall (used by the @utility-heuristic fallback only; the
  // string-capture path normalises its prefix/suffix independently below).
  comp = `${comp.replaceAll(/\n{3,}/gu, "\n\n").trimEnd()}\n`

  // Insertion: prefer the captured strings around the removed region.
  // Otherwise fall back to the heuristic — insert before the first
  // @utility/@keyframes/@layer directive (so hand-authored utilities
  // stay at the file end), or append at EOF when nothing matches.
  let out
  if (preferredPrefix === null) {
    const insertAtMatch = /^(?<directive>@utility|@keyframes|@layer)/mu.exec(
      comp,
    )
    if (insertAtMatch) {
      const insertAt = insertAtMatch.index
      out = `${comp.slice(0, insertAt).trimEnd()}\n\n${fragText}\n\n${comp.slice(insertAt)}`
    } else {
      out = `${comp.trimEnd()}\n\n${fragText}\n`
    }
  } else {
    out = `${preferredPrefix.replaceAll(/\n{3,}/gu, "\n\n").trimEnd()}\n\n${fragText}\n\n${preferredSuffix.replace(/^\n+/u, "")}`
  }
  // Collapse 3+ blank lines
  out = out.replaceAll(/\n{3,}/gu, "\n\n")

  writeFileSync(compFile, out)
  console.log(`✓ patched ${compFile}`)

  // Clean up scratch fragments
  if (existsSync(lightFragPath)) {
    unlinkSync(lightFragPath)
  }
  if (existsSync(darkFragPath)) {
    unlinkSync(darkFragPath)
  }
}

/**
 * @returns {void}
 */
const main = () => {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error("usage: apply-reverse-blocks.mjs <comp> [<comp> ...]")
    process.exit(1)
  }
  for (const c of args) {
    processComponent(c)
  }
}

main()
