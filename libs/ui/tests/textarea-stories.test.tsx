// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"
import { Sizes, Variants } from "../stories/atoms/textarea.stories"

function renderFixture(story: typeof Variants) {
  if (!story.render) {
    throw new Error("Textarea stories must retain their compositions")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    story.render({} as never, {} as never)
  )
  document.body.append(canvas)
  return canvas
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("Textarea story states", () => {
  it("requests missing instructions only for the empty error example", async () => {
    const canvas = renderFixture(Variants)
    const fields = Array.from(canvas.querySelectorAll("textarea"))
    expect(fields).toHaveLength(4)
    const error = fields.find(
      (field) => field.getAttribute("aria-invalid") === "true"
    )
    expect(error).toBeDefined()
    expect(error?.value).toBe("")
    expect(error?.placeholder).toBe("Add instructions for the courier…")
    const messageId = error?.getAttribute("aria-errormessage")
    expect(messageId).toBeTruthy()
    expect(canvas.querySelector('[role="alert"]')?.id).toBe(messageId)
    expect(canvas.querySelector('[role="alert"]')?.textContent).toContain(
      "Add delivery instructions"
    )
    for (const field of fields.filter((candidate) => candidate !== error)) {
      expect(field.value).toBe("Leave the parcel at reception.")
    }
    if (!Variants.play) {
      throw new Error("Textarea variants must retain their feedback checks")
    }
    await Variants.play({ canvasElement: canvas } as never)
  })

  it("verifies label focus then leaves all size examples idle", async () => {
    const canvas = renderFixture(Sizes)
    const field = canvas.querySelector("textarea")
    let focused = false
    field?.addEventListener("focus", () => {
      focused = true
    })
    if (!Sizes.play) {
      throw new Error("Textarea sizes must retain their label-focus check")
    }
    await Sizes.play({ canvasElement: canvas } as never)
    expect(focused).toBe(true)
    expect(Array.from(canvas.querySelectorAll("textarea"))).not.toContain(
      document.activeElement
    )
  })
})
