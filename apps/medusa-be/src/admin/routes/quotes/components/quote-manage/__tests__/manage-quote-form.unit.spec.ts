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

const loadManageQuoteForm = ({
  preview,
  confirmQuoteImpl,
}: {
  preview: any
  confirmQuoteImpl: () => Promise<unknown>
}) => {
  const handleSuccess = jest.fn()
  const confirmQuote = jest.fn(confirmQuoteImpl)
  const toastSuccess = jest.fn()
  const toastError = jest.fn()
  const defaultValues = jest.fn().mockResolvedValue({})

  let ManageQuoteForm: (props: any) => any

  jest.isolateModules(() => {
    jest.doMock("react-i18next", () => ({
      useTranslation: () => ({
        t: (key: string) => key,
      }),
    }))

    jest.doMock("react-hook-form", () => ({
      useForm: (options: any) => {
        options?.defaultValues?.()
        defaultValues()
        return {
          handleSubmit: (handler: (data: unknown) => Promise<void>) =>
            async () => await handler({}),
        }
      },
    }))

    jest.doMock("../../../../../components/common/modals/route-focus-modal", () => {
      const React = jest.requireActual("react")

      const RouteFocusModal = {
        Form: ({ children, ...props }: any) =>
          React.createElement("route-modal-form", props, children),
        Header: ({ children, ...props }: any) =>
          React.createElement("route-modal-header", props, children),
        Body: ({ children, ...props }: any) =>
          React.createElement("route-modal-body", props, children),
        Footer: ({ children, ...props }: any) =>
          React.createElement("route-modal-footer", props, children),
      }

      return {
        RouteFocusModal,
        useRouteModal: () => ({
          handleSuccess,
        }),
      }
    })

    jest.doMock("../../../../../hooks/api", () => ({
      useOrderPreview: () => ({
        order: preview,
      }),
      useConfirmQuote: () => ({
        mutateAsync: confirmQuote,
        isPending: false,
      }),
    }))

    jest.doMock("../../../../../utils", () => ({
      formatAmount: (value: number, currency: string) => `${value}-${currency}`,
    }))

    jest.doMock("../manage-items-section", () => {
      const React = jest.requireActual("react")
      return {
        ManageItemsSection: (props: any) =>
          React.createElement("manage-items-section", props),
      }
    })

    jest.doMock("@medusajs/ui", () => {
      const React = jest.requireActual("react")
      return {
        Button: ({ children, ...props }: any) =>
          React.createElement("button-component", props, children),
        Heading: ({ children, ...props }: any) =>
          React.createElement("heading-component", props, children),
        toast: {
          success: toastSuccess,
          error: toastError,
        },
      }
    })

    ManageQuoteForm = require("../manage-quote-form").ManageQuoteForm
  })

  return {
    ManageQuoteForm: ManageQuoteForm!,
    confirmQuote,
    handleSuccess,
    toastSuccess,
    toastError,
    defaultValues,
  }
}

describe("ManageQuoteForm", () => {
  const order = {
    id: "order_1",
    total: 1000,
    currency_code: "usd",
  }

  it("returns empty output when preview is unavailable", () => {
    const { ManageQuoteForm } = loadManageQuoteForm({
      preview: null,
      confirmQuoteImpl: async () => ({}),
    })

    const tree = ManageQuoteForm({ order })
    expect(tree).toBeTruthy()
    expect(tree.props.children).toBeUndefined()
  })

  it("submits confirmation and handles success", async () => {
    const {
      ManageQuoteForm,
      confirmQuote,
      handleSuccess,
      toastSuccess,
      toastError,
      defaultValues,
    } =
      loadManageQuoteForm({
        preview: {
          total: 1200,
        },
        confirmQuoteImpl: async () => ({}),
      })

    const tree = ManageQuoteForm({ order })
    const form = collectElements(tree, (element) => element.type === "form")[0]

    await form.props.onSubmit()

    expect(confirmQuote).toHaveBeenCalledWith({})
    expect(defaultValues).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith("Successfully updated quote")
    expect(handleSuccess).toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows error toast when confirmation fails", async () => {
    const { ManageQuoteForm, confirmQuote, toastSuccess, toastError } =
      loadManageQuoteForm({
        preview: {
          total: 1200,
        },
        confirmQuoteImpl: async () => {
          throw new Error("request failed")
        },
      })

    const tree = ManageQuoteForm({ order })
    const form = collectElements(tree, (element) => element.type === "form")[0]

    await form.props.onSubmit()

    expect(confirmQuote).toHaveBeenCalledWith({})
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("general.error", {
      description: "request failed",
    })
  })
})
