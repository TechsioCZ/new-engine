import { describe, expect, it } from "vitest"
import { transformSource } from "../codemods/unified-style-props/transform.mjs"

const run = (source: string) =>
  (transformSource("example.tsx", source) as { text: string; notes: string[] })
    .text

const imports = `import { Button } from "@techsio/ui-kit/atoms/button"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Input } from "@techsio/ui-kit/atoms/input"
import { Accordion } from "@techsio/ui-kit/molecules/accordion"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import { Tabs } from "@techsio/ui-kit/molecules/tabs"
import { Sidebar } from "@techsio/ui-kit/organisms/sidebar"
import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"
`

describe("unified-style-props codemod", () => {
  it("renames Button color and fill props", () => {
    const out = run(
      `${imports}<Button variant="danger" theme="outlined">Delete</Button>`
    )
    expect(out).toContain('<Button severity="danger" appearance="outline">')
  })

  it("maps every legacy Button theme", () => {
    const out = run(
      `${imports}<><Button theme="light" /><Button theme="borderless" /><Button theme="unstyled" /></>`
    )
    expect(out).toContain('<Button appearance="subtle" />')
    expect(out).toContain('<Button appearance="ghost" />')
    expect(out).toContain("<Button unstyled />")
  })

  it("maps literals inside expressions and flags identifiers", () => {
    const result = transformSource(
      "example.tsx",
      `${imports}<><Button theme={on ? "solid" : "outlined"} /><Badge variant={tone} /></>`
    ) as { text: string; notes: string[] }
    expect(result.text).toContain('appearance={on ? "solid" : "outline"}')
    expect(result.text).toContain("severity={tone}")
    expect(result.notes.join("\n")).toContain("severity={tone}")
  })

  it("splits Badge outline and dynamic", () => {
    const out = run(
      `${imports}<><Badge variant="outline">A</Badge><Badge variant="dynamic">B</Badge><Badge variant="info">C</Badge></>`
    )
    expect(out).toContain('<Badge appearance="outline" severity="neutral">A')
    expect(out).toContain('<Badge severity="custom">B')
    expect(out).toContain('<Badge severity="info">C')
  })

  it("renames style variants to appearance with new value names", () => {
    const out = run(
      `${imports}<><Pagination variant="minimal" /><Tabs variant="default" /><Accordion variant="child" /></>`
    )
    expect(out).toContain('<Pagination appearance="ghost" />')
    expect(out).toContain('<Tabs appearance="underline" />')
    expect(out).toContain('<Accordion appearance="ghost" nested />')
  })

  it("renames validation, pane size and navigation props", () => {
    const out = run(
      `${imports}<><Input variant="error" /><Sidebar.Pane size="rail" /><VerticalNavigation.Group tone="accent" variant="secondary" /></>`
    )
    expect(out).toContain('<Input validateStatus="error" />')
    expect(out).toContain('<Sidebar.Pane paneSize="rail" />')
    expect(out).toContain(
      '<VerticalNavigation.Group appearance="solid" severity="secondary" />'
    )
  })

  it("treats compound triggers as Button props and rewrites theme objects", () => {
    const out = run(
      `${imports}<Tabs.Trigger theme="solid" variant="secondary" />; const action = { theme: "outlined", label: "Go" }`
    )
    expect(out).toContain(
      '<Tabs.Trigger appearance="solid" severity="secondary" />'
    )
    expect(out).toContain('{ appearance: "outline", label: "Go" }')
  })

  it("leaves files without ui-kit imports alone", () => {
    const source = `import { Button } from "other-lib"\n<Button variant="danger" theme="outlined" />`
    expect(run(source)).toBe(source)
  })
})
