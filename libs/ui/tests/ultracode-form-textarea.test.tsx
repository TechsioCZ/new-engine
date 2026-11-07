// @vitest-environment happy-dom
import { act, createRef, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { StatusText } from "../src/atoms/status-text"
import { FormTextarea, FormTextareaRaw } from "../src/molecules/form-textarea"

function markup(children: ReactNode) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(children)
  return canvas
}

describe("FormTextarea field layout", () => {
  it.each([FormTextarea, FormTextareaRaw])(
    "%s allows the complete label to wrap in a shrinking field",
    (Field) => {
      const label = "Delivery-reference-for-the-courier-and-reception-team"
      const canvas = markup(
        <Field
          helpText="Keep the full reference visible."
          label={label}
          required
        />
      )
      const field = canvas.querySelector("textarea")
      const root = field?.parentElement
      const visibleLabel = canvas.querySelector("label")
      expect(root?.classList.contains("min-w-0")).toBe(true)
      expect(root?.classList.contains("gap-form-field-gap")).toBe(true)
      expect(visibleLabel?.classList.contains("break-words")).toBe(true)
      expect(visibleLabel?.textContent).toContain(label)
      expect(visibleLabel?.htmlFor).toBe(field?.id)
      expect(field?.required).toBe(true)
      expect(root?.classList.contains("overflow-hidden")).toBe(false)
      expect(visibleLabel?.classList.contains("truncate")).toBe(false)
    }
  )

  it.each(["rtl", "ltr", "auto"] as const)(
    "shares %s direction with the label and feedback without losing the control prop",
    (dir) => {
      const canvas = markup(
        <FormTextarea
          dir={dir}
          helpText="Feedback follows the field direction."
          label="Delivery instructions"
          validateStatus="warning"
        />
      )
      const field = canvas.querySelector("textarea")
      const root = field?.parentElement
      expect(root?.getAttribute("dir")).toBe(dir)
      expect(field?.getAttribute("dir")).toBe(dir)
      expect(canvas.querySelector("label")?.parentElement).toBe(root)
      expect(canvas.querySelector('[role="status"]')?.parentElement).toBe(root)
    }
  )

  it("keeps caller overrides on the textarea and precomposed feedback", () => {
    const canvas = markup(
      <FormTextareaRaw
        aria-describedby="caller-guidance"
        className="w-auto resize-none"
        dir="rtl"
        helpText={
          <StatusText className="caller-feedback" dir="ltr" id="field-feedback">
            Keep this caller-owned direction and styling.
          </StatusText>
        }
        label="Delivery instructions"
        style={{ width: "75%" }}
        validateStatus="error"
      />
    )
    const field = canvas.querySelector("textarea")
    const feedback = canvas.querySelector("#field-feedback")
    expect(field?.classList.contains("w-auto")).toBe(true)
    expect(field?.classList.contains("resize-none")).toBe(true)
    expect(field?.style.width).toBe("75%")
    expect(field?.parentElement?.classList.contains("w-auto")).toBe(false)
    expect(field?.getAttribute("aria-invalid")).toBe("true")
    expect(field?.getAttribute("aria-describedby")).toBe(
      "caller-guidance field-feedback"
    )
    expect(field?.getAttribute("aria-errormessage")).toBe("field-feedback")
    expect(feedback?.getAttribute("dir")).toBe("ltr")
    expect(feedback?.classList.contains("caller-feedback")).toBe(true)
    expect(feedback?.getAttribute("role")).toBe("alert")
  })

  it("retains the native textarea ref and keyboard handler", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    const ref = createRef<HTMLTextAreaElement>()
    const onKeyDown = vi.fn()
    try {
      await act(() => {
        root.render(
          <FormTextarea
            defaultValue="Leave at reception."
            label="Delivery instructions"
            onKeyDown={onKeyDown}
            ref={ref}
          />
        )
      })
      const field = canvas.querySelector("textarea")
      expect(ref.current).toBe(field)
      ref.current?.focus()
      expect(document.activeElement).toBe(field)
      await act(() => {
        field?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        )
      })
      expect(onKeyDown).toHaveBeenCalledOnce()
      expect(field?.value).toBe("Leave at reception.")
    } finally {
      await act(() => root.unmount())
      canvas.remove()
      vi.unstubAllGlobals()
    }
    expect(ref.current).toBeNull()
  })
})
