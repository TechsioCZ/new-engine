import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Tooltip } from "../src/atoms/tooltip"

const describedBy = (markup: string, id: string) =>
  new RegExp(`id="${id}"[^>]*aria-describedby="[^"]+"`).test(markup) ||
  new RegExp(`aria-describedby="[^"]+"[^>]*id="${id}"`).test(markup)

function render(trigger: Record<string, string>) {
  return renderToStaticMarkup(
    <Tooltip content="Download" defaultOpen id="tip">
      <button id="trigger" type="button" {...trigger}>
        <span aria-hidden="true">↓</span>
      </button>
    </Tooltip>
  )
}

describe("Tooltip description", () => {
  it("does not describe a trigger whose aria-label it repeats", () => {
    expect(describedBy(render({ "aria-label": "Download" }), "trigger")).toBe(
      false
    )
  })

  it("describes a trigger whose name comes from aria-labelledby", () => {
    const markup = renderToStaticMarkup(
      <>
        <span id="report">Annual report</span>
        <Tooltip content="Download" defaultOpen id="tip">
          <button
            aria-label="Download"
            aria-labelledby="report"
            id="trigger"
            type="button"
          >
            ↓
          </button>
        </Tooltip>
      </>
    )
    expect(describedBy(markup, "trigger")).toBe(true)
  })

  it("describes a trigger when the tooltip adds information", () => {
    expect(describedBy(render({ "aria-label": "Export" }), "trigger")).toBe(
      true
    )
  })
})
