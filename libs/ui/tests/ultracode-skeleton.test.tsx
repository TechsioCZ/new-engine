// @vitest-environment happy-dom
import { act, createRef, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { Skeleton } from "../src/atoms/skeleton"

function renderSkeleton(children: ReactNode) {
  const container = document.createElement("div")
  container.innerHTML = renderToStaticMarkup(children)
  return container
}

describe("Skeleton loading silhouettes", () => {
  it.each(["ltr", "rtl"] as const)(
    "keeps a shortened final text line in normal flow for %s content",
    (dir) => {
      const container = renderSkeleton(
        <Skeleton.Text dir={dir} lastLineWidth="60%" noOfLines={3} />
      )
      const text = container.firstElementChild
      if (!text) {
        throw new Error("Missing skeleton text container")
      }
      const lines = Array.from(text.children, (line) => {
        if (!(line instanceof HTMLElement)) {
          throw new Error("Skeleton text lines must be HTML elements")
        }
        return line
      })

      expect(text?.getAttribute("dir")).toBe(dir)
      expect(text?.classList.contains("flex-col")).toBe(true)
      expect(lines.map((line) => line.style.width)).toEqual([
        "100%",
        "100%",
        "60%",
      ])
      for (const line of lines) {
        expect(line.classList.contains("h-skeleton-text-line")).toBe(true)
        expect(line.classList.contains("rounded-skeleton-text")).toBe(true)
        expect(line.classList.contains("bg-skeleton-bg-primary")).toBe(true)
        expect(line.style.position).toBe("")
        expect(line.style.left).toBe("")
        expect(line.style.right).toBe("")
      }
    }
  )

  it.each([1, 0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    "retains one full-width line for a line count of %s",
    (noOfLines) => {
      const container = renderSkeleton(
        <Skeleton.Text lastLineWidth="60%" noOfLines={noOfLines} />
      )
      const lines = container.firstElementChild?.children
      expect(lines).toHaveLength(1)
      const line = lines?.[0]
      if (!(line instanceof HTMLElement)) {
        throw new Error("Missing full-width skeleton text line")
      }
      expect(line.style.width).toBe("100%")
    }
  )

  it("preserves consumer geometry, fill and container overrides", () => {
    const container = renderSkeleton(
      <Skeleton aria-label="Loading preview" variant="secondary">
        <Skeleton.Circle className="size-20 bg-transparent" />
        <Skeleton.Rectangle
          className="h-12 w-24 rounded-none bg-transparent"
          style={{ maxWidth: "100%" }}
        />
        <Skeleton.Text
          className="h-6 rounded-none bg-transparent"
          containerClassName="min-w-0 flex-1 gap-200"
          lastLineWidth="50%"
          noOfLines={2}
        />
      </Skeleton>
    )
    const group = container.querySelector("[inert]")
    const [circle, rectangle, text] = Array.from(group?.children ?? [])

    expect(circle?.classList.contains("size-20")).toBe(true)
    expect(circle?.classList.contains("bg-transparent")).toBe(true)
    for (const name of ["h-12", "w-24", "rounded-none", "bg-transparent"]) {
      expect(rectangle?.classList.contains(name)).toBe(true)
    }
    if (!(rectangle instanceof HTMLElement)) {
      throw new Error("Missing skeleton rectangle")
    }
    expect(rectangle.style.maxWidth).toBe("100%")
    for (const name of ["min-w-0", "flex-1", "gap-200"]) {
      expect(text?.classList.contains(name)).toBe(true)
    }
    expect(text?.children).toHaveLength(2)
    for (const line of Array.from(text?.children ?? [])) {
      for (const name of ["h-6", "rounded-none", "bg-transparent"]) {
        expect(line.classList.contains(name)).toBe(true)
      }
    }
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(group?.getAttribute("aria-hidden")).toBe("true")
  })

  it("keeps the text ref on its container and releases it when content loads", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const container = document.createElement("div")
    const root = createRoot(container)
    const ref = createRef<HTMLDivElement>()
    try {
      await act(() => {
        root.render(<Skeleton.Text noOfLines={2} ref={ref} />)
      })
      expect(ref.current).toBe(container.firstElementChild)
      expect(ref.current?.children).toHaveLength(2)

      await act(() => {
        root.render(
          <Skeleton.Text isLoaded ref={ref}>
            <p>Product details loaded.</p>
          </Skeleton.Text>
        )
      })
      expect(ref.current).toBeNull()
      expect(container.textContent).toBe("Product details loaded.")
      expect(container.querySelector("[aria-busy], [inert]")).toBeNull()
    } finally {
      await act(() => root.unmount())
      vi.unstubAllGlobals()
    }
  })
})
