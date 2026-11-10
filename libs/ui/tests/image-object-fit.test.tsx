import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Image, ImageWithFallback } from "../src/atoms/image"

const src = "photo.jpg"
const alt = "Trail shoe on a white background"

describe("Image objectFit", () => {
  it("keeps object-cover as the default crop", () => {
    const html = renderToStaticMarkup(createElement(Image, { src, alt }))
    expect(html).toContain("object-cover")
    expect(html).not.toContain("object-contain")
  })

  it.each([
    ["contain", "object-contain"],
    ["fill", "object-fill"],
    ["none", "object-none"],
    ["scaleDown", "object-scale-down"],
  ] as const)("maps objectFit %s to %s", (objectFit, className) => {
    const html = renderToStaticMarkup(
      createElement(Image, { src, alt, objectFit })
    )
    expect(html).toContain(className)
    expect(html).not.toContain("object-cover")
  })

  it("applies objectFit to the fallback wrapper image as well", () => {
    const html = renderToStaticMarkup(
      createElement(ImageWithFallback, {
        src,
        alt,
        objectFit: "contain",
      })
    )
    expect(html).toContain("object-contain")
    expect(html).not.toContain("object-cover")
  })

  it("does not forward objectFit to the native img as an attribute", () => {
    const html = renderToStaticMarkup(
      createElement(Image, { src, alt, objectFit: "fill" })
    )
    expect(html).not.toContain("objectFit")
  })
})
