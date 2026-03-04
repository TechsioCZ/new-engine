import React from "react"

const collectElements = (node: any, predicate: (value: any) => boolean): any[] => {
  const found: any[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    if (predicate(value)) {
      found.push(value)
    }

    walk(value.props?.children)
  }

  walk(node)
  return found
}

const renderElements = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(renderElements)
  }

  if (!React.isValidElement(value)) {
    return value
  }

  if (typeof value.type === "function") {
    return renderElements(value.type(value.props))
  }

  return React.cloneElement(value, {
    ...value.props,
    children: renderElements(value.props?.children),
  })
}

const loadJsonViewSection = ({
  copiedState = false,
  copiedValue = { id: "quote_1" },
}: {
  copiedState?: boolean
  copiedValue?: unknown
}) => {
  const setCopied = jest.fn()
  const writeText = jest.fn()

  let JsonViewSection: (props: any) => any

  jest.isolateModules(() => {
    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useState: () => [copiedState, setCopied],
    }))

    jest.doMock("@medusajs/icons", () => ({
      ArrowUpRightOnBox: () => null,
      Check: () => null,
      SquareTwoStack: () => null,
      TriangleDownMini: () => null,
      XMarkMini: () => null,
    }))

    jest.doMock("@medusajs/ui", () => {
      const React = require("react")
      const Drawer = ({ children, ...props }: any) =>
        React.createElement("drawer-component", props, children)
      Drawer.Trigger = ({ children, ...props }: any) =>
        React.createElement("drawer-trigger", props, children)
      Drawer.Content = ({ children, ...props }: any) =>
        React.createElement("drawer-content", props, children)
      Drawer.Title = ({ children, ...props }: any) =>
        React.createElement("drawer-title", props, children)
      Drawer.Description = ({ children, ...props }: any) =>
        React.createElement("drawer-description", props, children)
      Drawer.Close = ({ children, ...props }: any) =>
        React.createElement("drawer-close", props, children)
      Drawer.Body = ({ children, ...props }: any) =>
        React.createElement("drawer-body", props, children)

      return {
        Badge: ({ children, ...props }: any) =>
          React.createElement("badge-component", props, children),
        Container: ({ children, ...props }: any) =>
          React.createElement("container-component", props, children),
        Drawer,
        Heading: ({ children, ...props }: any) =>
          React.createElement("heading-component", props, children),
        IconButton: ({ children, ...props }: any) =>
          React.createElement("icon-button", props, children),
        Kbd: ({ children, ...props }: any) =>
          React.createElement("kbd-component", props, children),
      }
    })

    jest.doMock("@uiw/react-json-view", () => {
      const React = require("react")
      const Primitive = ({ children, ...props }: any) =>
        React.createElement("json-primitive", props, children)
      Primitive.Quote = ({ render }: any) => render()
      Primitive.Null = ({ render }: any) => render()
      Primitive.Undefined = ({ render }: any) => render()
      Primitive.CountInfo = ({ render }: any) =>
        render({}, { value: { first: 1, second: 2 } })
      Primitive.Arrow = ({ children }: any) =>
        React.createElement("primitive-arrow", null, children)
      Primitive.Colon = ({ children }: any) =>
        React.createElement("primitive-colon", null, children)
      Primitive.Copied = ({ render }: any) => {
        const rendered = render({ style: { color: "red" } }, { value: copiedValue })

        if (React.isValidElement(rendered) && typeof rendered.type === "function") {
          return rendered.type(rendered.props)
        }

        return rendered
      }

      return Primitive
    })

    JsonViewSection = require("../json-view-section").JsonViewSection
  })

  ;(global as any).navigator = {
    clipboard: {
      writeText,
    },
  }

  return {
    JsonViewSection: JsonViewSection!,
    setCopied,
    writeText,
  }
}

describe("JsonViewSection", () => {
  it("shows key count and copies object JSON to clipboard", () => {
    jest.useFakeTimers()

    const { JsonViewSection, setCopied, writeText } = loadJsonViewSection({
      copiedState: false,
      copiedValue: { id: "quote_1" },
    })

    const tree = renderElements(
      JsonViewSection({
        data: { id: "quote_1", status: "draft" },
      })
    )

    const badge = collectElements(tree, (element) => element.type === "badge-component")[0]
    expect(String(badge.props.children)).toContain("2")

    const copyTrigger = collectElements(
      tree,
      (element) => element.type === "span" && typeof element.props?.onClick === "function"
    )[0]

    const stopPropagation = jest.fn()
    copyTrigger.props.onClick({ stopPropagation })

    expect(stopPropagation).toHaveBeenCalled()
    expect(setCopied).toHaveBeenCalledWith(true)
    expect(writeText).toHaveBeenCalledWith('{\n  "id": "quote_1"\n}')

    jest.advanceTimersByTime(2000)
    expect(setCopied).toHaveBeenCalledWith(false)

    jest.useRealTimers()
  })

  it("copies raw string values and renders copied state without click handler", () => {
    const stringLoad = loadJsonViewSection({
      copiedState: false,
      copiedValue: "plain-value",
    })

    const stringTree = renderElements(
      stringLoad.JsonViewSection({
        data: { id: "quote_2" },
      })
    )

    const clickable = collectElements(
      stringTree,
      (element) => element.type === "span" && typeof element.props?.onClick === "function"
    )[0]
    clickable.props.onClick({ stopPropagation: jest.fn() })
    expect(stringLoad.writeText).toHaveBeenCalledWith("plain-value")

    const copiedTree = renderElements(
      loadJsonViewSection({
        copiedState: true,
        copiedValue: "already-copied",
      }).JsonViewSection({
        data: { id: "quote_3" },
      })
    )

    const clickableSpans = collectElements(
      copiedTree,
      (element) => element.type === "span" && typeof element.props?.onClick === "function"
    )
    expect(clickableSpans.length).toBe(0)
  })
})
