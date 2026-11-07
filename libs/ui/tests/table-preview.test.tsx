// @vitest-environment happy-dom
import { act, type ComponentType, createElement as h } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import meta, {
  Playground,
  StickyHeader,
  WithSelectionAndActions,
  WithStickyColumn,
} from "../stories/organisms/table.stories"

const roots: Root[] = []
const observers: ResizeObserverMock[] = []

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing Table fixture element")
  }
  return value
}

class ResizeObserverMock {
  readonly elements = new Set<Element>()
  readonly callback: ResizeObserverCallback
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    observers.push(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  disconnect() {
    this.disconnected = true
  }

  notify() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal("ResizeObserver", ResizeObserverMock)
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  observers.length = 0
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

async function mount(story: typeof Playground, decorated = false) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  const Example = story.render as ComponentType
  const decorators = meta.decorators
  const decorator = Array.isArray(decorators) ? decorators[0] : decorators
  if (decorated && !decorator) {
    throw new Error("The decorated Table preview must retain its decorator")
  }
  const element =
    decorated && decorator
      ? decorator(
          (() => h(Example)) as never,
          { parameters: story.parameters ?? {} } as never
        )
      : h(Example)
  await act(() => root.render(element))
  return canvas
}

describe("Table preview overflow communication", () => {
  it("shows a scroll hint only while the measured table overflows", async () => {
    const canvas = await mount(Playground, true)
    const region = required(
      canvas.querySelector<HTMLElement>('[role="region"]')
    )
    const table = required(canvas.querySelector("table"))
    expect(region).not.toBeNull()
    expect(table).not.toBeNull()
    expect(region?.getAttribute("aria-describedby")).toBeNull()
    expect(canvas.textContent).not.toContain(
      "Scroll horizontally to view all columns."
    )

    const observer = observers.find((candidate) =>
      candidate.elements.has(region)
    )
    Object.defineProperty(region, "clientWidth", {
      configurable: true,
      value: 361,
    })
    Object.defineProperty(region, "scrollWidth", {
      configurable: true,
      value: 440,
    })
    await act(() => observer?.notify())
    const descriptionId = region?.getAttribute("aria-describedby")
    expect(descriptionId).toBeTruthy()
    expect(observer?.elements.has(table)).toBe(true)
    expect(document.getElementById(required(descriptionId))?.textContent).toBe(
      "Scroll horizontally to view all columns."
    )
    expect(region?.tabIndex).toBe(0)
    expect(region?.classList.contains("overflow-x-auto")).toBe(true)

    Object.defineProperty(region, "clientWidth", {
      configurable: true,
      value: 1233,
    })
    await act(() => observer?.notify())
    expect(region?.getAttribute("aria-describedby")).toBeNull()
    expect(canvas.textContent).not.toContain(
      "Scroll horizontally to view all columns."
    )
    await act(() => roots[0]?.unmount())
    expect(observer?.disconnected).toBe(true)
    roots.length = 0
  })

  it.each([StickyHeader, WithStickyColumn])(
    "observes the bounded inner scrollport rather than the full story canvas",
    async (story) => {
      const canvas = await mount(story, true)
      expect(canvas.querySelectorAll('[role="region"]')).toHaveLength(1)
      const region = required(
        canvas.querySelector<HTMLElement>('[role="region"]')
      )
      expect(region).not.toBeNull()
      expect(observers.some((observer) => observer.elements.has(region))).toBe(
        true
      )
      expect(region?.tabIndex).toBe(0)
      expect(canvas.querySelectorAll("table")).toHaveLength(1)
    }
  )
})

describe("Table selection action composition", () => {
  it("keeps full action labels in a mobile stack, pluralizes counts, and retains clear/delete/undo", async () => {
    const canvas = await mount(WithSelectionAndActions)
    const checkbox = (label: string) =>
      canvas.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
    const button = (label: string) =>
      required(
        Array.from(canvas.querySelectorAll("button")).find(
          (candidate) => candidate.textContent === label
        )
      )
    await act(() => required(checkbox("Select Laptop")).click())
    const actions = required(
      button("Delete selected products").parentElement?.parentElement
    )
    expect(actions.textContent).toContain("1 product selected")
    expect(actions.getAttribute("aria-label")).toBe("Selected product actions")
    expect(actions.classList.contains("flex-col")).toBe(true)
    expect(actions.classList.contains("sm:flex-row")).toBe(true)
    expect(
      button("Delete selected products").parentElement?.classList.contains(
        "flex-col"
      )
    ).toBe(true)
    expect(button("Clear selection")).toBeDefined()

    await act(() => required(checkbox("Select Coffee Maker")).click())
    expect(actions.textContent).toContain("2 products selected")
    await act(() => button("Clear selection").click())
    expect(
      canvas.querySelector('[aria-label="Selected product actions"]')
    ).toBeNull()
    await act(() => required(checkbox("Select Laptop")).click())
    await act(() => button("Delete selected products").click())
    expect(checkbox("Select Laptop")).toBeNull()
    await act(() => button("Undo delete").click())
    expect(checkbox("Select Laptop")).not.toBeNull()
    expect(canvas.querySelectorAll("tbody tr")).toHaveLength(5)
  })
})
