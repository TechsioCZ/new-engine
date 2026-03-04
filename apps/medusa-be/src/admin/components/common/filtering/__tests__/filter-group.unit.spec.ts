import React from "react"

var mockUseSearchParams: jest.Mock

jest.mock("react-router-dom", () => ({
  useSearchParams: (...args: unknown[]) => mockUseSearchParams(...args),
}))

jest.mock("@medusajs/ui", () => {
  const React = require("react")

  const Button = ({ children, ...props }: any) =>
    React.createElement("button", props, children)

  const DropdownMenu = ({ children }: any) =>
    React.createElement("dropdown-menu", undefined, children)
  DropdownMenu.Trigger = ({ children }: any) =>
    React.createElement("dropdown-trigger", undefined, children)
  DropdownMenu.Content = ({ children }: any) =>
    React.createElement("dropdown-content", undefined, children)
  DropdownMenu.Item = ({ children, ...props }: any) =>
    React.createElement("dropdown-item", props, children)

  return { Button, DropdownMenu }
})

import { Button, DropdownMenu } from "@medusajs/ui"
import { FilterGroup } from "../filter-group"

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

const renderDeep = (node: any): any => {
  if (Array.isArray(node)) {
    return node.map(renderDeep)
  }

  if (!React.isValidElement(node)) {
    return node
  }

  if (typeof node.type === "function") {
    return renderDeep(node.type(node.props))
  }

  return React.cloneElement(node, node.props, renderDeep(node.props?.children))
}

describe("FilterGroup", () => {
  beforeEach(() => {
    mockUseSearchParams = jest.fn()
  })

  it("returns null when no filters are provided", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()])
    expect(FilterGroup({ filters: {} })).toBeNull()
  })

  it("shows add filter action for available filter keys", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("city=Prague"),
      jest.fn(),
    ])

    const tree = renderDeep(
      FilterGroup({
        filters: {
          city: React.createElement("city-filter"),
          country: React.createElement("country-filter"),
        },
      })
    )

    const buttons = collectElements(tree, "button")
    expect(buttons).toHaveLength(2)

    const items = collectElements(tree, "dropdown-item")
    expect(items).toHaveLength(1)
    expect(items[0].props.children).toBe("country")
  })

  it("hides add-filter menu when all filters are already active", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("city=Prague&country=CZ"),
      jest.fn(),
    ])

    const tree = renderDeep(
      FilterGroup({
        filters: {
          city: React.createElement("city-filter"),
          country: React.createElement("country-filter"),
        },
      })
    )

    const buttons = collectElements(tree, "button")
    expect(buttons).toHaveLength(1)
  })
})
