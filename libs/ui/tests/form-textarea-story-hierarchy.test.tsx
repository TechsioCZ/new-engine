// @vitest-environment happy-dom
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  CallerOwnedError,
  FeedbackLifecycle,
} from "../stories/molecules/form-textarea.stories"

function renderStory(story: typeof FeedbackLifecycle) {
  const render = story.render
  if (!render) {
    throw new Error("The field story must retain its composition")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    createElement(function Fixture() {
      return render({} as never, {} as never)
    })
  )
  return canvas
}

describe("FormTextarea story hierarchy", () => {
  it("presents persistent guidance after the field using helper typography", () => {
    const canvas = renderStory(FeedbackLifecycle)
    const field = canvas.querySelector("textarea")
    const guidanceId = field?.getAttribute("aria-describedby")?.split(" ")[0]
    const guidance = Array.from(canvas.querySelectorAll("[id]")).find(
      (element) => element.id === guidanceId
    )
    expect(guidance?.textContent).toBe("Only used for this order.")
    expect(guidance?.classList.contains("text-status-text-md")).toBe(true)
    expect(field && guidance && field.compareDocumentPosition(guidance)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(field?.getAttribute("aria-invalid")).toBe("true")
    expect(canvas.querySelector('[role="alert"]')?.textContent).toBe(
      "Add delivery instructions before saving."
    )
  })

  it("retains both caller-owned and field-owned errors in the initial frame", () => {
    const canvas = renderStory(CallerOwnedError)
    const field = canvas.querySelector("textarea")
    const errors = canvas.querySelectorAll('[role="alert"]')
    expect(Array.from(errors, (error) => error.textContent)).toEqual([
      "Add the delivery instructions.",
      "Check the delivery details before saving.",
    ])
    expect(field?.getAttribute("aria-invalid")).toBe("true")
    expect(field?.getAttribute("aria-errormessage")?.split(" ")).toEqual(
      Array.from(errors, (error) => error.id)
    )
  })

  it.each([
    ["feedback lifecycle", FeedbackLifecycle, 1],
    ["caller-owned error", CallerOwnedError, 2],
  ] as const)(
    "keeps %s actions compact and outlined",
    (_name, story, count) => {
      const canvas = renderStory(story)
      const buttons = canvas.querySelectorAll("button")
      expect(buttons).toHaveLength(count)
      for (const button of buttons) {
        expect(button.classList.contains("self-start")).toBe(true)
        expect(button.classList.contains("button-size-sm")).toBe(true)
        expect(button.classList.contains("bg-button-bg-outlined")).toBe(true)
        expect(button.classList.contains("w-full")).toBe(false)
      }
    }
  )
})
