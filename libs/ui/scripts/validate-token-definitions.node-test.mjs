import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import { findUndefinedReferences } from "./validate-token-definitions.js"

const LIGHT_DARK = /light-dark/
const NONZERO_TOKEN_COUNT = /Found [1-9]\d+ total tokens/

test("undefined references include shared, primitive and brand declarations", () => {
  const missing = findUndefinedReferences([
    [
      "shared.css",
      ":root { --font-label: var(--font-bold); --ok: var(--weight); }",
    ],
    ["figma.css", "@theme static { --weight: 700; }"],
    ["brand.css", '[data-theme="akros"] { --brand: var(--missing); }'],
  ])
  assert.deepEqual(
    [...new Set(missing.map(({ token }) => token))],
    ["--font-bold", "--missing"]
  )
})

test("optional fallbacks and documented runtime variables are allowed", () => {
  assert.deepEqual(
    findUndefinedReferences([
      [
        "popup.css",
        ":root { --a: var(--layer-index, 0); --b: var(--available-height); }",
      ],
    ]),
    []
  )
})

test("commented definitions do not hide missing tokens", () => {
  const missing = findUndefinedReferences([
    ["shared.css", "/* --ghost: red; */\n:root { --real: var(--ghost); }"],
  ])
  assert.equal(missing[0].line, 2)
  assert.equal(missing[0].token, "--ghost")
})

test("definition validator scans package tokens from an unrelated cwd", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("./validate-token-definitions.js", import.meta.url)
      ),
    ],
    { cwd: "/", encoding: "utf8" }
  )
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, NONZERO_TOKEN_COUNT)
})

test("brand-local corrections resolve inside nested scheme scopes without replacing other brands", () => {
  const css = postcss.parse(
    readFileSync(
      new URL("../src/tokens/_scheme-scopes.css", import.meta.url),
      "utf8"
    )
  )
  const foregrounds = new Map()
  css.walkAtRules("scope", (scope) => {
    const entries = new Map()
    scope.walkDecls((decl) => entries.set(decl.prop, decl.value))
    foregrounds.set(scope.params, entries)
  })
  const business = foregrounds.get(
    '([data-theme="business"]) to ([data-theme])'
  )
  assert.equal(
    business.get("--color-fg-on-primary-solid"),
    "var(--color-white)"
  )
  assert.equal(
    business.get("--color-fg-on-primary-solid-neo"),
    "var(--color-white)"
  )
  const neo = foregrounds.get('([data-theme="neo"]) to ([data-theme])')
  assert.match(neo.get("--color-fg-on-primary-solid"), LIGHT_DARK)
})

test("cycles fail in the effective scope, including unused self cycles", () => {
  for (const content of [
    ":root { --a: var(--a); }",
    ":root { --a: var(--b); --b: var(--a); }",
  ]) {
    assert.ok(
      findUndefinedReferences([["entry.css", content]]).some(
        (error) => error.kind === "cycle"
      )
    )
  }
  assert.deepEqual(
    findUndefinedReferences([
      ["entry.css", ":root { --a: var(--b); --b: red; }"],
    ]),
    []
  )
})

test("inactive raw snapshots and another brand cannot satisfy a dependency", () => {
  const files = [
    [
      "src/tokens/_tokens-base.css",
      '@import "./active.css"; :root { --a: var(--only-brand); --b: var(--inactive); }',
    ],
    ["src/tokens/active.css", '[data-theme="akros"] { --only-brand: red; }'],
    [
      "src/tokens/figma/light/variables.css",
      "@theme static { --inactive: red; }",
    ],
  ]
  const missing = findUndefinedReferences(files)
  assert.ok(missing.some((error) => error.token === "--inactive"))
  assert.ok(
    missing.some(
      (error) => error.token === "--only-brand" && error.brand === "base"
    )
  )
  assert.ok(
    !missing.some(
      (error) => error.token === "--only-brand" && error.brand === "akros"
    )
  )
})

test("mode-only definitions do not satisfy an opposing mode", () => {
  const missing = findUndefinedReferences([
    [
      "entry.css",
      ":root { --a: var(--only-dark); } .dark { --only-dark: red; }",
    ],
  ])
  assert.ok(
    missing.some(
      (error) => error.token === "--only-dark" && error.mode === "light"
    )
  )
  assert.ok(
    !missing.some(
      (error) => error.token === "--only-dark" && error.mode === "dark"
    )
  )
})

