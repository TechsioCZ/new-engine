import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ActionIcon } from "../src/atoms/action-icon"
import { Carousel } from "../src/molecules/carousel"
import { Variants } from "../stories/atoms/action-icon.stories"

const classAttribute = /\bclass="([^"]+)"/
const buttonTags = /<button\b[^>]*>/g
const closeGlyph = /token-icon-close/g
const whitespace = /\s+/

function classes(html: string | undefined) {
  return html?.match(classAttribute)?.[1]?.split(whitespace) ?? []
}

function declarations(file: string) {
  const values = new Map<string, string>()
  postcss
    .parse(readFileSync(new URL(file, import.meta.url), "utf8"))
    .walkDecls((declaration) => {
      values.set(declaration.prop, declaration.value)
    })
  return values
}

describe("ActionIcon resting affordance", () => {
  it.each(["sm", "md", "lg"] as const)(
    "retains the shared %s hit area and decorative glyph contract",
    (size) => {
      const html = renderToStaticMarkup(
        <ActionIcon
          aria-label="Close details"
          icon="token-icon-close"
          size={size}
        />
      )
      expect(classes(html)).toEqual(
        expect.arrayContaining([
          size === "lg" ? "size-action-icon-lg" : `size-icon-control-${size}`,
          `text-action-icon-${size}`,
          "action-icon-surface",
          "focus-visible:outline-(style:--default-ring-style)",
          "focus-visible:outline-(length:--default-ring-width)",
          "focus-visible:outline-offset-(length:--default-ring-offset)",
          "focus-visible:outline-icon-control-ring",
        ])
      )
      expect(html).toContain('type="button"')
      expect(html).toContain('aria-label="Close details"')
      expect(html).toContain('aria-hidden="true"')
      expect(html).not.toContain("tabindex=")
    }
  )

  it("keeps the new fill opt-in and preserves non-Business glyph defaults", () => {
    const values = declarations(
      "../src/tokens/components/atoms/_action-icon.css"
    )
    expect(values.get("--color-action-icon-surface")).toBe(
      "var(--color-transparent)"
    )
    expect(values.get("--color-action-icon-bg")).toBe(
      "var(--color-action-icon-surface)"
    )
    expect(values.get("--size-action-icon-target-lg")).toBe(
      "var(--size-icon-control-lg)"
    )
    expect(values.get("--size-action-icon-lg")).toBe(
      "var(--size-action-icon-target-lg)"
    )
    for (const size of ["sm", "md", "lg"]) {
      expect(values.get(`--text-action-icon-glyph-${size}`)).toBe(
        `var(--text-icon-control-${size})`
      )
      expect(values.get(`--text-action-icon-${size}`)).toBe(
        `var(--text-action-icon-glyph-${size})`
      )
    }
  })

  it.each(["neutral", "danger"] as const)(
    "retains the resting fill and native disabled semantics for %s",
    (tone) => {
      const html = renderToStaticMarkup(
        <ActionIcon
          aria-label="Close details"
          disabled
          icon="token-icon-close"
          tone={tone}
        />
      )
      expect(html).toContain('disabled=""')
      expect(classes(html)).toEqual(
        expect.arrayContaining([
          "action-icon-surface",
          "disabled:cursor-not-allowed",
          "disabled:text-icon-control-fg-disabled",
        ])
      )
      expect(classes(html)).toContain(
        tone === "danger"
          ? "not-disabled:active:bg-action-icon-bg-danger-active"
          : "not-disabled:active:bg-icon-control-bg-active"
      )
      if (tone === "danger") {
        expect(classes(html)).toContain("text-action-icon-fg-danger")
      }
    }
  )

  it("merges consumer backgrounds and retains sizing and positioning classes", () => {
    const html = renderToStaticMarkup(
      <ActionIcon
        aria-labelledby="close-label"
        className="absolute end-dialog-close-trigger-offset size-icon-control-lg bg-carousel-navigation-bg"
        data-part="close-trigger"
        icon="token-icon-close"
        size="sm"
        type="submit"
      />
    )
    expect(classes(html)).toEqual(
      expect.arrayContaining([
        "absolute",
        "end-dialog-close-trigger-offset",
        "bg-carousel-navigation-bg",
        "size-icon-control-lg",
      ])
    )
    expect(classes(html)).toContain("action-icon-surface")
    expect(classes(html)).not.toContain("bg-action-icon-bg")
    expect(html).toContain('type="submit"')
    expect(html).toContain('aria-labelledby="close-label"')
    expect(html).toContain('data-part="close-trigger"')
  })

  it("preserves actual Carousel navigation surfaces and disabled controls", () => {
    const html = renderToStaticMarkup(
      <Carousel id="action-icon-consumer" slideCount={1}>
        <Carousel.Previous />
        <Carousel.Next />
      </Carousel>
    )
    const buttons = html.match(buttonTags) ?? []
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(classes(button)).toContain("bg-carousel-navigation-bg")
      expect(classes(button)).toContain("action-icon-surface")
      expect(classes(button)).not.toContain("bg-action-icon-bg")
      expect(button).toContain('disabled=""')
      expect(button).toContain('aria-disabled="true"')
    }
  })

  it("compares tones using the same glyph in the actual variant story", () => {
    if (!Variants.render) {
      throw new Error("Missing ActionIcon variants composition")
    }
    const html = renderToStaticMarkup(Variants.render({} as never, {} as never))
    const buttons = html.match(buttonTags) ?? []
    expect(buttons).toHaveLength(2)
    expect(classes(buttons[0])).toContain("action-icon-surface")
    expect(classes(buttons[1])).toContain("action-icon-surface")
    expect(classes(buttons[1])).toContain("text-action-icon-fg-danger")
    expect(html.match(closeGlyph)).toHaveLength(2)
    expect(html).not.toContain("token-icon-trash")
    expect(html).toContain('aria-label="Discard draft"')
  })
})
