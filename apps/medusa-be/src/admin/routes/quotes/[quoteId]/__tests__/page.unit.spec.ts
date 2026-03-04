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

const loadQuoteDetails = ({
  quote,
  isLoading,
  preview,
  isPreviewLoading,
  sendQuoteImpl,
  rejectQuoteImpl,
  promptResult,
  stateValues = [false, false],
  runEffect = false,
}: {
  quote: any
  isLoading: boolean
  preview: any
  isPreviewLoading: boolean
  sendQuoteImpl: jest.Mock
  rejectQuoteImpl: jest.Mock
  promptResult: boolean
  stateValues?: [boolean, boolean]
  runEffect?: boolean
}) => {
  const prompt = jest.fn().mockResolvedValue(promptResult)
  const navigate = jest.fn()
  const toastSuccess = jest.fn()
  const toastError = jest.fn()
  const setShowSendQuote = jest.fn()
  const setShowRejectQuote = jest.fn()

  let buttonType: any
  let QuoteDetails: () => any

  jest.isolateModules(() => {
    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useState: jest
        .fn()
        .mockImplementationOnce(() => [stateValues[0], setShowSendQuote])
        .mockImplementationOnce(() => [stateValues[1], setShowRejectQuote]),
      useEffect: (callback: () => unknown) => {
        if (runEffect) {
          callback()
        }
      },
    }))

    jest.doMock("react-i18next", () => ({
      useTranslation: () => ({
        t: (value: string) => value,
      }),
    }))

    jest.doMock("react-router-dom", () => {
      const React = require("react")
      return {
        Link: ({ children, ...props }: any) =>
          React.createElement("link-component", props, children),
        useNavigate: () => navigate,
        useParams: () => ({ quoteId: "quote_1" }),
      }
    })

    jest.doMock("@medusajs/icons", () => ({
      CheckCircleSolid: () => null,
    }))

    jest.doMock("@medusajs/ui", () => {
      const React = require("react")
      buttonType = ({ children, ...props }: any) =>
        React.createElement("button-component", props, children)
      return {
        Button: buttonType,
        Container: ({ children, ...props }: any) =>
          React.createElement("container-component", props, children),
        Heading: ({ children, ...props }: any) =>
          React.createElement("heading-component", props, children),
        Text: ({ children, ...props }: any) =>
          React.createElement("text-component", props, children),
        Toaster: ({ children, ...props }: any) =>
          React.createElement("toaster-component", props, children),
        toast: {
          success: toastSuccess,
          error: toastError,
        },
        usePrompt: () => prompt,
      }
    })

    jest.doMock("../../../../hooks/api", () => ({
      useOrderPreview: () => ({
        order: preview,
        isLoading: isPreviewLoading,
      }),
    }))

    jest.doMock("../../../../hooks/api/quotes", () => ({
      useQuote: () => ({
        quote,
        isLoading,
      }),
      useSendQuote: () => ({
        mutateAsync: sendQuoteImpl,
        isPending: false,
      }),
      useRejectQuote: () => ({
        mutateAsync: rejectQuoteImpl,
        isPending: false,
      }),
    }))

    jest.doMock("../../../../utils", () => ({
      formatAmount: (value: number, currency: string) => `${value}-${currency}`,
    }))

    jest.doMock("../../../../components/common/json-view-section", () => {
      const React = require("react")
      return {
        JsonViewSection: (props: any) => React.createElement("json-view", props),
      }
    })

    jest.doMock("../../components/quote-details", () => {
      const React = require("react")
      return {
        CostBreakdown: (props: any) =>
          React.createElement("cost-breakdown", props),
        QuoteDetailsHeader: (props: any) =>
          React.createElement("quote-details-header", props),
        QuoteItems: (props: any) => React.createElement("quote-items", props),
        QuoteTotal: (props: any) => React.createElement("quote-total", props),
      }
    })

    jest.doMock("../../components/quote-messages", () => {
      const React = require("react")
      return {
        QuoteMessages: (props: any) =>
          React.createElement("quote-messages", props),
      }
    })

    QuoteDetails = require("../page").default
  })

  return {
    QuoteDetails: QuoteDetails!,
    setShowSendQuote,
    setShowRejectQuote,
    buttonType,
    prompt,
    navigate,
    toastSuccess,
    toastError,
  }
}

