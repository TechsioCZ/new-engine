import { readFileSync } from "node:fs"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Badge } from "../src/atoms/badge"
import { Button, buttonVariants } from "../src/atoms/button"
import { ImageWithFallback } from "../src/atoms/image"
import { LinkButton } from "../src/atoms/link-button"
import { Skeleton } from "../src/atoms/skeleton"

const NATIVE_DISABLED = /\sdisabled=/
const LOCALIZED_STATUS = /role="status"[^>]*aria-label="Chargement"/
const STATUS_ROLE = /role="status"/g
const INERT_STATUS = /<div[^>]*role="status"[^>]*inert=/
const LOADING_ATTRIBUTES = /aria-busy|aria-hidden|inert=/
const ROOT_TAG = /^<div[^>]*>/
const FAST_PULSE = /animate-skeleton-pulse-fast/g
const SLOW_PULSE = /animate-skeleton-pulse-slow/g
const STORY_SPLIT = /(?=export const )/

const render = renderToStaticMarkup
const action = h("button", { type: "button" }, "Eventual action")

describe("actions wave 3 contracts", () => {
  it("keeps pending actions focusable, but explicit disabled remains native", () => {
    const pending = render(h(Button, { isLoading: true }, "Save changes"))
    expect(pending).toContain('aria-disabled="true"')
    expect(pending).toContain('aria-busy="true"')
    expect(pending).toContain('data-loading=""')
    expect(pending).not.toMatch(NATIVE_DISABLED)
    expect(render(h(Button, { disabled: true }, "Save changes"))).toMatch(
      NATIVE_DISABLED
    )
  })

  it("offers an explicit composition opt-out without changing unstyled semantics", () => {
    const unstyled = buttonVariants({ theme: "unstyled" })
    expect(unstyled).toContain("font-button")
    expect(unstyled).toContain("active:scale-97")
    const composed = buttonVariants({ composition: true, theme: "unstyled" })
    expect(composed).not.toContain("font-button")
    expect(composed).not.toContain("active:scale-97")
    expect(composed).toContain("focus-visible:")
    const link = render(
      h(LinkButton, { composition: true, href: "/orders" }, "Orders")
    )
    expect(link).not.toContain("font-button")
    expect(link).not.toContain("composition=")
  })

  it.each(["sm", "md", "lg"] as const)(
    "uses content-driven %s button geometry",
    (size) => {
      expect(buttonVariants({ size })).toContain(`button-size-${size}`)
      expect(buttonVariants({ size })).not.toContain(`h-form-control-${size}`)
    }
  )

  it("isolates root placeholders, with one non-inert localized status", () => {
    const html = render(h(Skeleton, { "aria-label": "Chargement" }, action))
    expect(html).toMatch(LOCALIZED_STATUS)
    expect(html.match(STATUS_ROLE)).toHaveLength(1)
    expect(html).toContain('<div aria-hidden="true" class="contents" inert="">')
    expect(html).not.toMatch(INERT_STATUS)
    const loaded = render(h(Skeleton, { isLoaded: true }, action))
    expect(loaded).toContain("Eventual action")
    expect(loaded).not.toMatch(LOADING_ATTRIBUTES)
  })

  it.each([Skeleton.Rectangle, Skeleton.Circle, Skeleton.Text])(
    "withholds eventual shape children until loaded",
    (Shape) => {
      expect(render(h(Shape, null, action))).not.toContain("Eventual action")
      expect(render(h(Shape, { isLoaded: true }, action))).toContain(
        "Eventual action"
      )
    }
  )

  it("gives only visible shapes their own pulse, with real local overrides", () => {
    const html = render(
      h(
        Skeleton,
        { speed: "slow" },
        h(Skeleton.Circle, { speed: "fast" }),
        h(Skeleton.Text, { noOfLines: 2 })
      )
    )
    const root = html.match(ROOT_TAG)?.[0]
    expect(root).not.toContain("animate-skeleton")
    expect(html.match(FAST_PULSE)).toHaveLength(1)
    expect(html.match(SLOW_PULSE)).toHaveLength(2)
  })

  it("renders a reserved neutral missing image without visible long alt copy", () => {
    const html = render(
      h(ImageWithFallback, {
        src: "",
        alt: "A handmade ceramic bowl",
        width: 960,
        height: 640,
      })
    )
    expect(html).toContain('data-image-fallback=""')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="A handmade ceramic bowl"')
    expect(html).toContain('width="960"')
    expect(html).not.toContain('src=""')
    expect(html).not.toContain(">A handmade ceramic bowl<")
    const decorative = render(h(ImageWithFallback, { src: "", alt: "" }))
    expect(decorative).not.toContain("aria-label=")
    expect(decorative).toContain('aria-hidden="true"')
    expect(render(h(Badge, null, "Ready"))).toContain("Ready")
  })

  it("reserves intrinsic media geometry independently of the adapter request", () => {
    const html = render(
      h(ImageWithFallback, {
        src: "/photo.jpg",
        alt: "Ceramic bowl",
        width: 960,
        height: 640,
        className: "aspect-video",
      })
    )
    expect(html).toContain('data-image-state="loading"')
    expect(html).toContain('data-image-reservation=""')
    expect(html).toContain("--image-aspect-ratio:960 / 640")
    expect(html).toContain('focusable="false"')
    expect(html).toContain("absolute inset-0")
    expect(html).not.toContain("aspect-(--image-aspect-ratio)")
    expect(html).toContain("aspect-video")
    const withoutDimensions = render(
      h(ImageWithFallback, { src: "/photo.jpg", alt: "Ceramic bowl" })
    )
    expect(withoutDimensions).not.toContain('data-image-reservation=""')
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not reserve invalid image geometry for width %s",
    (width) => {
      // Invalid dimensions stay out of SVG/CSS calculations.
      const html = render(
        h(ImageWithFallback, {
          src: "/photo.jpg",
          alt: "Ceramic bowl",
          width: String(width),
          height: 640,
        })
      )
      expect(html).not.toContain('data-image-reservation=""')
      expect(html).not.toContain("--image-aspect-ratio:")
    }
  )

  it("disables misleading controls only for fixed galleries", () => {
    for (const name of ["action-icon", "button", "badge"]) {
      const source = readFileSync(
        new URL(`../stories/atoms/${name}.stories.tsx`, import.meta.url),
        "utf8"
      )
      const stories = source.split(STORY_SPLIT).slice(1)
      for (const story of stories) {
        if (story.includes("render: () =>")) {
          expect(story).toContain("controls: { disable: true }")
        }
      }
      const playground = stories.find((story) =>
        story.startsWith("export const Playground")
      )
      expect(playground).not.toContain("controls: { disable: true }")
    }
  })
})
