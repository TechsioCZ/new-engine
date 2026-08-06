#!/usr/bin/env node
/// <reference types="node" />
/*
 * Scaffold a new *code-authored* ("vibed") brand by copying the base brand's
 * per-mode token files into a fresh brand folder pair. The theme-creator agent
 * then edits ONLY the brand-defining tokens in place.
 *
 * Why copy instead of author from scratch:
 *   - Guarantees token-NAME parity with base (all 1782 names, both modes) by
 *     construction — the merge + parity validator both depend on this.
 *   - Every token the agent does NOT touch stays byte-identical to base, so
 *     merge-figma-themes.mjs emits it as a non-diff and the brand inherits the
 *     whole system via the existing var() chains. This is the "touch
 *     primitives, inherit the rest" guarantee that keeps a vibed theme as
 *     consistent as a Figma-exported one.
 *
 * Usage:
 *   node .agents/skills/vibe-theme/scripts/scaffold-brand.mjs <brand>
 *   node .agents/skills/vibe-theme/scripts/scaffold-brand.mjs <brand> --force
 *
 * Produces:
 *   libs/ui/src/tokens/figma/<brand>/variables.css        (copy of light/)
 *   libs/ui/src/tokens/figma/<brand>-dark/variables.css   (copy of dark/)
 *
 * After scaffolding, the agent must still register the brand in:
 *   - .agents/skills/figma-token-binding/scripts/merge-figma-themes.mjs  (BRANDS)
 *   - libs/ui/src/theme/theme-config.ts                                  (THEMES)
 * and then run merge-figma-themes.mjs. See the vibe-theme SKILL.md.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const SCRIPT_DIRECTORY = import.meta.dirname
const REPO_ROOT = path.resolve(SCRIPT_DIRECTORY, "..", "..", "..", "..")
const FIGMA_DIR = path.join(REPO_ROOT, "libs/ui/src/tokens/figma")

const BRAND_RE = /^[a-z][a-z0-9-]*$/u

/*
 * Names that must never be scaffolded over, even with --force: the base modes
 * and the canonical Figma-exported brands. Their token files are the
 * source of truth and are NOT regenerable from base, so a stray
 * `scaffold-brand neo --force` must not clobber them. Add future
 * Figma-exported brands here; code-authored ("vibed") brands are safe to
 * overwrite while iterating and are deliberately absent.
 */
const RESERVED = new Set(["light", "dark", "base", "neo", "neo-dark"])

/**
 * @param {string} message - Failure detail.
 * @returns {never} This function always exits.
 */
const die = (message) => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

/**
 * @param {string} sourceMode - Base mode to copy.
 * @param {string} destinationMode - Brand mode to create.
 * @param {boolean} force - Whether an existing destination may be replaced.
 */
const copyMode = (sourceMode, destinationMode, force) => {
  const src = path.join(FIGMA_DIR, sourceMode, "variables.css")
  const destDir = path.join(FIGMA_DIR, destinationMode)
  const dest = path.join(destDir, "variables.css")
  if (!existsSync(src)) {
    die(`base file missing: ${src}`)
  }
  if (existsSync(dest) && !force) {
    die(`${dest} already exists — pass --force to overwrite`)
  }
  mkdirSync(destDir, { recursive: true })
  copyFileSync(src, dest)
  console.log(
    `✓ ${destinationMode}/variables.css  (copied from ${sourceMode}/)`,
  )
}

/** @returns {string[]} Validated command-line arguments. */
const readArguments = () => {
  /** @type {unknown} */
  const rawArguments = process.argv.slice(2)
  if (
    !Array.isArray(rawArguments) ||
    !rawArguments.every((argument) => typeof argument === "string")
  ) {
    return die("usage: scaffold-brand.mjs <brand> [--force]")
  }
  return rawArguments.map(String)
}

const main = () => {
  const cliArguments = readArguments()
  const force = cliArguments.includes("--force")
  const brand = cliArguments.find((argument) => !argument.startsWith("--"))

  if (brand === undefined || brand.length === 0) {
    die("usage: scaffold-brand.mjs <brand> [--force]")
  }
  if (!BRAND_RE.test(brand)) {
    die(`invalid brand "${brand}" — use lowercase kebab-case (a-z, 0-9, -)`)
  }
  if (RESERVED.has(brand)) {
    die(
      `"${brand}" is a reserved/canonical brand and cannot be scaffolded over`,
    )
  }

  copyMode("light", brand, force)
  copyMode("dark", `${brand}-dark`, force)

  console.log("")
  console.log("Next steps (see vibe-theme SKILL.md):")
  console.log("  1. Edit ONLY the brand-defining tokens in both new files.")
  console.log(`  2. Register "${brand}" in merge-figma-themes.mjs BRANDS and`)
  console.log("     theme-config.ts THEMES.")
  console.log(
    `  3. node .agents/skills/vibe-theme/scripts/validate-brand.mjs ${brand}`,
  )
  console.log(
    "  4. node .agents/skills/figma-token-binding/scripts/merge-figma-themes.mjs",
  )
}

main()
