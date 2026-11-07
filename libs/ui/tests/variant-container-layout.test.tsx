// @vitest-environment happy-dom
import { isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { VariantContainer } from "../.storybook/decorator"
import {
  Sizes as ActionIconSizes,
  Variants as ActionIconVariants,
} from "../stories/atoms/action-icon.stories"
import { Platforms as HotkeysPlatforms } from "../stories/atoms/hotkeys.stories"
import {
  AspectAndFit as ImageFit,
  Sizes as ImageSizes,
} from "../stories/atoms/image.stories"
import {
  Sizes as MoleculeSizes,
  Variants as MoleculeVariants,
} from "../stories/molecules/breadcrumb.stories"
import {
  Sizes as TemplateSizes,
  Variants as TemplateVariants,
} from "../stories/templates/breadcrumb.stories"

function renderedRoot(element: Parameters<typeof renderToStaticMarkup>[0]) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(element)
  // React 19 may prepend image preload links before the comparison root.
  const root = canvas.querySelector("div")
  if (!root) {
    throw new Error("Missing variant container")
  }
  return root
}

describe("shared variant layout", () => {
  it("retains the default alignment and section spacing", () => {
    const root = renderedRoot(<VariantContainer>Example</VariantContainer>)
    expect([...root.classList]).toEqual(
      expect.arrayContaining([
        "flex",
        "flex-col",
        "items-center",
        "space-y-800",
      ])
    )
  })

  it.each([
    ["action icon variants", ActionIconVariants, "gap-250"],
    ["action icon sizes", ActionIconSizes, "gap-250"],
    ["image sizes", ImageSizes, "gap-400"],
    ["image fit", ImageFit, "gap-400"],
  ] as const)(
    "keeps compact %s on the shared layout helper",
    (_, story, gap) => {
      if (!story.render) {
        throw new Error("Missing compact comparison")
      }
      const element = story.render({} as never, {} as never)
      expect(isValidElement(element) && element.type).toBe(VariantContainer)
      const root = renderedRoot(element)
      for (const token of ["items-stretch", "space-y-0", gap]) {
        expect(
          root.classList.contains(token),
          `${token}: ${root.className}`
        ).toBe(true)
      }
      expect(root.classList.contains("items-center")).toBe(false)
      expect(root.classList.contains("space-y-800")).toBe(false)
    }
  )

  it("keeps platform previews compact without the default matrix margins", () => {
    if (!HotkeysPlatforms.render) {
      throw new Error("Missing platform comparison")
    }
    const root = renderedRoot(HotkeysPlatforms.render({} as never, {} as never))
    const heading = [...root.querySelectorAll("h3")].find(
      (element) => element.textContent === "macOS"
    )
    const matrix = heading?.parentElement?.parentElement
    for (const token of ["items-stretch", "space-y-0", "gap-300"]) {
      expect(matrix?.classList.contains(token)).toBe(true)
    }
    expect(matrix?.classList.contains("space-y-800")).toBe(false)
  })

  it.each([
    ["molecule variants", MoleculeVariants],
    ["molecule sizes", MoleculeSizes],
    ["template variants", TemplateVariants],
    ["template sizes", TemplateSizes],
  ] as const)(
    "keeps %s on the shared container without doubling gaps",
    (_, story) => {
      if (!story.render) {
        throw new Error("Missing breadcrumb comparison")
      }
      const element = story.render({} as never, {} as never)
      expect(isValidElement(element) && element.type).toBe(VariantContainer)
      const root = renderedRoot(element)
      expect([...root.classList]).toEqual(
        expect.arrayContaining([
          "flex",
          "flex-col",
          "items-start",
          "gap-400",
          "space-y-0",
        ])
      )
      expect(root.classList.contains("items-center")).toBe(false)
      expect(root.classList.contains("space-y-800")).toBe(false)
      expect(root.querySelectorAll("h3").length).toBeGreaterThan(0)
    }
  )
})
