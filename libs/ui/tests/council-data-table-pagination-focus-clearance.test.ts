import { readFileSync } from "node:fs"
import { fileURLToPath, URL } from "node:url"
import { describe, expect, it } from "vitest"

const css = readFileSync(
  fileURLToPath(
    new URL(
      "../src/tokens/components/organisms/_data-table.css",
      import.meta.url
    )
  ),
  "utf8"
)
const whitespace = /\s+/g
const navigationRule =
  /@utility data-table-pagination-controls\s*\{[\s\S]*?& > nav\s*\{([^}]+)\}/

describe("DataTable pagination focus scrollport", () => {
  it("reserves the shared contrast halo through two-layer component aliases", () => {
    const compact = css.replace(whitespace, "")
    expect(compact).toContain(
      "--spacing-data-table-focus-paint:calc(var(--default-ring-offset)+var(--default-ring-width)*2);"
    )
    expect(compact).toContain(
      "--padding-data-table-pagination-focus:var(--spacing-data-table-focus-paint);"
    )
  })

  it("reserves focus paint when a middle control is scrolled into view", () => {
    expect(css.replace(whitespace, "")).toContain(
      "&>nav:is(a,button){scroll-margin-inline:var(--padding-data-table-pagination-focus);}"
    )
  })

  it("compensates internal clearance without removing native scrolling or growing the footer", () => {
    const navigation = css.match(navigationRule)?.[1]?.replace(whitespace, "")
    expect(navigation).toBeDefined()
    expect(navigation).toContain("box-sizing:content-box;")
    expect(navigation).toContain(
      "padding:var(--padding-data-table-pagination-focus);"
    )
    expect(navigation).toContain(
      "margin:calc(-1*var(--padding-data-table-pagination-focus));"
    )
    expect(navigation).toContain(
      "scroll-padding:var(--padding-data-table-pagination-focus);"
    )
    expect(navigation).toContain("overflow-x:auto;")
  })
})
