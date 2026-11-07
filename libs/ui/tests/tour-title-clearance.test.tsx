import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Tour } from "../src/molecules/tour"

const tokens = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/molecules/_tour.css", import.meta.url),
    "utf8"
  )
)

describe("Tour title clearance", () => {
  it("reserves the themed close target and gap relative to the panel inset", () => {
    const declarations = new Map<string, string>()
    tokens.walkAtRules("utility", (rule) => {
      if (rule.params === "tour-title-safe") {
        rule.walkDecls((declaration) => {
          declarations.set(
            declaration.prop,
            declaration.value.replace(/\s+/g, "")
          )
        })
      }
    })
    // Keep the old minimum, but follow Business's larger touch target too.
    expect(declarations.get("padding-inline-end")).toBe(
      "max(var(--spacing-tour-title),calc(var(--size-icon-control-md)+var(--spacing-tour-close)+var(--spacing-tour-content)-var(--padding-tour)))"
    )
    expect(declarations.has("padding-right")).toBe(false)
    expect(declarations.has("padding-left")).toBe(false)
  })

  it.each(["ltr", "rtl"] as const)(
    "wires logical title clearance without moving the %s scrollport or controls",
    (dir) => {
      const html = renderToStaticMarkup(
        <Tour dir={dir} steps={[]}>
          <Tour.Content>
            <Tour.CloseTrigger />
            <Tour.Title>A guide with longer content</Tour.Title>
            <Tour.Description>
              <p>Welcome. Read this guide at your own pace.</p>
              <p>Finish. All guidance remains available.</p>
            </Tour.Description>
            <Tour.ProgressText>1 of 1</Tour.ProgressText>
            <Tour.Actions>
              <Tour.ActionTrigger action="dismiss">Finish</Tour.ActionTrigger>
            </Tour.Actions>
          </Tour.Content>
        </Tour>
      )
      expect(html).toContain("tour-title-safe shrink-0")
      expect(html).not.toContain("pe-tour-title")
      expect(html).toContain("size-icon-control-md")
      expect(html).toContain("end-tour-close top-tour-close")
      expect(html).toContain("A guide with longer content</div>")
      expect(html).toContain('aria-label="Tour guidance"')
      expect(html).toContain('role="group"')
      expect(html).toContain('tabindex="0"')
      expect(html).toContain("min-h-0 overflow-y-auto overscroll-contain")
      expect(html).toContain(
        "<p>Welcome. Read this guide at your own pace.</p><p>Finish. All guidance remains available.</p></div><span"
      )
      expect(html).toContain("1 of 1</span>")
      expect(html).toContain("Finish</button>")
    }
  )
})
