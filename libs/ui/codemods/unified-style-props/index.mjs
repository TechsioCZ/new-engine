#!/usr/bin/env node
// Codemod for the @techsio/ui-kit unified style props. It is not published
// with the package; run it from a new-engine checkout (it uses that checkout's
// `typescript`) against the consumer's sources:
//
//   node <new-engine>/libs/ui/codemods/unified-style-props/index.mjs <app>/src [more paths…] [--dry]
//   node libs/ui/codemods/unified-style-props/index.mjs libs/ui/stories --kit-src libs/ui/src
//
// Only imports from `@techsio/ui-kit/...` count as the kit, plus relative
// imports that resolve into a `--kit-src` directory (the kit's own repo).
// Rewrites JSX props on ui-kit components to the new names:
//   Button family   theme → appearance (light→subtle, outlined→outline,
//                   borderless→ghost, "unstyled"→ boolean unstyled),
//                   variant → severity
//   Badge           variant → severity (outline → appearance="outline"
//                   severity="neutral", dynamic → severity="custom")
//   Skeleton        variant → severity      Icon     color → severity
//   ActionIcon      tone → severity         Input/Textarea variant → validateStatus
//   Pagination, RadioGroup, RadioCard, Steps, Tabs, Tooltip, Table, DataTable,
//   Accordion, Breadcrumb   variant → appearance
//   VerticalNavigation groups   tone → appearance, variant → severity
//   Sidebar.Pane    size → paneSize         ProductCard.Button buttonVariant → action
//   TotalsSummary rows   emphasis → severity
//
// Only string literals (and the literals an expression can return) are mapped.
// Object literals are reported, not rewritten, except TotalsSummary rows.
// Run TypeScript afterwards: anything the codemod could not see (spread props,
// values built at runtime, Button-shaped data objects) surfaces as a type error.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { transformSource } from "./transform.mjs"

const args = process.argv.slice(2)
const dry = args.includes("--dry")
const kitSources = []
const roots = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--kit-src") {
    kitSources.push(path.resolve(args[i + 1] ?? ""))
    i += 1
  } else if (!args[i].startsWith("--")) {
    roots.push(args[i])
  }
}
if (roots.length === 0) {
  process.stderr.write(
    "usage: unified-style-props/index.mjs <path> [more paths…] [--kit-src <dir>] [--dry]\n"
  )
  process.exit(1)
}

const SOURCE = /\.(tsx|jsx|ts)$/
const SKIP = new Set([
  "node_modules",
  "dist",
  ".next",
  "build",
  "storybook-static",
])

function* files(target) {
  const stat = statSync(target)
  if (stat.isFile()) {
    if (SOURCE.test(target) && !target.endsWith(".d.ts")) {
      yield target
    }
    return
  }
  for (const entry of readdirSync(target)) {
    if (!SKIP.has(entry)) {
      yield* files(path.join(target, entry))
    }
  }
}

let changed = 0
const allNotes = []
for (const root of roots) {
  for (const file of files(root)) {
    const before = readFileSync(file, "utf8")
    const { text, notes } = transformSource(file, before, { kitSources })
    allNotes.push(...notes)
    if (text !== before) {
      changed += 1
      if (!dry) {
        writeFileSync(file, text)
      }
      process.stdout.write(`${dry ? "would update" : "updated"} ${file}\n`)
    }
  }
}
for (const note of allNotes) {
  process.stdout.write(`  review: ${note}\n`)
}
process.stdout.write(
  `\n${changed} file(s) ${dry ? "would change" : "changed"}. Run your type checker to find the rest.\n`
)