test("nested fallbacks are checked only when their primary variable is absent", () => {
  assert.deepEqual(
    findUndefinedReferences([
      ["entry.css", ":root { --a: var(--optional, var(--other, red)); }"],
    ]),
    []
  )
  const missing = findUndefinedReferences([
    ["entry.css", ":root { --a: var(--optional, var(--other)); }"],
  ])
  assert.ok(missing.some((error) => error.token === "--other"))
})

test("CSS substitution sees BOTH light-dark branches before resolving color", () => {
  for (const css of [
    ":root { --a: light-dark(var(--b), red); --b: light-dark(blue, var(--a)); }",
    ":root { --a: light-dark(red, var(--a)); }",
    ":root { --a: light-dark(var(--a), blue); }",
  ]) {
    const errors = findUndefinedReferences([["entry.css", css]])
    for (const [brand, mode] of [
      ["akros", "light"],
      ["base", "light"],
      ["base", "dark"],
    ]) {
      assert.ok(
        errors.some(
          (error) =>
            error.kind === "cycle" &&
            error.brand === brand &&
            error.mode === mode
        )
      )
    }
  }
  const errors = findUndefinedReferences([
    ["entry.css", ":root { --a: light-dark(red, var(--missing)); }"],
  ])
  assert.ok(
    errors.some(
      (error) => error.token === "--missing" && error.mode === "light"
    )
  )
})

test("conditional definitions cannot satisfy unconditional screen aliases", () => {
  for (const condition of [
    "@media print",
    "@media (min-width: 2000px)",
    "@supports (unknown: value)",
    "@container (width > 300px)",
  ]) {
    const errors = findUndefinedReferences([
      [
        "entry.css",
        `:root { --a: var(--b); } ${condition} { :root { --b: red; } }`,
      ],
    ])
    assert.ok(
      errors.some(
        (error) => error.token === "--b" && error.conditions.length === 0
      ),
      condition
    )
    assert.ok(
      !errors.some(
        (error) => error.token === "--b" && error.conditions.length > 0
      ),
      condition
    )
    assert.deepEqual(
      findUndefinedReferences([
        ["entry.css", `${condition} { :root { --a: var(--b); --b: red; } }`],
      ]),
      []
    )
  }
})

test("conditional imports preserve their availability", () => {
  const errors = findUndefinedReferences(
    [
      ["entry.css", '@import "./print.css" print; :root { --a: var(--b); }'],
      ["print.css", ":root { --b: red; }"],
    ],
    new Set(),
    ["entry.css"]
  )
  assert.ok(
    errors.some(
      (error) => error.token === "--b" && error.conditions.length === 0
    )
  )
})

test("descendant definitions cannot flow upwards or sideways into root aliases", () => {
  for (const local of [
    '[data-theme="akros"] .audit-widget',
    ":root .audit-widget",
    ':where([data-theme="akros"]) .audit-widget',
    '[data-theme="akros"][data-widget]',
    '[data-theme="akros"] + .audit-widget',
  ]) {
    const errors = findUndefinedReferences([
      [
        "entry.css",
        `[data-theme="akros"] { --a: var(--b); } ${local} { --b: red; }`,
      ],
    ])
    assert.ok(
      errors.some((error) => error.token === "--b" && error.brand === "akros"),
      local
    )
  }
  assert.deepEqual(
    findUndefinedReferences([
      ["entry.css", '[data-theme="akros"] { --a: var(--b); --b: red; }'],
    ]),
    []
  )
  assert.deepEqual(
    findUndefinedReferences([
      [
        "entry.css",
        ".audit-widget { --a: var(--b); --b: red; color: var(--a); }",
      ],
    ]),
    []
  )
  const errors = findUndefinedReferences([
    ["entry.css", ".audit-widget { --a: var(--missing); color: var(--a); }"],
  ])
  assert.ok(errors.some((error) => error.token === "--missing"))
})

test("local aliases retain their element scope and cycle semantics", () => {
  const cycle = findUndefinedReferences([
    [
      "entry.css",
      ".audit-widget { --a: light-dark(var(--b),red); --b: light-dark(blue,var(--a)); }",
    ],
  ])
  assert.ok(cycle.some((error) => error.kind === "cycle"))
  const scoped = findUndefinedReferences([
    [
      "entry.css",
      '[data-theme="akros"] { --a: var(--b); } @scope ([data-theme="akros"]) { .audit-widget { --b: red; } }',
    ],
  ])
  assert.ok(
    scoped.some((error) => error.token === "--b" && error.brand === "akros")
  )
  assert.deepEqual(
    findUndefinedReferences([
      ["base.css", ".audit-widget { --a: var(--b); color: var(--a); }"],
      ["widget.css", ".audit-widget { --b: red; }"],
    ]),
    []
  )
})
