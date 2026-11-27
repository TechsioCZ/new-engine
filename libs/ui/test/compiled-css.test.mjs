import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { test } from "node:test"
import postcss from "postcss"
import ts from "typescript"
import {
  compiledCssPath,
  consumerVocabulary,
  kitUtilityNames,
} from "../scripts/compiled-css.mjs"

// Reads the build output; run after `pnpm build` (check:package does).
const uiRoot = path.resolve(import.meta.dirname, "..")
const css = await readFile(compiledCssPath, "utf8")

const classes = new Set()
postcss.parse(css).walkRules((rule) => {
  for (const [, escaped] of rule.selector.matchAll(
    /\.((?:\\[\da-f]{1,6} ?|\\.|[\w-])+)/gi
  )) {
    classes.add(
      escaped.replace(/\\(?:([\da-f]{1,6}) ?|(.))/gi, (_, hex, char) =>
        hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : char
      )
    )
  }
})

/** Class strings of every tv() config in a dist module, without variant keys or defaults. */
async function tvClasses(file) {
  const source = ts.createSourceFile(
    file,
    await readFile(path.join(uiRoot, "dist", file), "utf8"),
    ts.ScriptTarget.Latest
  )
  const found = new Set()
  const collect = (node) => {
    if (ts.isStringLiteralLike(node)) {
      for (const name of node.text.split(/\s+/).filter(Boolean)) {
        found.add(name)
      }
    } else if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach(collect)
    } else if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) {
          collect(property.initializer)
        }
      }
    }
  }
  const visit = (node) => {
    const [config] = node.arguments ?? []
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "tv" &&
      config &&
      ts.isObjectLiteralExpression(config)
    ) {
      for (const property of config.properties) {
        const key = property.name?.getText(source)
        if (!ts.isPropertyAssignment(property)) {
          continue
        }
        if (["base", "slots", "variants"].includes(key)) {
          collect(property.initializer)
        } else if (
          ["compoundVariants", "compoundSlots"].includes(key) &&
          ts.isArrayLiteralExpression(property.initializer)
        ) {
          for (const variant of property.initializer.elements) {
            for (const entry of variant.properties ?? []) {
              if (
                ["class", "className"].includes(entry.name?.getText(source))
              ) {
                collect(entry.initializer)
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  // group/peer markers only name an ancestor or sibling; they emit no rule.
  return [...found].filter((name) => !/^(group|peer)(\/|$)/.test(name))
}

test("ui-kit.css has no unresolved Tailwind at-rules", () => {
  assert.deepEqual(
    css.match(
      /@(?:import|theme|utility|apply|source|plugin|config|tailwind|custom-variant|variant|reference)\b/g
    ),
    null
  )
})

// Kit bug, not a compile gap: no token backs h-dialog-* (top/bottom dialog
// heights), so no Tailwind recipe styles them. Delete this once it is fixed.
const knownUnstyled = new Set(
  ["xs", "sm", "md", "lg", "xl"].map((size) => `h-dialog-${size}`)
)

test("ui-kit.css styles every class of sampled component variants", async () => {
  for (const file of [
    "atoms/button.js",
    "atoms/badge.js",
    "molecules/select.js",
    "molecules/dialog.js",
    "molecules/toast.js",
  ]) {
    const names = await tvClasses(file)
    assert.ok(names.length > 0, `no tv() classes found in dist/${file}`)
    const missing = names.filter(
      (name) => !(classes.has(name) || knownUnstyled.has(name))
    )
    assert.deepEqual(missing, [], `dist/${file} classes without a rule`)
  }
  assert.deepEqual(
    [...knownUnstyled].filter((name) => classes.has(name)),
    [],
    "a known kit gap is styled now; remove it from knownUnstyled"
  )
})

test("ui-kit.css carries every kit utility, including all token-icon-* glyphs", async () => {
  const names = await kitUtilityNames()
  assert.ok(names.filter((name) => name.startsWith("token-icon-")).length > 100)
  assert.deepEqual(
    names.filter((name) => !classes.has(name)),
    []
  )
})

// One class pattern per vocabulary family. A token rename or a token reader
// that stops matching empties a family, and the rule check alone would pass.
const vocabularySamples = {
  spacing: /^p-\d+$/,
  sizing: /^max-w-\dxl$/,
  color: /^text-fg-/,
  "color state": /^hover:bg-primary/,
  "text size": /^text-(xs|sm|md|lg)$/,
  "font weight": /^font-(normal|medium|semibold|bold)$/,
  radius: /^rounded-t-(sm|md|lg)$/,
  shadow: /^shadow-(sm|md|lg)$/,
  aspect: /^aspect-(square|video)$/,
  breakpoint: /^md:grid-cols-2$/,
}

test("ui-kit.css styles every class of the consumer vocabulary", async () => {
  const vocabulary = await consumerVocabulary()
  for (const [family, sample] of Object.entries(vocabularySamples)) {
    assert.ok(
      vocabulary.some((name) => sample.test(name)),
      `the ${family} family of the consumer vocabulary is empty`
    )
  }
  assert.deepEqual(
    vocabulary.filter((name) => !classes.has(name)),
    [],
    "consumer vocabulary classes without a rule"
  )
})
