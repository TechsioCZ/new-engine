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

const loadQuoteMessages = ({
  createMessageImpl,
  itemFieldValue = null,
}: {
  createMessageImpl: (data: any, options: any) => Promise<unknown>
  itemFieldValue?: string | null
}) => {
  const reset = jest.fn()
  const createMessage = jest.fn(createMessageImpl)
  const toastSuccess = jest.fn()
  const toastError = jest.fn()

  let QuoteMessages: (props: any) => any

  jest.isolateModules(() => {
    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useMemo: (factory: () => unknown) => factory(),
    }))

    jest.doMock("react-router-dom", () => ({
      useParams: () => ({
        quoteId: "quote_1",
      }),
    }))

    jest.doMock("@hookform/resolvers/zod", () => ({
      zodResolver: () => jest.fn(),
    }))

    jest.doMock("react-hook-form", () => ({
      useForm: (config: any) => {
        config?.defaultValues?.()
        return {
          control: {},
          reset,
          handleSubmit: (handler: (data: any) => Promise<void>) =>
            async () =>
              await handler({
                text: "Hello customer",
                item_id: "item_1",
              }),
        }
      },
    }))

    jest.doMock("../../../../components/common/form", () => {
      const React = jest.requireActual("react")

      const Form = ({ children, ...props }: any) =>
        React.createElement("form-provider", props, children)

      Form.Field = ({ render, name, ...props }: any) =>
        React.createElement(
          "form-field",
          props,
              render?.({
                field: {
                  onChange: jest.fn(),
                  ref: null,
                  value: name === "item_id" ? itemFieldValue : "",
                },
              })
        )

      Form.Item = ({ children, ...props }: any) =>
        React.createElement("form-item", props, children)
      Form.Label = ({ children, ...props }: any) =>
        React.createElement("form-label", props, children)
      Form.Hint = ({ children, ...props }: any) =>
        React.createElement("form-hint", props, children)
      Form.Control = ({ children, ...props }: any) =>
        React.createElement("form-control", props, children)
      Form.ErrorMessage = ({ children, ...props }: any) =>
        React.createElement("form-error", props, children)

      return { Form }
    })

    jest.doMock("../../../../hooks/api/quotes", () => ({
      useCreateQuoteMessage: () => ({
        mutateAsync: createMessage,
        isPending: false,
      }),
    }))

    jest.doMock("../quote-details", () => {
      const React = jest.requireActual("react")
      return {
        QuoteItem: (props: any) => React.createElement("quote-item", props),
      }
    })

    jest.doMock("@medusajs/ui", () => {
      const React = jest.requireActual("react")

      const Select = ({ children, ...props }: any) =>
        React.createElement("select-component", props, children)
      Select.Trigger = ({ children, ...props }: any) =>
        React.createElement("select-trigger", props, children)
      Select.Value = ({ children, ...props }: any) =>
        React.createElement("select-value", props, children)
      Select.Content = ({ children, ...props }: any) =>
        React.createElement("select-content", props, children)
      Select.Item = ({ children, ...props }: any) =>
        React.createElement("select-item", props, children)

      return {
        Button: ({ children, ...props }: any) =>
          React.createElement("button-component", props, children),
        Container: ({ children, ...props }: any) =>
          React.createElement("container-component", props, children),
        Heading: ({ children, ...props }: any) =>
          React.createElement("heading-component", props, children),
        Select,
        Textarea: ({ children, ...props }: any) =>
          React.createElement("textarea-component", props, children),
        clx: (...parts: any[]) =>
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
            .join(" "),
        toast: {
          success: toastSuccess,
          error: toastError,
        },
      }
    })

    QuoteMessages = require("../quote-messages").QuoteMessages
  })

  return {
    QuoteMessages: QuoteMessages!,
    createMessage,
    reset,
    toastSuccess,
    toastError,
  }
}

describe("QuoteMessages", () => {
  const quote = {
    draft_order: {
      currency_code: "usd",
      items: [
        {
          id: "item_1",
          variant_sku: "SKU-1",
          title: "Original",
        },
      ],
    },
    messages: [
      {
        id: "msg_1",
        text: "Please check this item",
        item_id: "item_1",
        admin_id: "admin_1",
        admin: {
          first_name: "Alice",
          last_name: "Admin",
        },
      },
      {
        id: "msg_2",
        text: "Customer reply",
        customer: {
          first_name: "Bob",
          last_name: "Buyer",
        },
      },
    ],
  }

  const preview = {
    items: [
      {
        id: "item_1",
        variant_sku: "SKU-1",
        title: "Preview",
      },
    ],
  }

  it("submits message, resets form, and reports success", async () => {
    const { QuoteMessages, createMessage, reset, toastSuccess, toastError } =
      loadQuoteMessages({
        createMessageImpl: async (_data, options) => {
          await options?.onSuccess?.()
        },
      })

    const tree = QuoteMessages({ quote, preview })
    const form = collectElements(tree, (element) => element.type === "form")[0]

    await form.props.onSubmit()

    expect(createMessage).toHaveBeenCalledWith(
      {
        text: "Hello customer",
        item_id: "item_1",
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
    expect(reset).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(
      "Successfully sent message to customer"
    )
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows error toast when submit fails", async () => {
    const { QuoteMessages, createMessage, reset, toastSuccess, toastError } =
      loadQuoteMessages({
        createMessageImpl: async (_data, options) => {
          await options?.onError?.(new Error("message failed"))
        },
      })

    const tree = QuoteMessages({ quote, preview })
    const form = collectElements(tree, (element) => element.type === "form")[0]

    await form.props.onSubmit()

    expect(createMessage).toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("message failed")
  })

  it("can invoke the direct create-message helper path", async () => {
    const { QuoteMessages, createMessage, toastSuccess } = loadQuoteMessages({
      createMessageImpl: async (_data, options) => {
        await options?.onSuccess?.()
      },
    })

    const tree = QuoteMessages({ quote, preview })
    const sendButton = collectElements(
      tree,
      (element) =>
        element.props?.type === "submit" &&
        typeof element.props?.onClick === "function"
    )[0]

    const callback = sendButton.props.onClick()
    await callback()

    expect(createMessage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
    expect(toastSuccess).toHaveBeenCalledWith(
      "Successfully sent message to customer"
    )
  })

  it("shows error for direct create-message helper failures", async () => {
    const { QuoteMessages, createMessage, toastError } = loadQuoteMessages({
      createMessageImpl: async (_data, options) => {
        await options?.onError?.(new Error("direct path failed"))
      },
    })

    const tree = QuoteMessages({ quote, preview })
    const sendButton = collectElements(
      tree,
      (element) =>
        element.props?.type === "submit" &&
        typeof element.props?.onClick === "function"
    )[0]

    const callback = sendButton.props.onClick()
    await callback()

    expect(createMessage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
    expect(toastError).toHaveBeenCalledWith("direct path failed")
  })

  it("renders form fields through Form.Field and covers nullable select value branches", () => {
    const { QuoteMessages } = loadQuoteMessages({
      createMessageImpl: async () => undefined,
      itemFieldValue: "item_1",
    })

    const tree = QuoteMessages({ quote, preview })
    const renderedTree = renderElements(tree)

    const select = collectElements(
      renderedTree,
      (element) => element.type === "select-component"
    )[0]
    expect(select.props.value).toBe("item_1")

    const selectItems = collectElements(
      renderedTree,
      (element) => element.type === "select-item"
    )
    expect(selectItems).toHaveLength(1)
  })
})
