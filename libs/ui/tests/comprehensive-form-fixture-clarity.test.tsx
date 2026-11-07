// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { userEvent, within } from "storybook/test"
import { afterEach, describe, expect, it, vi } from "vitest"
import meta, {
  ErrorState,
  Playground,
  SuccessState,
  ValidationWorkflow,
} from "../stories/templates/comprehensive-form.stories"

const fullName = /Full name/
const emailAddress = /Email address/
const contactConsent = /contact me/
const projectDetails = /Project details/

async function withMountedStory(
  story: typeof Playground,
  assert: (canvas: HTMLDivElement) => void | Promise<void>,
  decorated = false
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  const Story = () => {
    if (!story.render) {
      throw new Error("Missing enquiry composition")
    }
    return story.render({ ...meta.args, ...story.args } as never, {} as never)
  }
  const decorator = Array.isArray(meta.decorators)
    ? meta.decorators[0]
    : meta.decorators
  if (decorated && !decorator) {
    throw new Error("Missing enquiry decorator")
  }
  try {
    await act(async () =>
      root.render(
        decorated && decorator ? decorator(Story, {} as never) : <Story />
      )
    )
    await assert(canvas)
  } finally {
    await act(() => root.unmount())
    canvas.remove()
  }
}

async function submit(canvas: HTMLDivElement) {
  const form = canvas.querySelector("form")
  if (!form) {
    throw new Error("Missing enquiry form")
  }
  await act(() => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("Comprehensive Form fixture clarity", () => {
  it("shows a complete representative success enquiry that passes submission", async () => {
    await withMountedStory(SuccessState, async (canvas) => {
      const fields = within(canvas)
      expect(
        (fields.getByRole("textbox", { name: fullName }) as HTMLInputElement)
          .value
      ).toBe("Alex Morgan")
      expect(
        (
          fields.getByRole("textbox", {
            name: emailAddress,
          }) as HTMLInputElement
        ).value
      ).toBe("alex@example.com")
      expect(
        (
          fields.getByRole("textbox", {
            name: projectDetails,
          }) as HTMLTextAreaElement
        ).value
      ).toBe(
        "Office supplies for a new team of 25 people, delivered in September."
      )
      expect(
        fields.getByRole("combobox", { name: "Team" }).textContent
      ).toContain("Sales")
      expect(
        (
          fields.getByRole("combobox", {
            name: "Project category",
          }) as HTMLInputElement
        ).value
      ).toBe("Office supplies")
      expect(
        (
          fields.getByRole("spinbutton", {
            name: "Estimated quantity",
          }) as HTMLInputElement
        ).value
      ).toBe("25")
      expect(
        (
          fields.getByRole("checkbox", {
            name: contactConsent,
          }) as HTMLInputElement
        ).checked
      ).toBe(true)
      expect(
        fields.queryByRole("alert", { name: "There is a problem" })
      ).toBeNull()
      await submit(canvas)
      expect(
        fields.queryByRole("alert", { name: "There is a problem" })
      ).toBeNull()
      expect(canvas.querySelector('[aria-invalid="true"]')).toBeNull()
      expect(canvas.textContent).toContain(
        "Enquiry prepared for Alex Morgan. This demo did not send any data."
      )
    })
  })

  it.each([
    ["playground", Playground],
    ["validation workflow", ValidationWorkflow],
  ] as const)("keeps the %s empty and ready to edit", async (_name, story) => {
    await withMountedStory(story, (canvas) => {
      const fields = within(canvas)
      for (const name of [fullName, emailAddress, projectDetails]) {
        expect(
          (fields.getByRole("textbox", { name }) as HTMLInputElement).value
        ).toBe("")
      }
      expect(
        fields.getByRole("combobox", { name: "Team" }).textContent
      ).toContain("Choose a team")
      expect(
        (
          fields.getByRole("combobox", {
            name: "Project category",
          }) as HTMLInputElement
        ).value
      ).toBe("")
      expect(
        (
          fields.getByRole("spinbutton", {
            name: "Estimated quantity",
          }) as HTMLInputElement
        ).value
      ).toBe("1")
      expect(fields.getByRole("slider").getAttribute("aria-valuenow")).toBe(
        "25"
      )
      expect(
        (
          fields.getByRole("checkbox", {
            name: contactConsent,
          }) as HTMLInputElement
        ).checked
      ).toBe(false)
      expect(
        fields.queryByRole("alert", { name: "There is a problem" })
      ).toBeNull()
      expect(canvas.textContent).not.toContain(
        "These details are ready to send."
      )
    })
  })

  it("gives every initial error a distinct field-specific correction without a submitted summary", async () => {
    await withMountedStory(ErrorState, (canvas) => {
      const fields = within(canvas)
      const cases = [
        [
          fields.getByRole("textbox", { name: fullName }),
          "Enter your full name.",
        ],
        [
          fields.getByRole("textbox", { name: emailAddress }),
          "Enter a valid email address, such as alex@example.com.",
        ],
        [
          fields.getByRole("combobox", { name: "Team" }),
          "Choose the team best placed to handle your enquiry.",
        ],
        [
          fields.getByRole("combobox", { name: "Project category" }),
          "Choose a project category, or clear it if you are unsure.",
        ],
        [
          fields.getByRole("spinbutton", { name: "Estimated quantity" }),
          "Enter a whole-number estimate between 1 and 1,000.",
        ],
        [
          fields.getByRole("slider"),
          "Choose a budget estimate between 0 and 100 thousand euros.",
        ],
        [
          fields.getByRole("textbox", { name: projectDetails }),
          "Tell us about your project in at least 10 characters.",
        ],
        [
          fields.getByRole("checkbox", { name: contactConsent }),
          "Allow us to contact you about this enquiry.",
        ],
      ] as const
      for (const [control, message] of cases) {
        const help = fields.getByText(message).closest<HTMLElement>("[id]")
        expect(help).not.toBeNull()
        expect(help?.id).not.toBe("")
        expect(control.getAttribute("aria-describedby")?.split(" ")).toContain(
          help?.id
        )
      }
      expect(new Set(cases.map(([, message]) => message)).size).toBe(8)
      expect(
        fields.queryByRole("alert", { name: "There is a problem" })
      ).toBeNull()
      expect(canvas.textContent).not.toContain(
        "Check this value before sending your enquiry."
      )
    })
  })

  it("preserves submitted errors, summary focus, partial correction and local success", async () => {
    await withMountedStory(ValidationWorkflow, async (canvas) => {
      const fields = within(canvas)
      await submit(canvas)
      expect(fields.getAllByRole("link")).toHaveLength(4)
      expect(document.activeElement).toBe(
        fields.getByRole("alert", { name: "There is a problem" })
      )
      for (const link of fields.getAllByRole("link")) {
        const target = document.getElementById(
          link.getAttribute("href")?.slice(1) ?? ""
        )
        expect(target).not.toBeNull()
        await act(async () => userEvent.click(link))
        expect(document.activeElement).toBe(target)
      }
      await act(async () =>
        userEvent.type(
          fields.getByRole("textbox", { name: fullName }),
          "Alex Morgan"
        )
      )
      await submit(canvas)
      expect(fields.getAllByRole("link")).toHaveLength(3)
      expect(
        fields.queryByRole("link", { name: "Enter your full name." })
      ).toBeNull()
      expect(document.activeElement).toBe(
        fields.getByRole("alert", { name: "There is a problem" })
      )
      await act(async () => {
        await userEvent.type(
          fields.getByRole("textbox", { name: emailAddress }),
          "alex@example.com"
        )
        await userEvent.type(
          fields.getByRole("textbox", { name: projectDetails }),
          "Office supplies for our new team."
        )
        await userEvent.click(
          fields.getByRole("checkbox", { name: contactConsent })
        )
      })
      await submit(canvas)
      expect(
        fields.queryByRole("alert", { name: "There is a problem" })
      ).toBeNull()
      expect(canvas.querySelector('[aria-invalid="true"]')).toBeNull()
      expect(canvas.textContent).toContain("Enquiry prepared for Alex Morgan.")
    })
  })

  it("keeps one mobile gutter inside the captured root without body padding", async () => {
    expect(meta.parameters?.layout).toBe("fullscreen")
    await withMountedStory(
      Playground,
      (canvas) => {
        const inset = canvas.firstElementChild
        expect(inset?.classList.contains("p-200")).toBe(true)
        expect(inset?.classList.contains("w-full")).toBe(true)
        expect(inset?.classList.contains("min-w-0")).toBe(true)
        const surface = inset?.firstElementChild
        expect(surface?.classList.contains("mx-auto")).toBe(true)
        expect(surface?.classList.contains("max-w-3xl")).toBe(true)
        expect(surface?.firstElementChild?.tagName).toBe("FORM")
        expect(canvas.querySelectorAll(".p-200")).toHaveLength(1)
      },
      true
    )
  })
})
