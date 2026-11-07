// @vitest-environment happy-dom
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  Playground,
  PopupLifecycleContracts,
} from "../stories/templates/comprehensive-form.stories"

const observed = vi.hoisted(() => ({
  getAnchorElement: undefined as (() => unknown) | undefined,
}))

// Observe the story's public positioning contract without replacing its controls.
vi.mock("../src/molecules/select", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/molecules/select")>()
  function ObservedSelect(props: ComponentProps<typeof actual.Select>) {
    observed.getAnchorElement = props.positioning?.getAnchorElement
    return <actual.Select {...props} />
  }
  return {
    ...actual,
    Select: Object.assign(ObservedSelect, actual.Select),
  }
})

const defaults = {
  size: "md" as const,
  validateStatus: "default" as const,
  disabled: false,
  readOnly: false,
}

function enquiry(size: "sm" | "md" | "lg" = "md") {
  if (!Playground.render) {
    throw new Error("Missing enquiry composition")
  }
  return Playground.render({ ...defaults, size }, {} as never)
}

// Mount the real portal-bearing controls; happy-dom is not a server context.
async function withMountedFixture(
  element: ReturnType<typeof enquiry>,
  assert: (canvas: HTMLDivElement) => void
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  try {
    await act(async () => root.render(element))
    assert(canvas)
  } finally {
    try {
      await act(async () => root.unmount())
    } finally {
      canvas.remove()
    }
  }
}

afterEach(() => {
  observed.getAnchorElement = undefined
  vi.unstubAllGlobals()
})

describe("Comprehensive Form composition", () => {
  it.each(["sm", "md", "lg"] as const)(
    "shares the paired control/helper rhythm at %s without narrowing guidance",
    async (size) => {
      await withMountedFixture(enquiry(size), (canvas) => {
        const team = canvas.querySelector(
          '[data-scope="select"][data-part="root"]'
        )
        const category = canvas.querySelector(
          '[data-scope="combobox"][data-part="root"]'
        )
        expect(team).not.toBeNull()
        expect(category).not.toBeNull()
        expect(team?.classList.contains("gap-select")).toBe(true)
        expect(category?.classList.contains("gap-select")).toBe(true)
        expect(team?.parentElement).toBe(category?.parentElement)
        expect(team?.parentElement?.classList.contains("items-start")).toBe(
          true
        )
        expect(category?.querySelector('[id$="-help"]')?.textContent).toBe(
          "Choose the closest category, or leave it empty."
        )
        expect(
          team?.querySelector("[data-select-description]")?.textContent
        ).toBe("Choose the team best placed to help.")
        for (const root of [team, category]) {
          expect(root?.classList.contains("overflow-hidden")).toBe(false)
          expect(root?.classList.contains("truncate")).toBe(false)
        }
      })
    }
  )

  it.each(["sm", "md", "lg"] as const)(
    "anchors the %s Team menu to its actual control, excluding helper and grid height",
    async (size) => {
      await withMountedFixture(enquiry(size), (canvas) => {
        const control = canvas.querySelector(
          '[data-scope="select"][data-part="control"]'
        )
        expect(control).not.toBeNull()
        expect(observed.getAnchorElement).toBeTypeOf("function")
        expect(observed.getAnchorElement?.()).toBe(control)
        expect(control?.querySelector("[data-select-description]")).toBeNull()
        expect(
          control?.parentElement?.querySelector("[data-select-description]")
        ).not.toBeNull()
      })
    }
  )

  it("distinguishes the lifecycle section while preserving first-legend exemption", async () => {
    if (!PopupLifecycleContracts.render) {
      throw new Error("Missing popup lifecycle composition")
    }
    await withMountedFixture(
      PopupLifecycleContracts.render(defaults, {} as never),
      (canvas) => {
        const outer = canvas.querySelector("fieldset")
        const exemption = outer?.firstElementChild
        expect(exemption?.tagName).toBe("LEGEND")
        expect(exemption?.classList.contains("w-full")).toBe(true)
        expect(exemption?.querySelector('[role="slider"]')).not.toBeNull()
        const section = outer?.querySelector("fieldset")
        const heading = section?.firstElementChild
        expect(section?.classList.contains("mt-300")).toBe(true)
        expect(heading?.tagName).toBe("LEGEND")
        expect(heading?.textContent).toBe("Popup lifecycle fields")
        expect(heading?.classList.contains("font-semibold")).toBe(true)
        expect(heading?.classList.contains("text-lg")).toBe(true)
        expect(heading?.classList.contains("pb-200")).toBe(true)
        expect(section?.querySelectorAll("fieldset")).toHaveLength(0)
      }
    )
  })
})
