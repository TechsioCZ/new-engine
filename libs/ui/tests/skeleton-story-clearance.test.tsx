// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import meta, {
  AnimationSpeed,
  InteractionIsolation,
  RectangleFixedDimensions,
  Sizes,
  TextBasic,
  Variants,
} from "../stories/atoms/skeleton.stories"

function fixture(story: typeof TextBasic) {
  if (!story.render) {
    throw new Error("Missing Skeleton story render")
  }
  return story.render({}, {} as never)
}

function canvasFor(story: typeof TextBasic) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(fixture(story))
  return canvas
}

describe("Skeleton story clearance", () => {
  it("insets the capture root without cropping or constraining fixture geometry", () => {
    const decorator = Array.isArray(meta.decorators)
      ? meta.decorators[0]
      : meta.decorators
    if (!decorator) {
      throw new Error("Missing Skeleton story inset decorator")
    }
    for (const story of [AnimationSpeed, TextBasic]) {
      const canvas = document.createElement("div")
      canvas.innerHTML = renderToStaticMarkup(
        decorator(() => fixture(story), {} as never)
      )
      expect(canvas.firstElementChild?.className).toBe("p-200")
      expect(canvas.firstElementChild?.hasAttribute("style")).toBe(false)
      expect(
        canvas.querySelectorAll(".animate-skeleton-pulse-normal").length
      ).toBeGreaterThan(0)
    }
  })

  it("preserves intentional fixed widths and heights inside the new inset", () => {
    const speeds = canvasFor(AnimationSpeed).querySelectorAll(".w-xs")
    expect(speeds).toHaveLength(3)
    for (const shape of speeds) {
      expect(shape.classList.contains("h-16")).toBe(true)
    }

    const fixed = canvasFor(RectangleFixedDimensions)
    expect(fixed.querySelector(".h-64")).not.toBeNull()
    expect(fixed.querySelector(".w-xs.h-16")).not.toBeNull()
    expect(canvasFor(Variants).querySelectorAll(".w-xs.h-20")).toHaveLength(2)
  })

  it("compares sizes in equal responsive columns without intrinsic text widths", () => {
    const comparison = canvasFor(Sizes).firstElementChild
    for (const name of [
      "grid",
      "w-full",
      "max-w-xl",
      "grid-cols-1",
      "sm:grid-cols-3",
    ]) {
      expect(comparison?.classList.contains(name)).toBe(true)
    }
    expect(comparison?.children).toHaveLength(3)
    for (const column of Array.from(comparison?.children ?? [])) {
      expect(column.classList.contains("min-w-0")).toBe(true)
    }
  })

  it("bounds the loading stack while retaining the fixed placeholder dimensions", () => {
    const canvas = canvasFor(InteractionIsolation)
    expect(canvas.firstElementChild?.className).toBe(
      "flex w-full max-w-md flex-col gap-250"
    )
    for (const id of ["group-rectangle", "standalone-rectangle"]) {
      const shape = canvas.querySelector(`[data-testid="${id}"]`)
      expect(shape?.classList.contains("h-20")).toBe(true)
      expect(shape?.classList.contains("w-xs")).toBe(true)
    }
  })

  it("gives every loaded action the same gap even when Skeleton removes its wrappers", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    try {
      await act(async () => root.render(fixture(InteractionIsolation)))
      const toggle = canvas.querySelector("button")
      if (!toggle) {
        throw new Error("Missing Skeleton loading toggle")
      }
      await act(async () => toggle.click())
      const stack = canvas.firstElementChild
      expect(stack?.className).toBe("flex w-full max-w-md flex-col gap-250")
      const actions = Array.from(canvas.querySelectorAll("button"))
      expect(actions.map((button) => button.textContent)).toEqual([
        "Toggle loading",
        "Root action",
        "Rectangle action",
        "Standalone action",
        "After placeholders",
      ])
      for (const action of actions) {
        expect(action.parentElement).toBe(stack)
      }
    } finally {
      await act(async () => root.unmount())
      canvas.remove()
      vi.unstubAllGlobals()
    }
  })
})
