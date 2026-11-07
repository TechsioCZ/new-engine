// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it } from "vitest"
import meta, {
  AllFormInputs,
  ContactForm,
  Disabled,
  ErrorState,
  Playground,
  ReadOnly,
  Sizes,
  SuccessState,
  ValidationWorkflow,
} from "../stories/templates/comprehensive-form.stories"

const title = "Plan your next project"
const headings = "h1, h2, h3, h4, h5, h6"

function StoryFixture({ story }: { story: typeof Playground }) {
  if (!story.render) {
    throw new Error("Missing comprehensive-form story composition")
  }
  return story.render({ ...meta.args, ...story.args } as never, {} as never)
}

// These are mounted DOM assertions, not SSR coverage: the real controls use portals.
async function withMountedStory(
  story: typeof Playground,
  assert: (canvas: HTMLDivElement) => void
) {
  const previousActEnvironment = Reflect.get(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT"
  )
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  try {
    await act(() => root.render(<StoryFixture story={story} />))
    assert(canvas)
  } finally {
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
  }
}

function outline(canvas: Element) {
  return Array.from(canvas.querySelectorAll(headings), (heading) => [
    heading.tagName,
    heading.textContent,
  ])
}

function sectionTitle(form: Element) {
  const heading = Array.from(form.querySelectorAll(headings)).find(
    (element) => element.textContent === title
  )
  if (!heading) {
    throw new Error("Missing complete enquiry section heading")
  }
  return heading
}

describe("Comprehensive form section-heading hierarchy", () => {
  it.each([
    ["playground", Playground],
    ["validation workflow", ValidationWorkflow],
    ["disabled", Disabled],
    ["read-only", ReadOnly],
    ["all form inputs", AllFormInputs],
    ["contact form", ContactForm],
    ["error state", ErrorState],
    ["success state", SuccessState],
  ] as const)(
    "retains the standalone h2 in mounted %s",
    async (_name, story) => {
      await withMountedStory(story, (canvas) => {
        expect(canvas.querySelectorAll("form")).toHaveLength(1)
        expect(outline(canvas)).toEqual([["H2", title]])
        const form = canvas.querySelector("form")
        if (!form) {
          throw new Error("Missing comprehensive form")
        }
        const heading = sectionTitle(form)
        expect(heading.classList.contains("font-semibold")).toBe(true)
        expect(heading.classList.contains("text-xl")).toBe(true)
        expect(heading.textContent).toBe(title)
        expect(heading.isConnected).toBe(true)
        expect(
          heading.closest('[hidden], [aria-hidden="true"], [inert]')
        ).toBeNull()
      })
    }
  )

  it("nests each mounted enquiry title below its size-group h3 instead of restarting at h2", async () => {
    await withMountedStory(Sizes, (canvas) => {
      expect(outline(canvas)).toEqual([
        ["H3", "Small (sm)"],
        ["H4", title],
        ["H3", "Medium (md)"],
        ["H4", title],
        ["H3", "Large (lg)"],
        ["H4", title],
      ])
      const forms = canvas.querySelectorAll("form")
      expect(forms).toHaveLength(3)
      for (const form of forms) {
        const heading = sectionTitle(form)
        // Happy DOM queries return a form Proxy; closest() returns its target.
        // isSameNode checks node identity without comparing those JS wrappers.
        expect(form.isSameNode(heading.closest("form"))).toBe(true)
        expect(heading.isConnected).toBe(true)
        expect(
          heading.closest('[hidden], [aria-hidden="true"], [inert]')
        ).toBeNull()
        const label = form.querySelector("label")
        if (!label) {
          throw new Error("Missing full-name label")
        }
        expect(label.textContent).toContain("Full name")
        expect(heading.compareDocumentPosition(label)).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      }
      expect(new Set(Array.from(forms, sectionTitle)).size).toBe(3)
    })
  })

  it("preserves the standalone title presentation on contextual size-group h4 headings", async () => {
    await withMountedStory(Sizes, (canvas) => {
      const titles = canvas.querySelectorAll("form h4")
      expect(titles).toHaveLength(3)
      for (const heading of titles) {
        expect(heading.textContent).toBe(title)
        expect(heading.classList.contains("font-semibold")).toBe(true)
        expect(heading.classList.contains("text-xl")).toBe(true)
      }
    })
  })
})
