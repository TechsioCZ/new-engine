import React from "react"

var mockUseBlocker: jest.Mock
let blockerCallback: any

const blocker = {
  state: "idle",
  reset: jest.fn(),
  proceed: jest.fn(),
}

jest.mock("react-router-dom", () => ({
  useBlocker: (...args: unknown[]) => mockUseBlocker(...args),
}))

jest.mock("@medusajs/ui", () => {
  const React = require("react")

  const Prompt = ({ children, ...props }: any) =>
    React.createElement("prompt", props, children)
  Prompt.Content = ({ children, ...props }: any) =>
    React.createElement("prompt-content", props, children)
  Prompt.Header = ({ children, ...props }: any) =>
    React.createElement("prompt-header", props, children)
  Prompt.Title = ({ children, ...props }: any) =>
    React.createElement("prompt-title", props, children)
  Prompt.Description = ({ children, ...props }: any) =>
    React.createElement("prompt-description", props, children)
  Prompt.Footer = ({ children, ...props }: any) =>
    React.createElement("prompt-footer", props, children)
  Prompt.Cancel = ({ children, ...props }: any) =>
    React.createElement("prompt-cancel", props, children)
  Prompt.Action = ({ children, ...props }: any) =>
    React.createElement("prompt-action", props, children)

  return { Prompt }
})

import { Prompt } from "@medusajs/ui"
import { RouteModalForm } from "../route-modal-form"

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

describe("RouteModalForm", () => {
  beforeEach(() => {
    blocker.state = "idle"
    blocker.reset.mockReset()
    blocker.proceed.mockReset()

    mockUseBlocker = jest.fn((cb) => {
      blockerCallback = cb
      return blocker
    })
  })

  it("blocks navigation for dirty path changes and allows successful submit transitions", () => {
    const onClose = jest.fn()

    RouteModalForm({
      form: { formState: { isDirty: true } } as any,
      onClose,
      children: "child",
    })

    const blockDirtyPathChange = blockerCallback({
      currentLocation: { pathname: "/a", search: "?q=1" },
      nextLocation: { pathname: "/b", search: "?q=1", state: {} },
    })
    expect(blockDirtyPathChange).toBe(true)

    const allowSubmitSuccess = blockerCallback({
      currentLocation: { pathname: "/a", search: "?q=1" },
      nextLocation: {
        pathname: "/a",
        search: "?q=1",
        state: { isSubmitSuccessful: true },
      },
    })
    expect(allowSubmitSuccess).toBe(false)
    expect(onClose).toHaveBeenCalledWith(true)
  })

  it("respects blockSearch for dirty search changes", () => {
    const onClose = jest.fn()

    RouteModalForm({
      form: { formState: { isDirty: true } } as any,
      blockSearch: true,
      onClose,
      children: "child",
    })

    const shouldBlock = blockerCallback({
      currentLocation: { pathname: "/a", search: "?q=1" },
      nextLocation: { pathname: "/a", search: "?q=2", state: {} },
    })
    expect(shouldBlock).toBe(true)

    const shouldNotBlock = blockerCallback({
      currentLocation: { pathname: "/a", search: "?q=1" },
      nextLocation: { pathname: "/a", search: "?q=1", state: {} },
    })
    expect(shouldNotBlock).toBe(false)
    expect(onClose).toHaveBeenCalledWith(undefined)
  })

  it("wires prompt actions to blocker reset/proceed and onClose", () => {
    blocker.state = "blocked"
    const onClose = jest.fn()

    const tree = RouteModalForm({
      form: { formState: { isDirty: true } } as any,
      onClose,
      children: "child",
    })

    const prompt = collectElements(tree, Prompt)[0]
    expect(prompt.props.open).toBe(true)

    const cancel = collectElements(tree, Prompt.Cancel)[0]
    cancel.props.onClick()
    expect(blocker.reset).toHaveBeenCalledTimes(1)

    const action = collectElements(tree, Prompt.Action)[0]
    action.props.onClick()
    expect(blocker.proceed).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledWith(false)
  })
})
