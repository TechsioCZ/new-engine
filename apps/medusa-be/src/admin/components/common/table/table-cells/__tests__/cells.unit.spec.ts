import React from "react"

jest.mock("@medusajs/ui", () => {
  const React = require("react")
  const clx = (...parts: any[]) =>
    parts
      .flatMap((part) => {
        if (!part) {
          return []
        }

        if (typeof part === "string") {
          return [part]
        }

        if (typeof part === "object") {
          return Object.keys(part).filter((key) => part[key])
        }

        return []
      })
      .join(" ")

  const Tooltip = ({ children, ...props }: any) =>
    React.createElement("tooltip", props, children)

  return { clx, Tooltip }
})

jest.mock("date-fns/format", () => ({
  format: (_date: Date, template: string) => `formatted:${template}`,
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}))

jest.mock("@medusajs/icons", () => ({
  Photo: (props: any) => require("react").createElement("photo-icon", props),
}))

import { Photo } from "@medusajs/icons"
import { Tooltip } from "@medusajs/ui"
import { AmountCell } from "../amount-cell"
import { DateCell, DateHeader } from "../date-cell"
import { PlaceholderCell } from "../placeholder-cell"
import { ProductCell, ProductHeader } from "../product-cell"
import { TextCell, TextHeader } from "../text-cell"
import { Thumbnail } from "../../../thumbnail"

const collectElements = (node: any, type: any): any[] => {
  const found: any[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    if (value.type === type) {
      found.push(value)
    }

    walk(value.props?.children)
  }

  walk(node)
  return found
}

describe("table cell components", () => {
  it("returns placeholder for missing amount and text", () => {
    expect(AmountCell({ currencyCode: "USD" }).type).toBe(PlaceholderCell)
    expect(TextCell({ text: undefined }).type).toBe(PlaceholderCell)
    expect(TextCell({ text: 0 }).type).toBe(PlaceholderCell)
  })

  it("renders amount diff styles when original amount differs", () => {
    const tree = AmountCell({
      currencyCode: "USD",
      amount: 10,
      originalAmount: 12,
      align: "right",
      className: "custom",
    })

    expect(tree.props.className).toContain("flex-col")
    expect(tree.props.className).toContain("justify-end text-right")
    expect(tree.props.className).toContain("custom")

    const spans = collectElements(tree, "span")
    expect(spans).toHaveLength(2)
    expect(spans[0].props.children).toBe("$12.00")
    expect(spans[1].props.children).toBe("$10.00")
  })

  it("renders regular amount when no diff is present", () => {
    const tree = AmountCell({
      currencyCode: "USD",
      amount: 10,
      originalAmount: 10,
      align: "left",
    })

    expect(tree.props.className).toContain("justify-start text-left")
    const spans = collectElements(tree, "span")
    expect(spans).toHaveLength(1)
    expect(spans[0].props.children).toBe("$10.00")
  })

  it("renders text cell and header with alignment", () => {
    const cell = TextCell({
      text: "ACME",
      align: "center",
      maxWidth: 120,
    })
    expect(cell.props.className).toContain("justify-center text-center")
    expect(cell.props.style).toEqual({ maxWidth: 120 })

    const header = TextHeader({ text: "Company", align: "right" })
    expect(header.props.className).toContain("justify-end text-end")
  })

  it("renders date cell tooltip/date and date header label", () => {
    const cell = DateCell({ date: "2026-01-02T10:00:00.000Z" })
    const tooltip = collectElements(cell, Tooltip)[0]
    expect(tooltip.props.content.props.children).toMatch(
      /^formatted:dd MMM yyyy (hh:MM a|HH:MM)$/
    )
    const spans = collectElements(cell, "span")
    expect(spans.some((span) => span.props.children === "formatted:dd MMM yyyy")).toBe(true)

    const header = DateHeader()
    const headerSpans = collectElements(header, "span")
    expect(headerSpans[0].props.children).toBe("translated:fields.date")
  })

  it("switches timestamp format based on 12h/24h locale setting", () => {
    const originalDateTimeFormat = Intl.DateTimeFormat

    ;(Intl as any).DateTimeFormat = () => ({
      resolvedOptions: () => ({ hour12: false }),
    })
    const twentyFourHour = DateCell({ date: "2026-01-02T10:00:00.000Z" })
    let tooltip = collectElements(twentyFourHour, Tooltip)[0]
    expect(tooltip.props.content.props.children).toBe("formatted:dd MMM yyyy HH:MM")

    ;(Intl as any).DateTimeFormat = () => ({
      resolvedOptions: () => ({ hour12: true }),
    })
    const twelveHour = DateCell({ date: "2026-01-02T10:00:00.000Z" })
    tooltip = collectElements(twelveHour, Tooltip)[0]
    expect(tooltip.props.content.props.children).toBe("formatted:dd MMM yyyy hh:MM a")

    ;(Intl as any).DateTimeFormat = originalDateTimeFormat
  })

  it("renders product cell, product header and thumbnail variants", () => {
    const productTree = ProductCell({
      product: {
        id: "prod_1",
        title: "Product A",
        thumbnail: "https://example.com/thumb.jpg",
      } as any,
    })
    const productSpans = collectElements(productTree, "span")
    expect(productSpans.some((span) => span.props.children === "Product A")).toBe(true)

    const headerTree = ProductHeader()
    const headerSpans = collectElements(headerTree, "span")
    expect(headerSpans[0].props.children).toBe("translated:fields.product")

    const withImage = Thumbnail({
      src: "https://example.com/thumb.jpg",
      alt: "thumb",
    })
    const imgs = collectElements(withImage, "img")
    expect(imgs).toHaveLength(1)
    expect(imgs[0].props.src).toBe("https://example.com/thumb.jpg")
    expect(imgs[0].props.alt).toBe("thumb")

    const withoutImage = Thumbnail({ src: null })
    const photos = collectElements(withoutImage, Photo)
    expect(photos).toHaveLength(1)
  })

  it("uses placeholder when date is not provided", () => {
    expect(DateCell({ date: null }).type).toBe(PlaceholderCell)
  })
})
