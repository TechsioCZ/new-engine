import { readFileSync } from "node:fs"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ActionIcon } from "../src/atoms/action-icon"
import { Button } from "../src/atoms/button"
import { Checkbox } from "../src/atoms/checkbox"

const NEUTRAL_REST_INK = /\stext-icon-control-fg[\s"]/
const UNGUARDED_ARIA_DISABLED = /\[aria-disabled="true"\]\)/
const TRACKED_SPINNER =
  /--svg: url\("data:image\/svg\+xml,[^"]*fill-opacity='\.25'/

const render = renderToStaticMarkup
const tokens = (name: string) =>
  readFileSync(
    new URL(`../src/tokens/components/atoms/_${name}.css`, import.meta.url),
    "utf8"
  )

describe("council control atom fixes", () => {
  it("paints danger ActionIcon ink at rest, not only on hover", () => {
    const danger = render(
      h(ActionIcon, {
        "aria-label": "Remove attachment",
        icon: "token-icon-trash",
        tone: "danger",
      })
    )
    expect(danger).toContain("text-action-icon-fg-danger")
    expect(danger).not.toMatch(NEUTRAL_REST_INK)
    expect(danger).toContain("disabled:text-icon-control-fg-disabled")
    const neutral = render(
      h(ActionIcon, { "aria-label": "Close", icon: "token-icon-close" })
    )
    expect(neutral).not.toContain("text-action-icon-fg-danger")
    expect(tokens("action-icon")).toContain(
      "--color-action-icon-fg-danger: var(--color-action-icon-danger);"
    )
  })

  it("keeps loading buttons out of the disabled paint", () => {
    const css = tokens("button")
    const utility = css.slice(css.indexOf("@utility button-disabled"))
    expect(utility).toContain('[aria-disabled="true"]:not([data-loading])')
    expect(utility).not.toMatch(UNGUARDED_ARIA_DISABLED)
    const pending = render(h(Button, { isLoading: true }, "Save"))
    expect(pending).toContain("not-disabled:data-loading:cursor-progress")
  })

  it.each(["sm", "md", "lg"] as const)(
    "sizes %s button glyphs and spinner from the button size",
    (size) => {
      const withIcon = render(
        h(Button, { icon: "token-icon-plus", size }, "Add")
      )
      expect(withIcon).toContain(`text-button-icon-${size}`)
      const loading = render(h(Button, { isLoading: true, size }, "Add"))
      expect(loading).toContain(`text-button-icon-${size}`)
    }
  )

  it("lets an explicit iconSize and size=current keep their own glyph size", () => {
    const explicit = render(
      h(Button, { icon: "token-icon-plus", iconSize: "lg" }, "Add")
    )
    expect(explicit).toContain("text-icon-lg")
    expect(explicit).not.toContain("text-button-icon-")
    const inherited = render(
      h(Button, { icon: "token-icon-plus", size: "current" }, "Add")
    )
    expect(inherited).not.toContain("text-button-icon-")
  })

  it.each(["sm", "md", "lg"] as const)(
    "scales the %s check glyph with its box",
    (size) => {
      const html = render(h(Checkbox, { "aria-label": "Select", size }))
      expect(html).toContain(`size-form-checkbox-control-${size}`)
      expect(html).toContain(`text-checkbox-icon-${size}`)
      expect(tokens("checkbox")).toContain(
        `--text-checkbox-glyph-${size}: calc(var(--size-form-checkbox-control-${size}) * 0.8);`
      )
    }
  )

  it("draws a readable half star and a spinner with a full track", () => {
    const css = tokens("icon")
    expect(css).toContain("@apply icon-[mdi--star-half-full];")
    expect(css).not.toContain("icon-[mdi--star-half];")
    const spinner = css.slice(css.indexOf("@utility token-icon-spinner"))
    expect(spinner).toContain("@apply icon-[mdi--loading];")
    expect(spinner).toMatch(TRACKED_SPINNER)
    expect(spinner).toContain("animate-spin")
  })
})
