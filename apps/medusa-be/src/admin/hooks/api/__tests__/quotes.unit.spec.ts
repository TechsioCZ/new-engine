var mockUseQuery: jest.Mock
var mockUseMutation: jest.Mock
var mockUseQueryClient: jest.Mock
var mockInvalidateQueries: jest.Mock

var mockClientFetch: jest.Mock
var mockAddItems: jest.Mock
var mockUpdateOriginalItem: jest.Mock
var mockRemoveAddedItem: jest.Mock
var mockUpdateAddedItem: jest.Mock
var mockRequestOrderEdit: jest.Mock

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: (...args: unknown[]) => mockUseQueryClient(...args),
}))

jest.mock("../../../lib/client", () => ({
  sdk: {
    client: {
      fetch: (mockClientFetch = jest.fn()),
    },
    admin: {
      orderEdit: {
        addItems: (mockAddItems = jest.fn()),
        updateOriginalItem: (mockUpdateOriginalItem = jest.fn()),
        removeAddedItem: (mockRemoveAddedItem = jest.fn()),
        updateAddedItem: (mockUpdateAddedItem = jest.fn()),
        request: (mockRequestOrderEdit = jest.fn()),
      },
    },
  },
}))

import { orderPreviewQueryKey } from "../order-preview"
import {
  quoteQueryKey,
  useAddItemsToQuote,
  useConfirmQuote,
  useCreateQuoteMessage,
  useQuote,
  useQuotes,
  useRejectQuote,
  useRemoveQuoteItem,
  useSendQuote,
  useUpdateAddedQuoteItem,
  useUpdateQuoteItem,
} from "../quotes"

describe("quote api hooks", () => {
  beforeEach(() => {
    mockUseQuery = jest.fn()
    mockUseMutation = jest.fn((options) => options)
    mockInvalidateQueries = jest.fn()
    mockUseQueryClient = jest.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    }))

    mockClientFetch.mockReset()
    mockAddItems.mockReset()
    mockUpdateOriginalItem.mockReset()
    mockRemoveAddedItem.mockReset()
    mockUpdateAddedItem.mockReset()
    mockRequestOrderEdit.mockReset()
  })

  it("useQuotes and useQuote create expected queries", async () => {
    mockUseQuery.mockReturnValue({
      data: { quotes: [{ id: "q_1" }] },
      isFetching: false,
    })

    useQuotes({ limit: 10 } as any)
    let options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(quoteQueryKey.list())
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/quotes", {
      query: { limit: 10 },
      headers: undefined,
    })

    useQuote("q_1", { fields: "id" } as any)
    options = mockUseQuery.mock.calls[1][0]
    expect(options.queryKey).toEqual(quoteQueryKey.detail("q_1"))
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/quotes/q_1", {
      query: { fields: "id" },
      headers: undefined,
    })
  })

  it("useAddItemsToQuote and update/remove quote-item hooks call order-edit APIs", async () => {
    mockAddItems.mockResolvedValue({ id: "preview_1" })
    mockUpdateOriginalItem.mockResolvedValue({ id: "preview_1" })
    mockRemoveAddedItem.mockResolvedValue({ id: "preview_1" })
    mockUpdateAddedItem.mockResolvedValue({ id: "preview_1" })

    useAddItemsToQuote("quote_1")
    let options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn({ items: [{ variant_id: "variant_1", quantity: 1 }] })
    expect(mockAddItems).toHaveBeenCalledWith("quote_1", {
      items: [{ variant_id: "variant_1", quantity: 1 }],
    })
    options.onSuccess({}, {}, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: orderPreviewQueryKey.detail("quote_1"),
    })

    useUpdateQuoteItem("quote_1")
    options = mockUseMutation.mock.calls[1][0]
    await options.mutationFn({ itemId: "item_1", quantity: 2 })
    expect(mockUpdateOriginalItem).toHaveBeenCalledWith("quote_1", "item_1", {
      quantity: 2,
    })

    useRemoveQuoteItem("quote_1")
    options = mockUseMutation.mock.calls[2][0]
    await options.mutationFn("action_1")
    expect(mockRemoveAddedItem).toHaveBeenCalledWith("quote_1", "action_1")

    useUpdateAddedQuoteItem("quote_1")
    options = mockUseMutation.mock.calls[3][0]
    await options.mutationFn({ actionId: "action_1", quantity: 3 })
    expect(mockUpdateAddedItem).toHaveBeenCalledWith("quote_1", "action_1", {
      quantity: 3,
    })
  })

  it("useConfirmQuote requests order-edit confirmation and invalidates preview details", async () => {
    mockRequestOrderEdit.mockResolvedValue({ id: "preview_1" })

    useConfirmQuote("quote_1")

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn()
    expect(mockRequestOrderEdit).toHaveBeenCalledWith("quote_1")

    options.onSuccess({}, undefined, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: orderPreviewQueryKey.details(),
    })
  })

  it("useSendQuote and useRejectQuote post to endpoints and invalidate quote/order-preview queries", async () => {
    mockClientFetch.mockResolvedValue({ quote: { id: "quote_1" } })

    useSendQuote("quote_1")
    let options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/quotes/quote_1/send", {
      method: "POST",
    })
    options.onSuccess({}, undefined, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: orderPreviewQueryKey.details(),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: quoteQueryKey.detail("quote_1"),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: quoteQueryKey.lists(),
    })

    useRejectQuote("quote_1")
    options = mockUseMutation.mock.calls[1][0]
    await options.mutationFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/quotes/quote_1/reject", {
      method: "POST",
    })
    options.onSuccess({}, undefined, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: quoteQueryKey.detail("quote_1"),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: quoteQueryKey.lists(),
    })
  })

  it("useCreateQuoteMessage posts message and invalidates quote details", async () => {
    mockClientFetch.mockResolvedValue({ quote: { id: "quote_1" } })

    useCreateQuoteMessage("quote_1")

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn({ text: "Hello", item_id: "item_1" })
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/quotes/quote_1/messages", {
      body: { text: "Hello", item_id: "item_1" },
      method: "POST",
    })

    options.onSuccess({}, { text: "Hello", item_id: "item_1" }, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: quoteQueryKey.details(),
    })
  })
})
