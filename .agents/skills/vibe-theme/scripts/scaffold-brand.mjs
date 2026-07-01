#!/usr/bin/env node
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
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..")
const FIGMA_DIR = join(REPO_ROOT, "libs/ui/src/tokens/figma")

const BRAND_RE = /^[a-z][a-z0-9-]*$/

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function copyMode(srcMode, destMode, force) {
  const src = join(FIGMA_DIR, srcMode, "variables.css")
  const destDir = join(FIGMA_DIR, destMode)
  const dest = join(destDir, "variables.css")
  if (!existsSync(src)) {
    die(`base file missing: ${src}`)
  }
  if (existsSync(dest) && !force) {
    die(`${dest} already exists — pass --force to overwrite`)
  }
  mkdirSync(destDir, { recursive: true })
  copyFileSync(src, dest)
  console.log(`✓ ${destMode}/variables.css  (copied from ${srcMode}/)`)
}

function main() {
  const args = process.argv.slice(2)
  const force = args.includes("--force")
  const brand = args.find((a) => !a.startsWith("--"))

  if (!brand) {
    die("usage: scaffold-brand.mjs <brand> [--force]")
  }
  if (!BRAND_RE.test(brand)) {
    die(`invalid brand "${brand}" — use lowercase kebab-case (a-z, 0-9, -)`)
  }
  if (brand === "light" || brand === "dark" || brand === "base") {
    die(`"${brand}" is reserved`)
  }

  copyMode("light", brand, force)
  copyMode("dark", `${brand}-dark`, force)

  console.log("")
  console.log("Next steps (see vibe-theme SKILL.md):")
  console.log(`  1. Edit ONLY the brand-defining tokens in both new files.`)
  console.log(`  2. Register "${brand}" in merge-figma-themes.mjs BRANDS and`)
  console.log(`     theme-config.ts THEMES.`)
  console.log(`  3. node .agents/skills/vibe-theme/scripts/validate-brand.mjs ${brand}`)
  console.log(`  4. node .agents/skills/figma-token-binding/scripts/merge-figma-themes.mjs`)
}

main()
