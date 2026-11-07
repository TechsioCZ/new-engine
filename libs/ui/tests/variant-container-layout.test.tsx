// @vitest-environment happy-dom
import { isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { VariantContainer } from "../.storybook/decorator"
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
  const root = canvas.firstElementChild
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
