import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { syncBuiltinESMExports } from "node:module"
import { join } from "node:path"
import { test } from "node:test"
import {
  buildExports,
  isSingleColor,
  main,
  mergeMode,
  normalizeValue,
  parseDecls,
  validateDeclarations,
} from "./merge-figma-themes.mjs"

const INVALID_COLORS = [
  "rgb(0,0%,0)",
  "rgba(0%,0,0%,.5)",
  "rgb(none,0,0)",
  "rgb(0,0,0,none)",
  "hsl(none,20%,30%)",
  "hsl(90,none,30%)",
  "hsla(90,20%,30%,none)",
  "color-mix(in srgb,red -10%,blue)",
  "color-mix(in srgb,red,blue -1e1%)",
  "color-mix(in srgb,red 101%,blue)",
  "color-mix(in srgb,red,blue 1e3%)",
  "color-mix(in srgb,red 0%,blue 0%)",
  "color-mix(in srgb,rgb(none,0,0),blue)",
]

const declarations = (entries) => new Map(Object.entries(entries))
const modes = (entries) => ({
  light: declarations(entries),
  dark: declarations(entries),
})

test("importing the exporter performs no token reads or writes", () => {
  const url = new URL("./merge-figma-themes.mjs", import.meta.url).href
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const read = fs.readFileSync;
    fs.readFileSync = (path, ...args) => {
      if (String(path).endsWith('/merge-figma-themes.mjs')) return read(path, ...args);
      throw Error('Unexpected token read');
    };
    fs.writeFileSync = () => { throw Error('Unexpected write') };
    syncBuiltinESMExports();
    await import(${JSON.stringify(url)});
  `,
    ],
    { encoding: "utf8" }
  )
  assert.equal(child.status, 0, child.stderr)
})

test("composite shadow formatting is normalized without creating light-dark", () => {
  const light = parseDecls(
    ":root { --shadow-card: 0  1px  2px oklch(0 0 0 / .2), 0 3px 4px rgb(0, 0, 0); }"
  )
  const dark = parseDecls(
    ":root { --shadow-card: 0 1px 2px oklch( 0 0 0/.2 ) ,\n 0 3px 4px rgb(0 ,0,0); }"
  )
  const merged = mergeMode(light, dark).get("--shadow-card")
  assert.equal(merged, "0 1px 2px oklch(0 0 none/.2),0 3px 4px rgb(0,0,0)")
  assert.equal(merged.includes("light-dark"), false)
  assert.equal(normalizeValue("calc( 1rem +  2px )"), "calc(1rem + 2px)")
  assert.notEqual(
    normalizeValue("var(--x) var(--y)"),
    normalizeValue("var(--x)var(--y)")
  )
  assert.equal(normalizeValue("foo\\31  bar"), "foo\\31  bar")
  assert.equal(normalizeValue("foo bar"), "foo bar")
})

test("quoted text, escaped quotes, punctuation and grey-like strings are unchanged", () => {
  const value = String.raw`"A  ; , / oklch(0 0 0) \"B"`
  assert.equal(normalizeValue(value), value)
  const parsed = parseDecls(
    `/* --ignored: 1; */ :root { --font-label: ${value}; --size-label: 1rem; }`
  )
  assert.equal(parsed.get("--font-label"), value)
  assert.equal(parsed.get("--size-label"), "1rem")
  assert.equal(parsed.has("--ignored"), false)
  assert.throws(
    () =>
      mergeMode(
        declarations({ "--font-label": '"A  B"' }),
        declarations({ "--font-label": '"A B"' })
      ),
    /non-color/
  )
})

test("only known single colors can differ across modes", () => {
  for (const [light, dark] of [
    ["#fff", "#0008"],
    ["oklch(.9 0 0)", "oklch(.2 0 0)"],
    ["rgb(0, 0, 0)", "rgb(255,255,255)"],
    ["var(--color-white)", "var(--color-black)"],
    ["transparent", "currentColor"],
    ["color-mix(in oklch, white 20%, black)", "rebeccapurple"],
    ["color-mix(in oklch, rgb(0,0,0) 20%, var(--color-white))", "#ffffff"],
    ["hsl(180 20% 40%/.5)", "hsl(90,20%,30%)"],
  ]) {
    const merged = mergeMode(
      declarations({ "--color-card": light }),
      declarations({ "--color-card": dark })
    )
    assert.equal(
      merged.get("--color-card"),
      `light-dark(${normalizeValue(light)}, ${normalizeValue(dark)})`
    )
  }
  for (const value of [
    "1px solid red",
    "#fff, #000",
    '"red"',
    "var(--shadow-sm)",
    "rgb(0 0 0),red",
    "rgb(0 0 0) 1px 2px",
    "oklch(1px)",
    "rgb(red)",
    "rgb(0 0)",
    "color-mix(in oklch, 1px solid red, blue)",
  ]) {
    assert.equal(isSingleColor(value), false, value)
    assert.throws(
      () =>
        mergeMode(
          declarations({ "--color-card": value }),
          declarations({ "--color-card": "red" })
        ),
      /unsupported color/
    )
  }
})

test("legacy channels and color-mix percentages follow CSS color grammar", () => {
  for (const value of [
    "rgb(0,0,0)",
    "rgba(0%,50%,100%,20%)",
    "rgb(0 0% none/none)",
    "hsl(90,20%,30%,.5)",
    "hsl(none none none/none)",
    "color-mix(in srgb,red 0%,blue)",
    "color-mix(in srgb,red 100%,blue 0%)",
    "color-mix(in srgb,red 20%,blue 30%)",
    "color-mix(in srgb,red 1e1%,blue)",
  ]) {
    assert.equal(isSingleColor(value), true, value)
    assert.equal(
      mergeMode(
        declarations({ "--color-card": value }),
        declarations({ "--color-card": "white" })
      ).get("--color-card"),
      `light-dark(${normalizeValue(value)}, white)`
    )
  }
  for (const value of INVALID_COLORS) {
    assert.equal(isSingleColor(value), false, value)
    assert.throws(
      () =>
        mergeMode(
          declarations({ "--color-card": value }),
          declarations({ "--color-card": "white" })
        ),
      /unsupported color/,
      value
    )
  }
})

test("genuine non-color mode differences must be explicitly scoped, not color-wrapped", () => {
  for (const [name, light, dark] of [
    ["--shadow-card", "0 1px 2px #000", "0 2px 3px #000"],
    ["--spacing-card", "1rem", "2rem"],
    ["--font-card", '"Inter"', '"Arial"'],
    ["--size-card", "var(--dimension-4)", "var(--dimension-8)"],
  ]) {
    assert.throws(
      () =>
        mergeMode(
          declarations({ [name]: light }),
          declarations({ [name]: dark })
        ),
      /require explicit mode scopes/
    )
  }
})

test("pixel-named dimensions must serialize exactly at px / 16", () => {
  for (const px of [0, 1, 2, 6, 10, 14, 18, 30, 70, 768]) {
    validateDeclarations(
      declarations({ [`--dimension-${px}`]: `${px / 16}rem` })
    )
  }
  for (const [name, value] of [
    ["--dimension-1", "0.06rem"],
    ["--dimension-1", "0.062500000000000001rem"],
    ["--dimension-16", "1.rem"],
    ["--dimension-2", "0.13rem"],
    ["--dimension-70", "4.38rem"],
    ["--dimension-16", "16px"],
    ["--dimension-16", "var(--dimension-8)"],
  ]) {
    assert.throws(
      () => validateDeclarations(declarations({ [name]: value })),
      /expected exactly/
    )
  }
  validateDeclarations(declarations({ "--dimension-700": "4.375rem" }))
  validateDeclarations(
    declarations({
      "--dimension-700": "var(--dimension-70)",
      "--dimension-70": "4.375rem",
    })
  )
  assert.throws(
    () => validateDeclarations(declarations({ "--dimension-700": "43.75rem" })),
    /expected exactly 4.375rem/
  )
  assert.throws(
    () => validateDeclarations(declarations({ "--dimension-700": "4.38rem" })),
    /expected exactly/
  )
})

test("brightness rejects dimensions, including indirect aliases and cycles", () => {
  validateDeclarations(
    declarations({
      "--brightness-70": "0.7",
      "--brightness-active": "100%",
      "--brightness-card": "var(--brightness-70)",
    })
  )
  for (const value of ["4.38rem", "70px", "-1", "calc(1rem / 2)", '"0.7"']) {
    assert.throws(
      () => validateDeclarations(declarations({ "--brightness-card": value })),
      /brightness must/
    )
  }
  assert.throws(
    () =>
      validateDeclarations(
        declarations({
          "--brightness-card": "var(--size-card)",
          "--size-card": "1rem",
        })
      ),
    /brightness must/
  )
  assert.throws(
    () =>
      validateDeclarations(
        declarations({ "--brightness-card": "var(--brightness-card)" })
      ),
    /brightness must/
  )
})

test("pure rendering validates brands and includes only actual overrides", () => {
  const base = modes({ "--color-card": "red", "--spacing-card": "1rem" })
  const output = buildExports(base, [
    {
      attr: "akros",
      ...modes({ "--color-card": "blue", "--spacing-card": "1rem" }),
    },
  ])
  assert.match(output.variables, /@theme static/)
  assert.match(output.overrides, /\[data-theme="akros"\]/)
  assert.match(output.overrides, /--color-card: blue;/)
  assert.equal(output.overrides.includes("--spacing-card"), false)
  assert.throws(
    () => buildExports(base, [{ attr: '"] {}', ...base }]),
    /Invalid brand/
  )
  assert.throws(() => parseDecls(':root { --font-card: "broken; }'), /Unclosed/)
  assert.throws(
    () => parseDecls(":root { --shadow-card: rgb(0 0 0; }"),
    /Invalid|Unterminated/
  )
})

test("invalid inputs in the last brand cannot partially rewrite either export", () => {
  // Intercept the filesystem boundary: rejected exports must not even attempt a
  // write. Keep fixtures in memory so this regression needs no temporary tree.
  const directory = "/figma-merge-fixture"
  const files = new Map()
  const writes = []
  const originalRead = fs.readFileSync
  const originalWrite = fs.writeFileSync
  fs.readFileSync = (path) => {
    assert.ok(files.has(path), `Unexpected read: ${path}`)
    return files.get(path)
  }
  fs.writeFileSync = (path, content) => {
    writes.push(path)
    files.set(path, content)
  }
  syncBuiltinESMExports()
  try {
    const writeMode = (folder, declaration) =>
      files.set(
        join(directory, folder, "variables.css"),
        `:root { ${declaration} }`
      )
    const run = () =>
      main({
        figmaDir: directory,
        brands: [{ attr: "test", light: "brand-light", dark: "brand-dark" }],
      })
    writeMode("light", "--color-card: white;")
    writeMode("dark", "--color-card: black;")
    const outputs = ["variables.css", "brand-overrides.css"]
    for (const file of outputs) {
      files.set(join(directory, file), `original ${file}`)
    }
    for (const [light, invalid] of [
      ["--shadow-card: 0 1px 2px black;", "--shadow-card: 0 2px 4px black;"],
      ["--color-card: white;", "--dimension-1: .06rem;"],
      ["--color-card: white;", "--brightness-70: 4.38rem;"],
      ...INVALID_COLORS.flatMap((value) => [
        ["--color-card: white;", `--color-card: ${value};`],
        [`--color-card: ${value};`, "--color-card: white;"],
      ]),
    ]) {
      writeMode("brand-light", light)
      writeMode("brand-dark", invalid)
      assert.throws(
        run,
        /require explicit mode scopes|expected exactly|brightness must/
      )
      assert.deepEqual(writes, [])
      for (const file of outputs) {
        assert.equal(files.get(join(directory, file)), `original ${file}`)
      }
    }
    // Positive control: the same entrypoint and interception must write both
    // outputs for valid inputs, so a broken fixture cannot make rejection pass.
    writeMode("brand-light", "--color-card: red;")
    writeMode("brand-dark", "--color-card: blue;")
    run()
    assert.deepEqual(
      writes,
      outputs.map((file) => join(directory, file))
    )
  } finally {
    fs.readFileSync = originalRead
    fs.writeFileSync = originalWrite
    syncBuiltinESMExports()
  }
})
