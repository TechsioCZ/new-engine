import { readFileSync } from "node:fs"
import {
  type ComponentProps,
  type ComponentType,
  createElement as h,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import commandMeta, { InDialog } from "../stories/molecules/command.stories"

vi.mock("../src/molecules/dialog", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/molecules/dialog")>()
  return {
    ...actual,
    Dialog: (props: ComponentProps<typeof actual.Dialog>) =>
      h(actual.Dialog, { ...props, open: true, portal: false }),
  }
})

const dialogTag = /<div\b[^>]*\brole="dialog"[^>]*>/
const classAttribute = /\bclass="([^"]+)"/
const whitespace = /\s+/

const renderPalette = () => {
  const Example = InDialog.render as ComponentType<typeof commandMeta.args>
  return renderToStaticMarkup(h(Example, commandMeta.args))
}

describe("Command dialog available height", () => {
  it("opts into a scoped height override instead of competing generic max-height aliases", () => {
    const html = renderPalette()
    const classes = html
      .match(dialogTag)?.[0]
      .match(classAttribute)?.[1]
      ?.split(whitespace)
    expect(classes).toContain("command-dialog-viewport")
    expect(classes?.filter((name) => name.startsWith("max-h-"))).toEqual([
      "max-h-dialog-center-h-max",
    ])
  })

  it("overrides the host selector on mobile and retains the host limit from sm upward", () => {
    const css = readFileSync(
      new URL(
        "../src/tokens/components/molecules/_command.css",
        import.meta.url
      ),
      "utf8"
    )
    const utility = css.slice(css.indexOf("@utility command-dialog-viewport"))
    expect(utility).toContain('&[data-scope="dialog"][data-part="content"]')
    const [mobile, desktop] = utility.split("@variant sm")
    expect(mobile).toContain(
      "max-height: var(--height-command-dialog-viewport);"
    )
    expect(desktop).toContain("max-height: var(--height-dialog-center-h-max);")
    expect(utility).not.toContain("!important")
  })

  it("retains the full palette inside the scrollable dialog body", () => {
    const html = renderPalette()
    expect(html).toContain("dialog-scroll-viewport flex min-h-0")
    expect(html).toContain("overflow-y-auto")
    expect(html).toContain('aria-label="Close dialog"')
    expect(html).toContain("Command palette</h2>")
    expect(html).toContain("Search and run an action.")
    expect(html).toContain("Escape closes the palette.")
    expect(html).toContain('role="combobox"')
    expect(html.match(/role="option"/g)).toHaveLength(3)
    for (const item of commandMeta.args.items) {
      expect(html).toContain(`>${item.label}</span>`)
    }
    expect(html).toContain("to run an action")
    expect(html).toContain('data-testid="command-result">Overview</output>')
    expect(html).toContain("Choose an action to change this demo view.")
  })
})
