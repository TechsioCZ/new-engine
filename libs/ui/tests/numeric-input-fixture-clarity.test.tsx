// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  CallbackCompatibility,
  ControlledRefusal,
  CustomLayoutHorizontal,
  DeferredParentAcknowledgement,
  NativeEventComposition,
  NativeResetTracker,
  PrecisionZero,
  ReadOnly,
} from "../stories/atoms/numeric-input.stories"

function markup(story: typeof NativeResetTracker) {
  function Fixture() {
    if (!story.render) {
      throw new Error("NumericInput stories must retain their compositions")
    }
    return story.render({} as never, {} as never)
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(<Fixture />)
  return canvas
}

function visibleLabel(canvas: HTMLElement, input: HTMLInputElement) {
  return Array.from(canvas.querySelectorAll("label"))
    .find((candidate) => candidate.htmlFor === input.id)
    ?.textContent?.trim()
}

function namedReadout(canvas: HTMLElement, name: string) {
  const output = canvas.querySelector(`output[aria-label="${name}"]`)
  return {
    value: output?.textContent,
    caption: output?.parentElement?.textContent,
    status: output?.closest("[data-status]")?.getAttribute("data-status"),
  }
}

describe("NumericInput technical fixture clarity", () => {
  it("gives the external read-only label the standard field clearance", () => {
    const canvas = markup(ReadOnly)
    const input = canvas.querySelector("input")
    if (!input) {
      throw new Error("Missing read-only numeric editor")
    }
    expect(
      canvas.firstElementChild?.classList.contains("gap-form-field-gap")
    ).toBe(true)
    expect(visibleLabel(canvas, input)).toBe("Confirmed quantity")
    expect(input.readOnly).toBe(true)
    expect(input.value).toBe("42")
    expect(canvas.querySelectorAll("button")).toHaveLength(0)
  })

  it("labels all six reset authority cases without adding inputs or changing form owners", () => {
    const canvas = markup(NativeResetTracker)
    const forms = Array.from(canvas.querySelectorAll("form"))
    expect(forms).toHaveLength(6)
    expect(canvas.querySelectorAll("input")).toHaveLength(6)
    for (const [index, form] of forms.entries()) {
      const input = form.querySelector("input")
      if (!input) {
        throw new Error("Missing numeric editor")
      }
      expect(visibleLabel(canvas, input)).toContain(
        input.getAttribute("aria-label")
      )
      expect(input.form).toBe(form)
      expect(input.name).toBe("quantity")
      expect(input.getAttribute("aria-label")).toBe(
        form.getAttribute("aria-label")
      )
      expect(input.value).toBe(index < 3 ? "20" : "50")
      for (const name of ["Native changes", "Value proposals"]) {
        expect(namedReadout(form, name)).toEqual({
          value: "0",
          caption: `${name}: 0`,
          status: "default",
        })
      }
      expect(form.querySelector('button[type="reset"]')?.textContent).toBe(
        "Reset quantity"
      )
      expect(form.querySelectorAll("button")).toHaveLength(
        index % 3 === 0 ? 1 : 2
      )
    }
  })

  it("labels observed and canceled blur while preserving their names and input order", () => {
    const canvas = markup(NativeEventComposition)
    const inputs = Array.from(canvas.querySelectorAll("input"))
    expect(inputs).toHaveLength(2)
    expect(inputs.map((input) => input.getAttribute("aria-label"))).toEqual([
      "Observed blur",
      "Canceled blur",
    ])
    for (const input of inputs) {
      expect(visibleLabel(canvas, input)).toContain(
        input.getAttribute("aria-label")
      )
      expect(input.value).toBe("2")
    }
    expect(canvas.textContent).toContain("clamps to 0–10 and commits")
    expect(canvas.textContent).toContain(
      "preventDefault(); keeps the typed draft"
    )
    expect(canvas.querySelectorAll("button")).toHaveLength(1)
    expect(canvas.querySelector("button")?.textContent).toBe("Continue")
  })

  it("explains initial whole-unit formatting without controlling the editor", () => {
    const canvas = markup(PrecisionZero)
    const inputs = canvas.querySelectorAll("input")
    expect(inputs).toHaveLength(1)
    const input = inputs[0]
    if (!input) {
      throw new Error("Missing numeric editor")
    }
    expect(visibleLabel(canvas, input)).toContain(
      input.getAttribute("aria-label")
    )
    expect(input.getAttribute("aria-label")).toBe("Whole units")
    expect(input.value).toBe("2")
    expect(canvas.querySelector("label")?.textContent).toContain("precision: 0")
    expect(canvas.textContent).toContain("Initial value: 1.75")
    expect(canvas.textContent).toContain(
      "typed fractional drafts remain editable"
    )
    expect(canvas.querySelectorAll("button")).toHaveLength(2)
  })

  it("labels both selective parents and keeps accepted-value selectors numeric-only", () => {
    const canvas = markup(ControlledRefusal)
    const forms = Array.from(canvas.querySelectorAll("form"))
    expect(forms).toHaveLength(2)
    expect(canvas.querySelectorAll("input")).toHaveLength(2)
    for (const form of forms) {
      const input = form.querySelector("input")
      if (!input) {
        throw new Error("Missing numeric editor")
      }
      expect(visibleLabel(canvas, input)).toContain(
        input.getAttribute("aria-label")
      )
      expect(input.form).toBe(form)
      expect(input.name).toBe("quantity")
      expect(input.getAttribute("aria-label")).toBe(
        form.getAttribute("aria-label")
      )
      expect(namedReadout(form, "Accepted quantity")).toEqual({
        value: "2",
        caption: "Accepted quantity: 2",
        status: "default",
      })
      expect(form.querySelectorAll("button")).toHaveLength(2)
    }
  })

  it("names the deferred editor and parent readout without adding focusable controls", () => {
    const canvas = markup(DeferredParentAcknowledgement)
    const inputs = canvas.querySelectorAll("input")
    expect(inputs).toHaveLength(1)
    const input = inputs[0]
    if (!input) {
      throw new Error("Missing numeric editor")
    }
    expect(visibleLabel(canvas, input)).toContain(
      input.getAttribute("aria-label")
    )
    expect(input.getAttribute("aria-label")).toBe("Deferred quantity")
    expect(input.form).toBe(canvas.querySelector("form"))
    expect(input.name).toBe("quantity")
    expect(namedReadout(canvas, "Parent value")).toEqual({
      value: "2",
      caption: "Parent value: 2",
      status: "default",
    })
    expect(canvas.querySelectorAll("button")).toHaveLength(5)
    expect(canvas.querySelector('button[type="reset"]')?.textContent).toBe(
      "Reset quantity"
    )
  })

  it("keeps all callback JSON data and wraps at explicit property boundaries", () => {
    const canvas = markup(CallbackCompatibility)
    const readout = canvas.querySelector('[data-testid="callback-counts"]')
    if (!readout) {
      throw new Error("Missing callback counts")
    }
    expect(readout.tagName).toBe("PRE")
    expect(readout.classList.contains("whitespace-pre-wrap")).toBe(true)
    expect(readout.classList.contains("break-normal")).toBe(true)
    expect(readout.classList.contains("wrap-anywhere")).toBe(false)
    const counts = { numeric: 0, change: 0, commit: 0, invalid: 0, focus: 0 }
    expect(readout.textContent).toBe(JSON.stringify(counts, null, 2))
    expect(JSON.parse(readout.textContent ?? "")).toEqual(counts)
    expect(readout.previousElementSibling?.textContent).toBe("Callback counts")
    expect(
      canvas.querySelector('[data-testid="draft-value"]')?.textContent
    ).toBe("Draft: 2")
    expect(
      canvas.querySelector('[data-testid="numeric-value"]')?.textContent
    ).toBe("Numeric: 2")
    expect(canvas.querySelectorAll("input")).toHaveLength(1)
  })

  it("retains the completed matching-border horizontal control composition", () => {
    const canvas = markup(CustomLayoutHorizontal)
    const inputs = canvas.querySelectorAll("input")
    expect(inputs).toHaveLength(1)
    const buttons = canvas.querySelectorAll("button")
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      for (const token of [
        "size-icon-control-lg",
        "rounded-numeric-input-md",
        "border-(length:--border-width-form-control)",
        "border-numeric-input-border",
        "hover:border-numeric-input-border-hover",
      ]) {
        expect(button.classList.contains(token)).toBe(true)
      }
    }
    expect(CustomLayoutHorizontal.play).toBeTypeOf("function")
  })
})
