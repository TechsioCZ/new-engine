import React from "react"

jest.mock("@medusajs/icons", () => ({
  InformationCircleSolid: (props: any) =>
    require("react").createElement("info-icon", props),
}))

jest.mock("@medusajs/ui", () => {
  const React = require("react")

  const Container = ({ children, ...props }: any) =>
    React.createElement("container", props, children)
  const Label = ({ children, ...props }: any) =>
    React.createElement("label", props, children)
  const Switch = (props: any) => React.createElement("switch", props)
  const Text = ({ children, ...props }: any) =>
    React.createElement("text", props, children)
  const Tooltip = ({ children, ...props }: any) =>
    React.createElement("tooltip", props, children)

  return { Container, Label, Switch, Text, Tooltip }
})

import { Switch, Tooltip } from "@medusajs/ui"
import { CoolSwitch } from "../cool-switch"

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

describe("CoolSwitch", () => {
  it("renders switch label and description", () => {
    const onChange = jest.fn()
    const tree = CoolSwitch({
      checked: true,
      onChange,
      fieldName: "requires_admin_approval",
      label: "Requires approval",
      description: "Approvals are required",
    })

    const switches = collectElements(tree, Switch)
    expect(switches).toHaveLength(1)
    expect(switches[0].props.checked).toBe(true)
    expect(switches[0].props.name).toBe("requires_admin_approval")

    switches[0].props.onCheckedChange(false)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it("renders tooltip only when tooltip text is provided", () => {
    const withTooltip = CoolSwitch({
      checked: false,
      onChange: jest.fn(),
      fieldName: "field",
      label: "Label",
      description: "Description",
      tooltip: "Info",
    })

    const withoutTooltip = CoolSwitch({
      checked: false,
      onChange: jest.fn(),
      fieldName: "field",
      label: "Label",
      description: "Description",
    })

    expect(collectElements(withTooltip, Tooltip)).toHaveLength(1)
    expect(collectElements(withoutTooltip, Tooltip)).toHaveLength(0)
  })
})
