import assert from "node:assert/strict"
import { globSync, readFileSync } from "node:fs"
import test from "node:test"
import { compile } from "tailwindcss"
import { analyzeUnusedTokens } from "./check-unused-tokens.js"
import { tokenInventory } from "./validate-token-graph.js"

function unused(css, source = "") {
  const inventory = tokenInventory([["entry.css", css]])
  return analyzeUnusedTokens(
    inventory,
    [["component.tsx", source]],
    new Set()
  ).unused.map(({ name }) => name)
}

test("duplicate declarations and prefix collisions are not consumers", () => {
  assert.deepEqual(
    unused(
      "@theme static { --color-a: red; --color-a: blue; --color-ab: red; }",
      '<div className="bg-ab"/>'
    ),
    ["--color-a"]
  )
})
test("orphan alias chains and isolated cycles remain unused", () => {
  assert.deepEqual(
    unused(
      "@theme static { --color-a: var(--color-b); --color-b: var(--color-a); --color-c: var(--color-a); }"
    ),
    ["--color-a", "--color-b", "--color-c"]
  )
})
test("real utility consumers keep their transitive aliases", () => {
  assert.deepEqual(
    unused(
      "@theme static { --color-a: var(--color-b); --color-b: red; }",
      '<div className="has-[input:focus]:bg-a"/>'
    ),
    []
  )
})
test("inactive snapshots never become roots or registrations", () => {
  const inventory = tokenInventory([
    ["src/tokens/_tokens-base.css", '@import "./active.css";'],
    ["src/tokens/active.css", "@theme static { --color-a: red; }"],
    [
      "src/tokens/figma/light/variables.css",
      ":root { color: var(--color-a); --color-inactive: red; }",
    ],
  ])
  assert.equal(inventory.registrations.has("--color-inactive"), false)
  assert.deepEqual(
    analyzeUnusedTokens(inventory, [], new Set()).unused.map(
      ({ name }) => name
    ),
    ["--color-a"]
  )
})
test("declarations outside @theme do not register Tailwind utilities", async () => {
  for (const css of [
    ":root { --color-audit: red; }",
    '[data-theme="akros"] { --color-audit: red; }',
    "@theme static { --color-audit: red; }",
  ]) {
    const inventory = tokenInventory([["entry.css", css]])
    const compiler = await compile(`${css} @tailwind utilities;`)
    assert.equal(
      compiler.build(["bg-audit"]).includes(".bg-audit"),
      inventory.registrations.has("--color-audit")
    )
  }
})
test("copyable authoring guidance agrees with the canonical names", () => {
  const guide = readFileSync(
    new URL("../token-contribution.md", import.meta.url),
    "utf8"
  )
  const skill = readFileSync(
    new URL("../skills/tailwind-token-authoring/SKILL.md", import.meta.url),
    "utf8"
  )
  assert.ok(guide.includes("AGENTS.md#naming-rules"))
  assert.ok(skill.includes("AGENTS.md#naming-rules"))
  assert.ok(!guide.includes("--border-button-width"))
  assert.ok(guide.includes("--border-width-button"))
  assert.ok(skill.includes("Reference aliases may omit roles"))
  assert.ok(skill.includes("focus-visible:outline-input-ring"))
})

test("the representative comparison maps every public component family", () => {
  const root = new URL("../", import.meta.url)
  const source = readFileSync(
    new URL("stories/overview/component-comparison.stories.tsx", root),
    "utf8"
  )
  const normalize = (value) => value.replaceAll(/[^a-z0-9]/gi, "").toLowerCase()
  const compact = normalize(source)
  // data-table.fields is an implementation helper, not a component. Hotkeys is
  // intentionally demonstrated by Command, which owns its focused recipe.
  const exceptions = new Set(["data-table.fields", "hotkeys"])
  for (const file of globSync(
    "src/{atoms,molecules,organisms,templates}/*.tsx",
    { cwd: root }
  )) {
    const name = file.split("/").at(-1).replace(".tsx", "")
    if (!exceptions.has(name)) {
      assert.ok(
        compact.includes(normalize(name)),
        `Add an overview card or companion story mapping for ${file}`
      )
    }
  }
})

test("comments and documentation strings are not executable usage roots", () => {
  for (const source of [
    "// Example: var(--color-a)",
    "/* Example: var(--color-a) */",
    'const docs = "Example: var(--color-a)";',
    'const docs = `Example: <div className="bg-a"/>`;',
    'type Example = "var(--color-a)";',
    '// tv({ base: "bg-a" })',
  ]) {
    assert.deepEqual(
      unused("@theme static { --color-a: red; }", source),
      ["--color-a"],
      source
    )
  }
})

test("scalar recipes and reached inline paint keep their dependencies", () => {
  for (const source of [
    'const styles = tv({base: "bg-a"});',
    'const styles = tv({slots: {root: "bg-a"}});',
    'const styles = tv({variants: {active: {true: "bg-a"}}});',
    'const App = () => <div style={{color: "var(--color-a)"}}/>;',
    'const ink = "var(--color-a)"; const App = () => <svg stroke={ink}/>;',
    'const style = {color: "var(--color-a)"}; const App = () => <div style={style}/>;',
  ]) {
    assert.deepEqual(
      unused(
        "@theme static { --color-a: var(--color-b); --color-b: red; }",
        source
      ),
      [],
      source
    )
  }
})
