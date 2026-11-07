import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import postcss from "postcss"

// CSS contracts only; these do not substitute for WebKit rendering checks.
const tokens = postcss.parse(
  readFileSync(
    new URL(
      "../src/tokens/components/organisms/_data-table.css",
      import.meta.url
    ),
    "utf8"
  )
)

function utility(name) {
  const rule = tokens.nodes.find(
    (node) =>
      node.type === "atrule" && node.name === "utility" && node.params === name
  )
  if (!rule) {
    throw new Error(`Missing ${name}`)
  }
  return rule
}

function declarations(rule) {
  return new Map(
    rule.nodes
      .filter((node) => node.type === "decl")
      .map((node) => [node.prop, node.value.replace(/\s+/g, "")])
  )
}

function nestedRule(rule, selector) {
  const child = rule.nodes.find(
    (node) => node.type === "rule" && node.selector === selector
  )
  if (!child) {
    throw new Error(`Missing ${selector}`)
  }
  return child
}

test("frozen cells retain their explicit logical row separator", () => {
  const frozen = declarations(utility("data-table-frozen-cell"))
  assert.equal(
    frozen.get("border-block-end"),
    "var(--border-width-data-table)solidvar(--color-data-table-border)"
  )
  assert.equal(frozen.has("border-bottom"), false)
  assert.equal(frozen.has("z-index"), false)
})

test("nested tint paints ordinary cells rather than a collapsed-row shadow", () => {
  const nested = utility("data-table-row-nested-tint")
  const row = declarations(nested)
  assert.equal(
    row.get("--dt-row-nested-tint"),
    "var(--color-data-table-row-bg-nested)"
  )
  assert.equal(row.has("box-shadow"), false)
  // Do not replace the stripe/selection/hover channel inherited by frozen cells.
  assert.equal(row.has("--dt-row-tint"), false)
  const cell = declarations(
    nestedRule(nested, "& > :where(td:not(.data-table-frozen-cell))")
  )
  assert.equal(
    cell.get("background-image"),
    "linear-gradient(var(--dt-row-nested-tint),var(--dt-row-nested-tint))"
  )
  assert.equal(cell.has("background-color"), false)
})

test("frozen cells composite nested tint once over the same row state", () => {
  const frozen = declarations(utility("data-table-frozen-cell"))
  assert.equal(
    frozen.get("background-color"),
    "var(--color-data-table-pinned-cell-bg)"
  )
  assert.equal(
    frozen.get("background-image"),
    "linear-gradient(var(--dt-row-nested-tint,transparent),var(--dt-row-nested-tint,transparent)),linear-gradient(var(--dt-row-tint,transparent),var(--dt-row-tint,transparent))"
  )
})

test("cell surfaces leave pinned boundary paint and RTL directions independent", () => {
  for (const side of ["start", "end"]) {
    const pinned = utility(`data-table-pinned-${side}`)
    const normal = declarations(pinned)
    assert.equal(
      normal.get("box-shadow"),
      `var(--shadow-data-table-pinned-${side})`
    )
    const edge = declarations(nestedRule(pinned, "&::after"))
    assert.equal(edge.get("pointer-events"), "none")
    const opposite = side === "start" ? "end" : "start"
    assert.equal(
      edge.get(`border-inline-${opposite}`),
      "var(--border-width-data-table)solidvar(--color-data-table-border)"
    )
    const rtl = declarations(
      nestedRule(pinned, '&:where([dir="rtl"], [dir="rtl"] *)')
    )
    assert.equal(
      rtl.get("box-shadow"),
      `var(--shadow-data-table-pinned-${opposite})`
    )
  }
})

test("expanded details use the scrollport measure and retain both cell gutters", () => {
  const detail = declarations(utility("data-table-detail-viewport"))
  assert.equal(detail.get("position"), "sticky")
  assert.equal(detail.get("inset-inline-start"), "var(--dt-detail-cell-inset)")
  assert.equal(
    detail.get("inline-size"),
    "calc(100cqi-2*var(--dt-detail-cell-inset))"
  )
  assert.equal(detail.get("max-inline-size"), "100%")
  assert.equal(detail.get("min-inline-size"), "0")
  assert.equal(detail.get("box-sizing"), "border-box")
  assert.equal(detail.get("white-space"), "normal")
  assert.equal(detail.get("overflow-wrap"), "anywhere")
})

test("detail sizing follows each existing Table.Cell size without changing padding", () => {
  const detail = utility("data-table-detail-viewport")
  assert.equal(
    declarations(detail).get("--dt-detail-cell-inset"),
    "var(--spacing-data-table-detail-inset-md)"
  )
  const aliases = new Map()
  tokens.walkDecls((decl) => aliases.set(decl.prop, decl.value))
  for (const size of ["sm", "md", "lg"]) {
    assert.equal(
      aliases.get(`--spacing-data-table-detail-inset-${size}`),
      `var(--padding-table-cell-${size}-x)`
    )
    if (size !== "md") {
      assert.equal(
        declarations(
          nestedRule(detail, `:where(.p-table-cell-${size}) > &`)
        ).get("--dt-detail-cell-inset"),
        `var(--spacing-data-table-detail-inset-${size})`
      )
    }
  }
  assert.equal(declarations(detail).has("padding"), false)
})

test("detail content remains in measurable flow without vertical caps or clipping", () => {
  const detail = utility("data-table-detail-viewport")
  detail.walkDecls((decl) => {
    assert.equal(
      [
        "height",
        "block-size",
        "max-height",
        "max-block-size",
        "overflow",
        "overflow-x",
        "overflow-y",
        "z-index",
      ].includes(decl.prop),
      false,
      `Unexpected detail constraint: ${decl.prop}`
    )
  })
  const content = declarations(nestedRule(detail, "& > *"))
  assert.equal(content.get("min-inline-size"), "0")
  assert.equal(content.get("max-inline-size"), "100%")
})
