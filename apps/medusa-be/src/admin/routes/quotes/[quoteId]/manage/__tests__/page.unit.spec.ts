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

const loadQuoteManagePage = ({
  quote,
  isLoading,
}: {
  quote: any
  isLoading: boolean
}) => {
  let QuoteManage: () => any
  let manageQuoteFormType: any

  jest.isolateModules(() => {
    jest.doMock("react-router-dom", () => ({
      useParams: () => ({
        quoteId: "quote_1",
      }),
    }))

    jest.doMock(
      "../../../../../components/common/modals/route-focus-modal/route-focus-modal",
      () => {
        const React = jest.requireActual("react")
        return {
          RouteFocusModal: ({ children, ...props }: any) =>
            React.createElement("route-focus-modal", props, children),
        }
      }
    )

    jest.doMock("../../../../../hooks/api/quotes", () => ({
      useQuote: () => ({
        quote,
        isLoading,
      }),
    }))

    jest.doMock("../../../components", () => {
      manageQuoteFormType = () => null
      return {
        ManageQuoteForm: manageQuoteFormType,
      }
    })

    QuoteManage = require("../page").default
  })

  return QuoteManage!
}

describe("Quote manage page", () => {
  it("returns empty output while loading", () => {
    const QuoteManage = loadQuoteManagePage({
      quote: undefined,
      isLoading: true,
    })

    const tree = QuoteManage()
    expect(tree).toBeTruthy()
    expect(tree.props.children).toBeUndefined()
  })

  it("throws when quote is missing", () => {
    const QuoteManage = loadQuoteManagePage({
      quote: null,
      isLoading: false,
    })

    expect(() => QuoteManage()).toThrow("quote not found")
  })

  it("renders manage quote form inside route focus modal", () => {
    const quote = {
      draft_order: {
        id: "order_1",
      },
    }

    const QuoteManage = loadQuoteManagePage({
      quote,
      isLoading: false,
    })

    const tree = QuoteManage()
    const forms = collectElements(tree, (element) => typeof element.props?.order !== "undefined")

    expect(forms).toHaveLength(1)
    expect(forms[0].props.order).toEqual(quote.draft_order)
  })
})
