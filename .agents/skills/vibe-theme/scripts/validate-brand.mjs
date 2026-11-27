#!/usr/bin/env node
/*
 * Validate runtime brand data (a JSON BrandDefinition) with the kit's brand
 * validator, the same one an application runs where it stores brands.
 *
 * Usage (after `pnpm --dir libs/ui build`):
 *   node .agents/skills/vibe-theme/scripts/validate-brand.mjs <brand.json>
 *
 * The kit's own Figma brands are validated by libs/ui/tests/brand-themes.test.ts.
 * Exit code is non-zero when the brand has errors; warnings never fail.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const { validateBrand } = await import(
  new URL("../../../../libs/ui/dist/theme/brand-validator.js", import.meta.url)
)

const path = process.argv[2]
if (!path) {
  console.error("usage: validate-brand.mjs <brand.json>")
  process.exit(1)
}
const result = validateBrand(JSON.parse(readFileSync(resolve(path), "utf8")))
for (const warning of result.warnings) {
  console.warn(`  ⚠ ${warning}`)
}
if (result.ok) {
  console.log(`  ✓ ${result.brand.key} is a valid brand`)
} else {
  for (const error of result.errors) {
    console.error(`  ✗ ${error}`)
  }
  process.exit(1)
}
