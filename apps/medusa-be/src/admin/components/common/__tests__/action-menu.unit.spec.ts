import React from "react"

jest.mock("@medusajs/icons", () => ({
  EllipsisHorizontal: () => require("react").createElement("ellipsis-icon"),
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

  const DropdownMenu = ({ children }: any) =>
    React.createElement("dropdown-menu", undefined, children)
  DropdownMenu.Trigger = ({ children }: any) =>
    React.createElement("dropdown-trigger", undefined, children)
  DropdownMenu.Content = ({ children }: any) =>
    React.createElement("dropdown-content", undefined, children)
  DropdownMenu.Group = ({ children }: any) =>
    React.createElement("dropdown-group", undefined, children)
  DropdownMenu.Item = ({ children, ...props }: any) =>
    React.createElement("dropdown-item", props, children)
  DropdownMenu.Separator = () => React.createElement("dropdown-separator")

  const IconButton = ({ children }: any) =>
    React.createElement("icon-button", undefined, children)

  return { clx, DropdownMenu, IconButton }
})

jest.mock("react-router-dom", () => ({
  Link: ({ children, ...props }: any) =>
    require("react").createElement("link", props, children),
}))

import { DropdownMenu } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { ActionMenu } from "../action-menu"

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

describe("ActionMenu", () => {
  it("renders only non-empty action groups and inserts separators between groups", () => {
    const onClick = jest.fn()
    const tree = ActionMenu({
      groups: [
        { actions: [] },
        {
          actions: [
            {
              label: "Approve",
              icon: React.createElement("icon-a"),
              onClick,
            },
          ],
        },
        {
          actions: [
            {
              label: "Open",
              icon: React.createElement("icon-b"),
              to: "/orders/1",
            },
          ],
        },
      ],
    } as any)

    const groups = collectElements(tree, DropdownMenu.Group)
    expect(groups).toHaveLength(2)

    const separators = collectElements(tree, DropdownMenu.Separator)
    expect(separators).toHaveLength(1)
  })

  it("calls item onClick handlers with propagation stop", () => {
    const onClick = jest.fn()
    const tree = ActionMenu({
      groups: [
        {
          actions: [
            {
              label: "Approve",
              icon: React.createElement("icon-a"),
              onClick,
            },
          ],
        },
      ],
    } as any)

    const items = collectElements(tree, DropdownMenu.Item)
    expect(items).toHaveLength(1)

    const stopPropagation = jest.fn()
    items[0].props.onClick({ stopPropagation })

    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders link actions and stops propagation on link click", () => {
    const tree = ActionMenu({
      groups: [
        {
          actions: [
            {
              label: "Open",
              icon: React.createElement("icon-b"),
              to: "/orders/1",
            },
          ],
        },
      ],
    } as any)

    const links = collectElements(tree, Link)
    expect(links).toHaveLength(1)
    expect(links[0].props.to).toBe("/orders/1")

    const stopPropagation = jest.fn()
    links[0].props.onClick({ stopPropagation })
    expect(stopPropagation).toHaveBeenCalledTimes(1)
  })
})