describe("QuoteDetails page", () => {
  it("returns empty output while quote is loading", () => {
    const { QuoteDetails } = loadQuoteDetails({
      quote: null,
      isLoading: true,
      preview: null,
      isPreviewLoading: false,
      sendQuoteImpl: jest.fn(),
      rejectQuoteImpl: jest.fn(),
      promptResult: true,
    })

    const tree = QuoteDetails()
    expect(tree).toBeTruthy()
    expect(tree.props.children).toBeUndefined()
  })

  it("throws when preview is missing", () => {
    const quote = {
      draft_order_id: "order_1",
      status: "pending_customer",
      draft_order: { id: "order_1", customer: {} },
      customer: {},
    }

    const { QuoteDetails } = loadQuoteDetails({
      quote,
      isLoading: false,
      preview: null,
      isPreviewLoading: false,
      sendQuoteImpl: jest.fn(),
      rejectQuoteImpl: jest.fn(),
      promptResult: true,
    })

    expect(() => QuoteDetails()).toThrow("preview not found")
  })

  it("handles send/reject actions and accepted order navigation", async () => {
    const sendQuoteImpl = jest.fn(async (_data, options) => {
      await options?.onSuccess?.()
    })
    const rejectQuoteImpl = jest.fn(async (_data, options) => {
      await options?.onSuccess?.()
    })

    const quote = {
      draft_order_id: "order_1",
      status: "accepted",
      draft_order: {
        id: "order_1",
        customer: {
          id: "cust_1",
          email: "a@example.com",
          phone: "+420123",
          employee: {
            company: {
              id: "company_1",
              name: "Acme",
              currency_code: "usd",
            },
          },
        },
      },
      customer: {
        employee: {
          spending_limit: 500,
          company: {
            currency_code: "usd",
            id: "company_1",
            name: "Acme",
          },
        },
      },
    }

    const { QuoteDetails, buttonType, prompt, navigate, toastSuccess, toastError } =
      loadQuoteDetails({
        quote,
        isLoading: false,
        preview: {
          id: "preview_1",
          items: [],
        },
        isPreviewLoading: false,
        sendQuoteImpl,
        rejectQuoteImpl,
        promptResult: true,
        stateValues: [true, true],
      })

    const tree = QuoteDetails()

    const buttons = collectElements(
      tree,
      (element) =>
        element.type === buttonType &&
        typeof element.props?.onClick === "function"
    )

    const viewOrder = buttons.find((button) => button.props.children === "View Order")
    const reject = buttons.find((button) => button.props.children === "Reject Quote")
    const send = buttons.find((button) => button.props.children === "Send Quote")

    viewOrder.props.onClick()
    await reject.props.onClick()
    await send.props.onClick()

    expect(navigate).toHaveBeenCalledWith("/orders/order_1")
    expect(prompt).toHaveBeenCalledTimes(2)
    expect(rejectQuoteImpl).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(sendQuoteImpl).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(toastSuccess).toHaveBeenCalledWith(
      "Successfully rejected customer's quote"
    )
    expect(toastSuccess).toHaveBeenCalledWith(
      "Successfully sent quote to customer"
    )
    expect(toastError).not.toHaveBeenCalled()
  })

  it("runs status effect branches and updates visible action states", () => {
    const acceptedQuote = {
      draft_order_id: "order_1",
      status: "accepted",
      draft_order: { id: "order_1", customer: {} },
      customer: {},
    }

    const { QuoteDetails, setShowRejectQuote, setShowSendQuote } = loadQuoteDetails({
      quote: acceptedQuote,
      isLoading: false,
      preview: { id: "preview_1", items: [] },
      isPreviewLoading: false,
      sendQuoteImpl: jest.fn(),
      rejectQuoteImpl: jest.fn(),
      promptResult: true,
      runEffect: true,
    })

    QuoteDetails()

    expect(setShowSendQuote).toHaveBeenCalledWith(false)
    expect(setShowRejectQuote).toHaveBeenCalledWith(false)
  })

  it("does not mutate quote when confirmation prompt is cancelled", async () => {
    const sendQuoteImpl = jest.fn()
    const rejectQuoteImpl = jest.fn()

    const quote = {
      draft_order_id: "order_1",
      status: "pending_merchant",
      draft_order: {
        id: "order_1",
        customer: { id: "cust_1", email: "a@example.com", phone: "+420123" },
      },
      customer: {
        employee: {
          spending_limit: 500,
          company: { id: "company_1", name: "Acme", currency_code: "usd" },
        },
      },
    }

    const { QuoteDetails, buttonType, prompt, toastSuccess, toastError } =
      loadQuoteDetails({
        quote,
        isLoading: false,
        preview: { id: "preview_1", items: [] },
        isPreviewLoading: false,
        sendQuoteImpl,
        rejectQuoteImpl,
        promptResult: false,
        stateValues: [true, true],
      })

    const tree = QuoteDetails()

    const buttons = collectElements(
      tree,
      (element) =>
        element.type === buttonType &&
        typeof element.props?.onClick === "function"
    )

    const reject = buttons.find((button) => button.props.children === "Reject Quote")
    const send = buttons.find((button) => button.props.children === "Send Quote")

    await reject.props.onClick()
    await send.props.onClick()

    expect(prompt).toHaveBeenCalledTimes(2)
    expect(rejectQuoteImpl).not.toHaveBeenCalled()
    expect(sendQuoteImpl).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows toast errors when send/reject mutations fail", async () => {
    const sendQuoteImpl = jest.fn(async (_data, options) => {
      await options?.onError?.(new Error("send failed"))
    })
    const rejectQuoteImpl = jest.fn(async (_data, options) => {
      await options?.onError?.(new Error("reject failed"))
    })

    const quote = {
      draft_order_id: "order_1",
      status: "pending_merchant",
      draft_order: {
        id: "order_1",
        customer: { id: "cust_1", email: "a@example.com", phone: "+420123" },
      },
      customer: {
        employee: {
          spending_limit: 500,
          company: { id: "company_1", name: "Acme", currency_code: "usd" },
        },
      },
    }

    const { QuoteDetails, buttonType, toastError } = loadQuoteDetails({
      quote,
      isLoading: false,
      preview: { id: "preview_1", items: [] },
      isPreviewLoading: false,
      sendQuoteImpl,
      rejectQuoteImpl,
      promptResult: true,
      stateValues: [true, true],
    })

    const tree = QuoteDetails()

    const buttons = collectElements(
      tree,
      (element) =>
        element.type === buttonType &&
        typeof element.props?.onClick === "function"
    )

    const reject = buttons.find((button) => button.props.children === "Reject Quote")
    const send = buttons.find((button) => button.props.children === "Send Quote")

    await reject.props.onClick()
    await send.props.onClick()

    expect(toastError).toHaveBeenCalledWith("reject failed")
    expect(toastError).toHaveBeenCalledWith("send failed")
  })
})
