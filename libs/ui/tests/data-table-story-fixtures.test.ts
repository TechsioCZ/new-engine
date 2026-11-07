import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  new URL("../stories/organisms/data-table.stories.tsx", import.meta.url),
  "utf8"
)

const primaryExport =
  /id: "export",[\s\S]*?variant: "primary",[\s\S]*?onClick: fn\(\)/
const outlinedExport =
  /id: "export",[\s\S]*?variant: "secondary",\s*theme: "outlined",[\s\S]*?onClick: fn\(\)/
const destructiveDelete =
  /<Button\b(?=[^>]*variant="danger")(?=[^>]*theme="outlined")[\s\S]*?onClick=\{\(\) => \{ setCount\(4\); setLoading\(false\) \}\}>Delete last-page record<\/Button>/

function story(name: string) {
  const start = source.indexOf(`export const ${name}:`)
  if (start < 0) {
    throw new Error(`Missing story ${name}`)
  }
  const end = source.indexOf("\nexport const ", start + 1)
  return source.slice(start, end < 0 ? undefined : end)
}

describe("DataTable story fixture contracts", () => {
  it("uses primary Export alone and outlined secondary Export beside search", () => {
    expect(story("ToolbarActionsOnly")).toMatch(primaryExport)
    expect(story("ToolbarActions")).toMatch(outlinedExport)
  })

  it("marks the destructive fixture control without replacing its native callback", () => {
    const fixture = story("ShrinkingServerTotal")
    expect(fixture).toMatch(destructiveDelete)
    expect(fixture).toContain(
      '<Button theme="outlined" onClick={() => { setLoading(true); setCount(0) }}>Start refetch</Button>'
    )
    expect(fixture).toContain('name: "Delete last-page record" }).click()')
    expect(fixture).toContain(
      'expect(canvas.getByText("3–4 of 4")).toBeVisible()'
    )
  })

  it("keeps the loading-more skeleton after the complete bounded record set", () => {
    const fixture = story("LoadingMore")
    expect(fixture).toContain("data: people,")
    expect(fixture).toContain("loadingMore: true,")
    expect(fixture).toContain('maxHeight: "320px",')
    expect(fixture).toContain("onReachEnd: fn(),")
  })

  it("preserves authored footers and wide grouped-column stress data", () => {
    const fixture = story("GroupedFixedWidths")
    expect(fixture).toContain(
      'header: "Identity", footer: "People", columns: ['
    )
    expect(fixture).toContain(
      'accessorKey: "firstName", header: "First name", meta: { width: 200 }'
    )
    expect(fixture).toContain(
      'accessorKey: "lastName", header: "Last name", meta: { width: 200 }'
    )
    expect(fixture).toContain(
      'header: "Email", footer: "Contact details", meta: { width: 900 }'
    )
    expect(fixture).toContain('await userEvent.keyboard("{ArrowRight}")')
    expect(fixture).toContain('await userEvent.keyboard("{Home}")')
  })
})
