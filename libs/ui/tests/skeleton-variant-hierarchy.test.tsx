// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Skeleton } from "../src/atoms/skeleton"
import { ReducedMotion, Variants } from "../stories/atoms/skeleton.stories"

function renderStory(story: typeof Variants) {
  if (!story.render) {
    throw new Error("Missing Skeleton comparison render")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(story.render({}, {} as never))
  return canvas
}

const shapeSelector = '[class*="animate-skeleton-pulse-"]'
const fillClass = /^bg-skeleton-bg-(?:primary|secondary)$/

function requiredElement(root: Element, selector: string) {
  const element = root.querySelector(selector)
  if (!element) {
    throw new Error(`Missing Skeleton fixture element: ${selector}`)
  }
  return element
}

function comparisonClasses(shape: Element) {
  return Array.from(shape.classList).filter((name) => !fillClass.test(name))
}

describe("Skeleton variant hierarchy", () => {
  it("compares equal static rectangles with only the fill token changing", () => {
    const canvas = renderStory(Variants)
    const primary = requiredElement(canvas, '[data-testid="skeleton-primary"]')
    const secondary = requiredElement(
      canvas,
      '[data-testid="skeleton-secondary"]'
    )
    expect(primary.classList.contains("bg-skeleton-bg-primary")).toBe(true)
    expect(secondary.classList.contains("bg-skeleton-bg-secondary")).toBe(true)
    expect(comparisonClasses(primary)).toEqual(comparisonClasses(secondary))
    for (const shape of [primary, secondary]) {
      expect(shape.classList.contains("force-reduced-motion")).toBe(true)
      expect(shape.classList.contains("h-20")).toBe(true)
      expect(shape.classList.contains("w-xs")).toBe(true)
      expect(shape.hasAttribute("style")).toBe(false)
    }
  })

  it("compares both reduced-motion variants across every shape on equal terms", () => {
    const canvas = renderStory(ReducedMotion)
    const groups = ["primary", "secondary"].map((variant) => {
      const group = requiredElement(
        canvas,
        `[data-testid="reduced-motion-${variant}"]`
      )
      const shapes = Array.from(group.querySelectorAll(shapeSelector))
      expect(shapes).toHaveLength(5)
      expect(group.querySelectorAll('[role="status"]')).toHaveLength(0)
      expect(group.querySelector("[inert]")).not.toBeNull()
      for (const shape of shapes) {
        expect(shape.classList.contains(`bg-skeleton-bg-${variant}`)).toBe(true)
        expect(shape.classList.contains("force-reduced-motion")).toBe(true)
        expect(shape.closest('[aria-hidden="true"]')).not.toBeNull()
      }
      return shapes
    })
    expect(groups[0]?.map(comparisonClasses)).toEqual(
      groups[1]?.map(comparisonClasses)
    )
    expect(canvas.querySelectorAll('[role="status"]')).toHaveLength(2)
  })

  it("matches the forced static preview to every OS reduced-motion utility", () => {
    const css = postcss.parse(
      readFileSync(
        resolve(
          dirname(fileURLToPath(import.meta.url)),
          "../src/tokens/components/atoms/_skeleton.css"
        ),
        "utf8"
      )
    )
    const forced = new Map<string, string>()
    css.walkRules(".force-reduced-motion", (rule) => {
      rule.walkDecls((decl) => {
        forced.set(decl.prop, decl.value)
      })
    })
    expect(Object.fromEntries(forced)).toEqual({
      animation: "none",
      opacity: "0.7",
    })
    let reducedMotionRules = 0
    css.walkAtRules("media", (rule) => {
      if (rule.params !== "(prefers-reduced-motion: reduce)") {
        return
      }
      reducedMotionRules += 1
      expect(rule.parent?.type).toBe("rule")
      const selectors =
        rule.parent?.type === "rule" ? rule.parent.selectors : []
      expect(selectors).toEqual([
        ".animate-skeleton-pulse-slow",
        ".animate-skeleton-pulse-normal",
        ".animate-skeleton-pulse-fast",
      ])
      const values = new Map<string, string>()
      rule.walkDecls((decl) => {
        values.set(decl.prop, decl.value)
      })
      expect(values).toEqual(forced)
    })
    expect(reducedMotionRules).toBe(1)
  })

  it("leaves default consumers animated and primary", () => {
    for (const Shape of [Skeleton.Rectangle, Skeleton.Circle, Skeleton.Text]) {
      const canvas = document.createElement("div")
      canvas.innerHTML = renderToStaticMarkup(createElement(Shape))
      const shapes = canvas.querySelectorAll(shapeSelector)
      expect(shapes.length).toBeGreaterThan(0)
      for (const shape of shapes) {
        expect(shape.classList.contains("bg-skeleton-bg-primary")).toBe(true)
        expect(shape.classList.contains("animate-skeleton-pulse-normal")).toBe(
          true
        )
        expect(shape.classList.contains("force-reduced-motion")).toBe(false)
      }
    }
  })

  it("retains variant and speed inheritance with local overrides", () => {
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      createElement(
        Skeleton,
        { variant: "secondary", speed: "slow" },
        createElement(Skeleton.Circle),
        createElement(Skeleton.Rectangle, { variant: "primary", speed: "fast" })
      )
    )
    const shapes = canvas.querySelectorAll(shapeSelector)
    expect(shapes[0]?.classList.contains("bg-skeleton-bg-secondary")).toBe(true)
    expect(shapes[0]?.classList.contains("animate-skeleton-pulse-slow")).toBe(
      true
    )
    expect(shapes[1]?.classList.contains("bg-skeleton-bg-primary")).toBe(true)
    expect(shapes[1]?.classList.contains("animate-skeleton-pulse-fast")).toBe(
      true
    )
  })

  it("keeps root actions inert while loading and restores loaded content", () => {
    for (const isLoaded of [false, true]) {
      const canvas = document.createElement("div")
      canvas.innerHTML = renderToStaticMarkup(
        createElement(
          Skeleton,
          { isLoaded, variant: "secondary" },
          createElement("button", { type: "button" }, "Root action"),
          createElement(
            Skeleton.Rectangle,
            {},
            createElement("button", { type: "button" }, "Rectangle action")
          )
        )
      )
      if (isLoaded) {
        expect(
          canvas.querySelector("[inert], [aria-busy], [aria-hidden]")
        ).toBeNull()
        expect(canvas.querySelectorAll("button")).toHaveLength(2)
        expect(canvas.querySelector(shapeSelector)).toBeNull()
      } else {
        expect(
          canvas.querySelector("button")?.closest("[inert]")
        ).not.toBeNull()
        expect(canvas.querySelectorAll("button")).toHaveLength(1)
        expect(canvas.querySelectorAll('[role="status"]')).toHaveLength(1)
      }
    }
  })
})
