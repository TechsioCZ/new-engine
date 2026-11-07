// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { FormNumericInput } from "../src/molecules/form-numeric-input"

function query<T extends Element = HTMLElement>(
  parent: ParentNode,
  selector: string
) {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Missing fixture element: ${selector}`)
  }
  return element
}

const ID_SEPARATOR = /\s+/

function referencedMessages(input: HTMLInputElement, attribute: string) {
  const ids = input.getAttribute(attribute)?.trim().split(ID_SEPARATOR) ?? []
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate ${attribute} references`)
  }
  return ids.map((id) => {
    const target = document.getElementById(id)
    if (!target) {
      throw new Error(`Dangling ${attribute} reference: ${id}`)
    }
    return target
  })
}

describe("FormNumericInput live control relationships", () => {
  let canvas: HTMLDivElement
  let root: Root
  let previousActEnvironment: unknown

  beforeEach(() => {
    previousActEnvironment = Reflect.get(globalThis, "IS_REACT_ACT_ENVIRONMENT")
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)
    canvas = document.createElement("div")
    document.body.append(canvas)
    root = createRoot(canvas)
  })

  afterEach(async () => {
    try {
      await act(() => root.unmount())
    } finally {
      canvas.remove()
      Reflect.set(
        globalThis,
        "IS_REACT_ACT_ENVIRONMENT",
        previousActEnvironment
      )
    }
  })

  async function render(children: ReactNode) {
    await act(() => root.render(children))
  }

  it.each(["ltr", "rtl"] as const)(
    "keeps the label and both steppers attached to the live editor as IDs change in %s",
    async (dir) => {
      function field(ids?: { input: string }, nativeId?: string) {
        return (
          <FormNumericInput
            defaultValue={7}
            dir={dir}
            id="order-quantity"
            ids={ids}
            label="Order quantity"
          >
            <NumericInput.Control>
              <NumericInput.Input id={nativeId} />
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.Control>
          </FormNumericInput>
        )
      }

      for (const [ids, nativeId, expectedId] of [
        [undefined, undefined, "order-quantity"],
        [{ input: "warehouse-quantity" }, undefined, "warehouse-quantity"],
        [{ input: "warehouse-quantity" }, "native-quantity", "native-quantity"],
        [{ input: "warehouse-quantity" }, undefined, "warehouse-quantity"],
        [undefined, undefined, "order-quantity"],
      ] as const) {
        await render(field(ids, nativeId))
        const input = query<HTMLInputElement>(canvas, "input")
        const label = query<HTMLLabelElement>(canvas, "label")
        expect(input.id).toBe(expectedId)
        expect(document.getElementById(label.htmlFor)).toBe(input)
        expect(label.control).toBe(input)
        expect(input.value).toBe("7")
        const buttons = canvas.querySelectorAll("button")
        expect(buttons).toHaveLength(2)
        for (const button of buttons) {
          const controlledId = button.getAttribute("aria-controls")
          expect(document.getElementById(controlledId ?? "")).toBe(input)
        }
        const elementsWithId = Array.from(canvas.querySelectorAll("[id]"))
        expect(new Set(elementsWithId.map((element) => element.id)).size).toBe(
          elementsWithId.length
        )
      }
    }
  )

  it("turns wrapper errors back into guidance without dropping caller descriptions or errors", async () => {
    function field(
      validateStatus: "error" | "default",
      hasCallerError: boolean
    ) {
      return (
        <>
          <p id="quantity-guidance">Quantities are sold in whole packs.</p>
          {hasCallerError && (
            <p id="inventory-error" role="alert">
              The requested quantity is not available.
            </p>
          )}
          <FormNumericInput
            aria-describedby="quantity-guidance quantity-guidance"
            aria-errormessage={hasCallerError ? "inventory-error" : undefined}
            defaultValue={7}
            describedBy="quantity-guidance"
            helpText={
              validateStatus === "error"
                ? "Check the quantity before saving."
                : "Enter the number of packs."
            }
            invalid={hasCallerError || undefined}
            label="Order quantity"
            validateStatus={validateStatus}
          >
            <NumericInput.Control>
              <NumericInput.Input aria-describedby="quantity-guidance" />
            </NumericInput.Control>
          </FormNumericInput>
        </>
      )
    }

    await render(field("error", true))
    const input = query<HTMLInputElement>(canvas, "input")
    const label = query<HTMLLabelElement>(canvas, "label")
    const callerGuidance = query(canvas, "#quantity-guidance")
    const callerError = query(canvas, "#inventory-error")
    const errors = referencedMessages(input, "aria-errormessage")
    expect(errors).toHaveLength(2)
    expect(errors).toContain(callerError)
    const wrapperError = errors.find((element) => element !== callerError)
    if (!wrapperError) {
      throw new Error("Missing associated wrapper error")
    }
    expect(wrapperError.getAttribute("role")).toBe("alert")
    expect(wrapperError.textContent).toContain(
      "Check the quantity before saving."
    )
    expect(referencedMessages(input, "aria-describedby")).toEqual([
      callerGuidance,
      wrapperError,
    ])
    expect(input.getAttribute("aria-invalid")).toBe("true")

    // Keep help mounted while clearing validation: only its error semantics end.
    await render(field("default", true))
    expect(query(canvas, "input")).toBe(input)
    expect(label.control).toBe(input)
    expect(referencedMessages(input, "aria-errormessage")).toEqual([
      callerError,
    ])
    const descriptions = referencedMessages(input, "aria-describedby")
    expect(descriptions).toHaveLength(2)
    expect(descriptions).toContain(callerGuidance)
    const helper = descriptions.find((element) => element !== callerGuidance)
    expect(helper?.textContent).toContain("Enter the number of packs.")
    expect(helper?.hasAttribute("role")).toBe(false)
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(canvas.querySelectorAll('[role="alert"]')).toHaveLength(1)

    await render(field("default", false))
    expect(input.hasAttribute("aria-errormessage")).toBe(false)
    expect(input.hasAttribute("aria-invalid")).toBe(false)
    expect(referencedMessages(input, "aria-describedby")).toEqual(descriptions)
    expect(canvas.querySelectorAll('[role="alert"]')).toHaveLength(0)
    expect(input.value).toBe("7")

    await render(field("error", false))
    const restoredErrors = referencedMessages(input, "aria-errormessage")
    expect(restoredErrors).toHaveLength(1)
    expect(restoredErrors[0]?.getAttribute("role")).toBe("alert")
    expect(referencedMessages(input, "aria-describedby")).toEqual([
      callerGuidance,
      restoredErrors[0],
    ])
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(label.control).toBe(input)
  })
})

describe("FormNumericInput field direction", () => {
  it.each(["ltr", "rtl"] as const)(
    "applies explicit %s direction to the label, editor and feedback against an opposite-direction ancestor",
    (dir) => {
      const canvas = document.createElement("div")
      canvas.innerHTML = renderToStaticMarkup(
        <section dir={dir === "rtl" ? "ltr" : "rtl"}>
          <FormNumericInput
            dir={dir}
            helpText="Check the requested quantity."
            label="Order quantity"
            validateStatus="error"
          >
            <NumericInput.Control>
              <NumericInput.Input />
            </NumericInput.Control>
          </FormNumericInput>
        </section>
      )
      const label = query<HTMLLabelElement>(canvas, "label")
      const input = query<HTMLInputElement>(canvas, "input")
      const feedback = query(canvas, '[role="alert"]')
      expect(label.htmlFor).toBe(input.id)
      expect(input.getAttribute("aria-errormessage")).toBe(feedback.id)
      for (const element of [label, input, feedback]) {
        expect(element.closest("[dir]")?.getAttribute("dir")).toBe(dir)
      }
    }
  )
})
