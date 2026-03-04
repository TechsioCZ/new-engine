import React from "react"
import {
  GeneralSectionSkeleton,
  HeadingSkeleton,
  IconButtonSkeleton,
  JsonViewSectionSkeleton,
  SingleColumnPageSkeleton,
  Skeleton,
  TableFooterSkeleton,
  TableSectionSkeleton,
  TableSkeleton,
  TextSkeleton,
  TwoColumnPageSkeleton,
} from "../skeleton"

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

  const Container = ({ children, ...props }: any) =>
    React.createElement("container", props, children)

  return { clx, Container }
})

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

describe("skeleton components", () => {
  it("renders base skeleton and icon-button skeleton", () => {
    const base = Skeleton({ className: "w-10", style: { width: "40px" } })
    expect(base.props.className).toContain("animate-pulse")
    expect(base.props.className).toContain("w-10")
    expect(base.props.style).toEqual({ width: "40px" })

    const icon = IconButtonSkeleton()
    expect(icon.props.className).toContain("h-7 w-7")
  })

  it("builds heading and text skeleton sizes", () => {
    const h1 = HeadingSkeleton({ level: "h1", characters: 4 })
    const h2 = HeadingSkeleton({ level: "h2", characters: 4 })
    const h3 = HeadingSkeleton({ level: "h3", characters: 4 })

    expect(h1.props.className).toContain("h-7")
    expect(h1.props.style.width).toBe("44px")
    expect(h2.props.className).toContain("h-6")
    expect(h2.props.style.width).toBe("40px")
    expect(h3.props.className).toContain("h-5")
    expect(h3.props.style.width).toBe("36px")

    const textLarge = TextSkeleton({ size: "xlarge", characters: 3 })
    expect(textLarge.props.className).toContain("h-8")
    expect(textLarge.props.style.width).toBe("39px")

    const textSmall = TextSkeleton({
      size: "xsmall",
      leading: "compact",
      characters: 5,
    })
    expect(textSmall.props.className).toContain("h-5")
    expect(textSmall.props.className).toContain("!h-5")
    expect(textSmall.props.style.width).toBe("40px")

    const textLargeSize = TextSkeleton({ size: "large", characters: 2 })
    expect(textLargeSize.props.style.width).toBe("22px")
    expect(textLargeSize.props.className).toContain("!h-5")

    const textBase = TextSkeleton({ size: "base", leading: "normal", characters: 2 })
    expect(textBase.props.style.width).toBe("20px")
    expect(textBase.props.className).toContain("h-7")

    const textDefault = TextSkeleton({ size: "small", leading: "normal", characters: 2 })
    expect(textDefault.props.style.width).toBe("18px")
    expect(textDefault.props.className).toContain("h-6")
  })

  it("renders general section rows and table footer layout variants", () => {
    const section = GeneralSectionSkeleton({ rowCount: 2 })
    const rowDivs = collectElements(section, "div").filter(
      (el) => el.props.className === "grid grid-cols-2 items-center px-6 py-4"
    )
    expect(rowDivs).toHaveLength(2)

    const footerFill = TableFooterSkeleton({ layout: "fill" })
    expect(footerFill.props.className).toContain("border-t")

    const footerFit = TableFooterSkeleton({ layout: "fit" })
    expect(footerFit.props.className).not.toContain("border-t")

    const noRows = GeneralSectionSkeleton({})
    const emptyRows = collectElements(noRows, "div").filter(
      (el) => el.props.className === "grid grid-cols-2 items-center px-6 py-4"
    )
    expect(emptyRows).toHaveLength(0)
  })

  it("renders table skeleton branches for toolbar and pagination", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {})

    const withToolbar = TableSkeleton({
      rowCount: 2,
      search: true,
      filters: true,
      orderBy: true,
      pagination: true,
      layout: "fill",
    })

    expect(withToolbar.props.className).toContain("flex h-full flex-col overflow-hidden")
    const skeletonRows = collectElements(withToolbar, Skeleton)
    expect(skeletonRows.length).toBeGreaterThanOrEqual(3)
    expect(collectElements(withToolbar, TableFooterSkeleton)).toHaveLength(1)

    const withoutToolbar = TableSkeleton({
      rowCount: 1,
      search: false,
      filters: false,
      orderBy: false,
      pagination: false,
      layout: "fit",
    })
    expect(collectElements(withoutToolbar, TableFooterSkeleton)).toHaveLength(0)

    consoleSpy.mockRestore()
  })

  it("renders table section/json section and page layouts", () => {
    const tableSection = TableSectionSkeleton({
      rowCount: 1,
      pagination: true,
      layout: "fit",
    })
    expect(collectElements(tableSection, TableSkeleton)).toHaveLength(1)

    const jsonSection = JsonViewSectionSkeleton()
    expect(collectElements(jsonSection, IconButtonSkeleton)).toHaveLength(1)

    const single = SingleColumnPageSkeleton({
      sections: 2,
      showJSON: true,
      showMetadata: true,
    })
    const singleSkeletons = collectElements(single, Skeleton)
    expect(singleSkeletons).toHaveLength(4)

    const twoColumn = TwoColumnPageSkeleton({
      mainSections: 2,
      sidebarSections: 2,
      showJSON: true,
      showMetadata: true,
    })
    const twoColumnSkeletons = collectElements(twoColumn, Skeleton)
    expect(twoColumnSkeletons.length).toBeGreaterThanOrEqual(6)

    const twoColumnWithoutExtra = TwoColumnPageSkeleton({
      mainSections: 1,
      sidebarSections: 1,
      showJSON: false,
      showMetadata: false,
    })
    const noExtraSkeletons = collectElements(twoColumnWithoutExtra, Skeleton)
    expect(noExtraSkeletons.length).toBeGreaterThanOrEqual(2)
  })

  it("covers default-prop branches and additional text-size switches", () => {
    const headingDefault = HeadingSkeleton({})
    expect(headingDefault.props.style.width).toBe("110px")
    expect(headingDefault.props.className).toContain("h-7")

    const textDefault = TextSkeleton({})
    expect(textDefault.props.style.width).toBe("90px")
    expect(textDefault.props.className).toContain("!h-5")

    const textLarge = TextSkeleton({ size: "large", leading: "normal", characters: 1 })
    expect(textLarge.props.style.width).toBe("11px")

    const textBase = TextSkeleton({ size: "base", leading: "normal", characters: 1 })
    expect(textBase.props.style.width).toBe("10px")

    const textSmall = TextSkeleton({ size: "small", leading: "normal", characters: 1 })
    expect(textSmall.props.style.width).toBe("9px")

    const tableDefaults = TableSkeleton({})
    expect(collectElements(tableDefaults, TableFooterSkeleton)).toHaveLength(1)

    const singleDefaults = SingleColumnPageSkeleton({})
    expect(collectElements(singleDefaults, Skeleton).length).toBeGreaterThanOrEqual(2)

    const twoColumnDefaults = TwoColumnPageSkeleton({})
    expect(collectElements(twoColumnDefaults, Skeleton).length).toBeGreaterThanOrEqual(3)
  })
})
