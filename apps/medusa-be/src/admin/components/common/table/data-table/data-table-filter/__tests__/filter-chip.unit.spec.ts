import React from "react"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}))

jest.mock("@medusajs/icons", () => ({
  XMarkMini: () => require("react").createElement("x-icon"),
}))

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
  const Text = ({ children, ...props }: any) =>
    React.createElement("text", props, children)

  return { clx, Text }
})

jest.mock("@radix-ui/react-popover", () => ({
  Anchor: (props: any) => require("react").createElement("popover-anchor", props),
  Trigger: ({ children, ...props }: any) =>
    require("react").createElement("popover-trigger", props, children),
}))

import * as Popover from "@radix-ui/react-popover"
import { Text } from "@medusajs/ui"
import FilterChip from "../filter-chip"

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

describe("FilterChip", () => {
  it("renders anchor and label when no previous value exists", () => {
    const tree = FilterChip({
      label: "Status",
      onRemove: jest.fn(),
    })

    expect(collectElements(tree, Popover.Anchor)).toHaveLength(1)
    expect(collectElements(tree, Popover.Trigger)).toHaveLength(0)
  })

  it("renders value/operator text and invokes onRemove with stopPropagation", () => {
    const onRemove = jest.fn()
    const tree = FilterChip({
      label: "Status",
      value: "Open",
      hasOperator: true,
      onRemove,
    })

    expect(collectElements(tree, Popover.Trigger)).toHaveLength(1)

    const texts = collectElements(tree, Text)
    expect(texts.some((text) => text.props.children === "Status")).toBe(true)
    expect(texts.some((text) => text.props.children === "translated:general.is")).toBe(
      true
    )
    expect(texts.some((text) => text.props.children === "Open")).toBe(true)

    const removeButton = collectElements(tree, "button")[0]
    const stopPropagation = jest.fn()
    removeButton.props.onClick({ stopPropagation })
    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("hides remove button for readonly chips", () => {
    const tree = FilterChip({
      label: "Status",
      value: "Open",
      readonly: true,
      onRemove: jest.fn(),
    })

    expect(collectElements(tree, "button")).toHaveLength(0)
  })
})
