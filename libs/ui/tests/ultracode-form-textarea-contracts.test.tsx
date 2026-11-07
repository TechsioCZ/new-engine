// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { within } from "storybook/test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StatusText } from "../src/atoms/status-text"
import { FormTextarea, FormTextareaRaw } from "../src/molecules/form-textarea"
import { CallerOwnedError } from "../stories/molecules/form-textarea.stories"

let canvas: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  canvas = document.createElement("div")
  document.body.append(canvas)
  root = createRoot(canvas)
})

afterEach(async () => {
  try {
    await act(() => root.unmount())
  } finally {
    canvas.remove()
    vi.unstubAllGlobals()
  }
})

async function render(children: ReactNode) {
  await act(() => root.render(children))
}

const ID_SEPARATOR = /\s+/

function referencedMessages(
  field: HTMLElement,
  attribute: "aria-describedby" | "aria-errormessage"
) {
  const ids =
    field.getAttribute(attribute)?.trim().split(ID_SEPARATOR).filter(Boolean) ??
    []
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate ${attribute} references`)
  }
  return ids.map((id) => {
    const target = document.getElementById(id)
    if (!target) {
      throw new Error(`${attribute} must resolve to a mounted message: ${id}`)
    }
    return target
  })
}

function CallerErrorFixture() {
  if (!CallerOwnedError.render) {
    throw new Error("Missing caller-owned textarea error fixture")
  }
  return CallerOwnedError.render({} as never, {} as never)
}

describe("FormTextarea independent error lifecycles", () => {
  it.each(["field", "caller"] as const)(
    "clears the %s error first without clearing the other owner's relationships",
    async (firstOwner) => {
      await render(<CallerErrorFixture />)
      const query = within(canvas)
      const field = query.getByRole("textbox", { name: "Delivery details" })
      const originalId = field.id
      const callerMessage = query
        .getByText("Add the delivery instructions.")
        .closest('[role="alert"]')
      const fieldMessage = query
        .getByText("Check the delivery details before saving.")
        .closest('[role="alert"]')
      expect(callerMessage).not.toBeNull()
      expect(fieldMessage).not.toBeNull()
      expect(referencedMessages(field, "aria-describedby")).toEqual([
        callerMessage,
        fieldMessage,
      ])
      expect(referencedMessages(field, "aria-errormessage")).toEqual([
        callerMessage,
        fieldMessage,
      ])
      expect(field.getAttribute("aria-invalid")).toBe("true")

      const firstAction =
        firstOwner === "field" ? "Clear field validation" : "Clear caller error"
      await act(() => {
        query.getByRole("button", { name: firstAction }).click()
      })
      const remaining = firstOwner === "field" ? callerMessage : fieldMessage
      const removed = firstOwner === "field" ? fieldMessage : callerMessage
      expect(removed?.isConnected).toBe(false)
      expect(query.getAllByRole("alert")).toEqual([remaining])
      expect(referencedMessages(field, "aria-describedby")).toEqual([remaining])
      expect(referencedMessages(field, "aria-errormessage")).toEqual([
        remaining,
      ])
      expect(field.getAttribute("aria-invalid")).toBe("true")

      const secondAction =
        firstOwner === "field" ? "Clear caller error" : "Clear field validation"
      await act(() => {
        query.getByRole("button", { name: secondAction }).click()
      })
      expect(query.queryByRole("alert")).toBeNull()
      expect(field.hasAttribute("aria-describedby")).toBe(false)
      expect(field.hasAttribute("aria-errormessage")).toBe(false)
      expect(field.hasAttribute("aria-invalid")).toBe(false)
      expect(query.getByRole("textbox", { name: "Delivery details" })).toBe(
        field
      )
      expect(field.id).toBe(originalId)
    }
  )
})

describe.each([
  ["FormTextarea", FormTextarea],
  ["FormTextareaRaw", FormTextareaRaw],
] as const)("%s mounted accessibility contracts", (_name, Field) => {
  it.each(["ltr", "rtl"] as const)(
    "retargets %s feedback without retaining obsolete error or helper references",
    async (dir) => {
      const label = dir === "rtl" ? "تعليمات التسليم" : "Delivery instructions"
      async function showFeedback(
        status: "error" | "warning" | "success" | undefined,
        messageId?: string
      ) {
        await render(
          <>
            <p id="persistent-guidance">Shared only with the courier.</p>
            <Field
              aria-describedby="persistent-guidance persistent-guidance"
              defaultValue="Leave at reception."
              dir={dir}
              helpText={
                status ? (
                  <StatusText id={messageId} status={status}>
                    {status === "error"
                      ? "Add an entrance reference."
                      : "Reference checked."}
                  </StatusText>
                ) : undefined
              }
              label={label}
            />
          </>
        )
      }

      await showFeedback("error")
      const field = within(canvas).getByRole("textbox", { name: label })
      const originalId = field.id
      const guidance = document.getElementById("persistent-guidance")
      const initialError = within(canvas).getByRole("alert")
      const initialErrorId = initialError.id
      expect(initialErrorId).toBeTruthy()
      expect(referencedMessages(field, "aria-describedby")).toEqual([
        guidance,
        initialError,
      ])
      expect(referencedMessages(field, "aria-errormessage")).toEqual([
        initialError,
      ])
      expect(field.getAttribute("aria-invalid")).toBe("true")

      for (const status of ["warning", "success"] as const) {
        await showFeedback(status, `${status}-feedback`)
        const feedback = within(canvas).getByRole("status")
        expect(feedback.id).toBe(`${status}-feedback`)
        expect(document.getElementById(initialErrorId)).toBeNull()
        expect(within(canvas).queryByRole("alert")).toBeNull()
        expect(referencedMessages(field, "aria-describedby")).toEqual([
          guidance,
          feedback,
        ])
        expect(field.hasAttribute("aria-errormessage")).toBe(false)
        expect(field.getAttribute("aria-invalid")).not.toBe("true")
      }

      await showFeedback(undefined)
      expect(within(canvas).queryByRole("status")).toBeNull()
      expect(referencedMessages(field, "aria-describedby")).toEqual([guidance])
      expect(field.hasAttribute("aria-errormessage")).toBe(false)
      expect(document.getElementById("success-feedback")).toBeNull()

      await showFeedback("error", "replacement-error")
      const replacement = within(canvas).getByRole("alert")
      expect(referencedMessages(field, "aria-describedby")).toEqual([
        guidance,
        replacement,
      ])
      expect(referencedMessages(field, "aria-errormessage")).toEqual([
        replacement,
      ])
      expect(field.getAttribute("aria-invalid")).toBe("true")
      expect(within(canvas).getByRole("textbox", { name: label })).toBe(field)
      expect(field.id).toBe(originalId)
      if (!(field instanceof HTMLTextAreaElement)) {
        throw new Error(
          "Expected the delivery field to remain a native textarea"
        )
      }
      expect(field.value).toBe("Leave at reception.")
    }
  )

  it("keeps sibling labels and messages independent when a generated control ID becomes explicit", async () => {
    async function showFields(id: string) {
      await render(
        <>
          <Field
            helpText="Use the main entrance."
            id={id}
            label="Delivery instructions"
          />
          <Field
            helpText="Use the loading bay."
            label="Collection instructions"
          />
        </>
      )
    }

    await showFields("")
    const query = within(canvas)
    const delivery = query.getByRole("textbox", {
      name: "Delivery instructions",
    })
    const collection = query.getByRole("textbox", {
      name: "Collection instructions",
    })
    const generatedId = delivery.id
    const collectionId = collection.id
    const deliveryMessages = referencedMessages(delivery, "aria-describedby")
    const collectionMessages = referencedMessages(
      collection,
      "aria-describedby"
    )
    expect(deliveryMessages).toHaveLength(1)
    expect(collectionMessages).toHaveLength(1)
    const ids = [
      delivery.id,
      collection.id,
      deliveryMessages[0]?.id,
      collectionMessages[0]?.id,
    ]
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(4)
    expect(deliveryMessages[0]?.textContent).toBe("Use the main entrance.")
    expect(collectionMessages[0]?.textContent).toBe("Use the loading bay.")

    await showFields("delivery-notes")
    expect(query.getByRole("textbox", { name: "Delivery instructions" })).toBe(
      delivery
    )
    expect(delivery.id).toBe("delivery-notes")
    expect(document.getElementById(generatedId)).toBeNull()
    expect(
      query.getByRole("textbox", { name: "Collection instructions" })
    ).toBe(collection)
    expect(collection.id).toBe(collectionId)
    expect(referencedMessages(delivery, "aria-describedby")).toEqual(
      deliveryMessages
    )
    expect(referencedMessages(collection, "aria-describedby")).toEqual(
      collectionMessages
    )
    for (const field of [delivery, collection]) {
      const label = Array.from(canvas.querySelectorAll("label")).find(
        (candidate) => candidate.htmlFor === field.id
      )
      expect(label?.control).toBe(field)
      expect(field.hasAttribute("aria-errormessage")).toBe(false)
    }
  })
})
