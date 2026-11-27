import { glob, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import tailwind from "@tailwindcss/postcss"
import postcss from "postcss"

const uiRoot = path.resolve(import.meta.dirname, "..")
const tokensDir = path.join(uiRoot, "src/tokens")
const entry = path.join(tokensDir, "index.css")
export const compiledCssPath = path.join(uiRoot, "dist/ui-kit.css")

/**
 * Every static utility the kit defines with `@utility` (token-icon-* glyphs,
 * popup-*, tour-*, …). A consumer can pass any of them as a prop value, so the
 * precompiled stylesheet carries all of them, not only those the components
 * name. Functional utilities (`corner-*`) and arbitrary iconify classes
 * (`icon-[mdi--x]`) are unbounded and stay out.
 */
export async function kitUtilityNames() {
  const names = new Set()
  for await (const file of glob("**/*.css", { cwd: tokensDir })) {
    const css = await readFile(path.join(tokensDir, file), "utf8")
    for (const [, name] of css.matchAll(/@utility\s+([\w-]+)\s*\{/g)) {
      names.add(name)
    }
  }
  return [...names].sort()
}

/**
 * Compiles src/tokens/index.css into dist/ui-kit.css: Tailwind, tw-animate-css
 * and every token, generated only from the published component JavaScript
 * (index.css's own `@source "../../dist/**\/*.js"`) plus the kit utilities.
 * Run after rslib has emitted dist JS.
 */
export async function writeCompiledCss() {
  const source = await readFile(entry, "utf8")
  const tailwindImport = '@import "tailwindcss";'
  if (!source.includes(tailwindImport)) {
    throw new Error(`${entry} no longer contains ${tailwindImport}`)
  }
  // source(none) drops automatic detection, which would also scan stories and
  // tests; the explicit @source of shipped dist JS still applies.
  const css = `${source.replace(
    tailwindImport,
    '@import "tailwindcss" source(none);'
  )}\n@source inline("${(await kitUtilityNames()).join(" ")}");\n`
  const result = await postcss([
    tailwind({ base: uiRoot, optimize: { minify: true } }),
  ]).process(css, { from: entry, to: compiledCssPath })
  await writeFile(compiledCssPath, result.css)
}
