import React from "react"

jest.mock("@medusajs/icons", () => ({
  Trash: () => require("react").createElement("trash-icon"),
}))

jest.mock("@medusajs/ui", () => {
  const React = require("react")

  const Button = ({ children, ...props }: any) =>
    React.createElement("button", props, children)

  const Prompt = ({ children, ...props }: any) =>
    React.createElement("prompt", props, children)
  Prompt.Content = ({ children, ...props }: any) =>
    React.createElement("prompt-content", props, children)
  Prompt.Title = ({ children, ...props }: any) =>
    React.createElement("prompt-title", props, children)
  Prompt.Description = ({ children, ...props }: any) =>
    React.createElement("prompt-description", props, children)
  Prompt.Footer = ({ children, ...props }: any) =>
    React.createElement("prompt-footer", props, children)

  return { Button, Prompt }
})

import { Button, Prompt } from "@medusajs/ui"
import { DeletePrompt } from "../delete-prompt"

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

describe("DeletePrompt", () => {
  it("wires open state and closes prompt after confirm delete", async () => {
    const handleDelete = jest.fn()
    const setOpen = jest.fn()

    const tree = DeletePrompt({
      handleDelete,
      loading: true,
      open: true,
      setOpen,
    })

    const prompt = collectElements(tree, Prompt)[0]
    expect(prompt.props.open).toBe(true)
    expect(prompt.props.onOpenChange).toBe(setOpen)

    const buttons = collectElements(tree, Button)
    expect(buttons).toHaveLength(2)
    expect(buttons[0].props.isLoading).toBe(true)

    await buttons[0].props.onClick()
    expect(handleDelete).toHaveBeenCalledTimes(1)
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it("closes prompt on cancel", () => {
    const setOpen = jest.fn()
    const tree = DeletePrompt({
      handleDelete: jest.fn(),
      loading: false,
      open: true,
      setOpen,
    })

    const buttons = collectElements(tree, Button)
    buttons[1].props.onClick()
    expect(setOpen).toHaveBeenCalledWith(false)
  })
})
