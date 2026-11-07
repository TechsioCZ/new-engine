import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Table } from "../src/organisms/table"
import { WithStickyColumn } from "../stories/organisms/table.stories"

const css = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/organisms/_table.css", import.meta.url),
    "utf8"
  )
)

function utility(name: string) {
  let result: postcss.AtRule | undefined
  css.walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      result = rule
    }
  })
  if (!result) {
    throw new Error(`Missing Table utility: ${name}`)
  }
  return result
}

function declarations(rule: postcss.Container) {
  const values = new Map<string, string>()
  rule.walkDecls(({ prop, value }) => {
    values.set(prop, value)
  })
  return values
}

function selectors(rule: postcss.Container) {
  const values: string[] = []
  rule.walkRules(({ selector }) => {
    values.push(selector)
  })
  return values
}

describe("Table frozen surfaces and dividers", () => {
  it("opts only sticky-first-column tables into cell-owned dividers", () => {
    const ordinary = renderToStaticMarkup(<Table />)
    const frozen = renderToStaticMarkup(
      <Table dir="rtl" stickyFirstColumn stickyHeader variant="striped">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Product</Table.ColumnHeader>
            <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row selected>
            <Table.Cell>Laptop</Table.Cell>
            <Table.Cell numeric>50</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    )
    expect(ordinary).not.toContain("table-frozen-grid")
    expect(frozen).toContain("table-frozen-grid")
    expect(frozen).toContain('dir="rtl"')
    expect(frozen).toContain("first:inset-s-0")
    expect(frozen).toContain("first:table-frozen-cell")
    expect(frozen).toContain('aria-selected="true"')
    expect(frozen).toContain('data-selected="true"')
    expect(frozen).toContain('data-numeric="true"')
    expect(frozen).not.toContain("odd:bg-table-row-striped-primary")
    expect(frozen).not.toContain("even:bg-table-row-striped-secondary")

    const grid = utility("table-frozen-grid")
    const values = declarations(grid)
    expect(values.get("border-collapse")).toBe("separate")
    expect(values.get("border-spacing")).toBe("0")
    expect(selectors(grid)).toContain(
      "& > :is(thead, tbody, tfoot) > tr > :is(td, th)"
    )
    expect(values.get("border-block-end")).toBe("inherit")
    expect(declarations(utility("table-frozen-cell")).has("box-shadow")).toBe(
      false
    )
  })

  it("stripes only records and lets hover and selection outrank the stripe", () => {
    const striped = utility("table-row-striped")
    expect(selectors(striped)).toEqual([
      "&:where(tbody > tr)",
      ":where(tbody > &:nth-child(odd))",
      ":where(tbody > &:nth-child(even))",
    ])
    expect(declarations(striped).get("background-color")).toBe(
      "var(--table-row-tint, transparent)"
    )
    const hover = selectors(utility("table-row-interactive"))[0]
    expect(hover).toBe('&:where(tbody > tr:hover:not([data-selected="true"]))')
  })

  it("keeps frozen totals on the footer surface and retains selected opacity", () => {
    const frozen = utility("table-frozen-cell")
    let footer: postcss.Rule | undefined
    let selected: postcss.Rule | undefined
    frozen.walkRules((rule) => {
      if (rule.selector === "tfoot > tr > &") {
        footer = rule
      }
      if (rule.selector === 'tr[data-selected="true"] > &') {
        selected = rule
      }
    })
    if (!(footer && selected)) {
      throw new Error("Missing frozen surface state")
    }
    expect(declarations(footer).get("background-color")).toBe(
      "var(--color-table-footer-bg)"
    )
    expect(declarations(footer).get("background-image")).toBe("none")
    expect(declarations(selected).get("background-image")).toContain(
      "var(--color-table-row-bg-selected)"
    )
    expect(declarations(selected).get("color")).toBe(
      "var(--color-table-row-fg-selected)"
    )
  })

  it("frames the intentionally bounded scroll demo without hiding any data", () => {
    if (!WithStickyColumn.render) {
      throw new Error("Missing frozen-column story")
    }
    const html = renderToStaticMarkup(
      WithStickyColumn.render(WithStickyColumn.args as never, {} as never)
    )
    expect(html).toContain("max-w-lg")
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain("overflow-x-auto")
    expect(html).toContain("rounded-table")
    expect(html).toContain("border-(length:--border-table-width)")
    expect(html).toContain("border-table-border")
    for (const value of ["SKU-123456", "Warehouse A", "In Stock", "$999.99"]) {
      expect(html).toContain(value)
    }
  })
})
