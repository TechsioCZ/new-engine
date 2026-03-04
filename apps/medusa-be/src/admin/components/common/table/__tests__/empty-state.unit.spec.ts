import React from "react"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}))

jest.mock("@medusajs/icons", () => ({
  ExclamationCircle: (props: any) => require("react").createElement("exclamation-icon", props),
  MagnifyingGlass: () => require("react").createElement("magnify-icon"),
  PlusMini: () => require("react").createElement("plus-mini"),
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

        return []
      })
      .join(" ")

  const Button = ({ children, ...props }: any) =>
    React.createElement("button", props, children)
  const Text = ({ children, ...props }: any) =>
    React.createElement("text", props, children)

  return { Button, Text, clx }
})

jest.mock("react-router-dom", () => ({
  Link: ({ children, ...props }: any) => require("react").createElement("link", props, children),
}))

import { Button, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { NoRecords, NoResults } from "../empty-state"

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

describe("empty state components", () => {
  it("renders NoResults with translated defaults and custom overrides", () => {
    const defaults = renderDeep(NoResults({}))
    const texts = collectElements(defaults, "text")
    expect(texts[0].props.children).toBe("translated:general.noResultsTitle")
    expect(texts[1].props.children).toBe("translated:general.noResultsMessage")

    const custom = renderDeep(
      NoResults({ title: "No hits", message: "Try another filter" })
    )
    const customTexts = collectElements(custom, "text")
    expect(customTexts[0].props.children).toBe("No hits")
    expect(customTexts[1].props.children).toBe("Try another filter")
  })

  it("renders NoRecords button variants and optional action links", () => {
    const withDefault = renderDeep(
      NoRecords({
        action: { to: "/companies/new", label: "Create company" },
        buttonVariant: "default",
      })
    )

    const links = collectElements(withDefault, "link")
    expect(links).toHaveLength(1)
    expect(links[0].props.to).toBe("/companies/new")

    const defaultButtons = collectElements(withDefault, "button")
    expect(defaultButtons).toHaveLength(1)

    const withTransparent = renderDeep(
      NoRecords({
        action: { to: "/companies/new", label: "Create company" },
        buttonVariant: "transparentIconLeft",
      })
    )
    const transparentButtons = collectElements(withTransparent, "button")
    expect(
      transparentButtons.some((button) => button.props.variant === "transparent")
    ).toBe(true)
  })
})
