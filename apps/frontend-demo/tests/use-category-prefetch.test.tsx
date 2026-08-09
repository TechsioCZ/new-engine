import type { StoreRegion } from "@medusajs/types"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, act } from "@testing-library/react"
import { createElement } from "react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCategoryPrefetch } from "@/hooks/use-category-prefetch"
import { useRegions } from "@/hooks/use-region"
import { getProducts } from "@/services/product-service"

vi.mock(import("@/hooks/use-region"), () => ({
  useRegions: vi.fn<typeof useRegions>(),
}))

vi.mock(import("@/services/product-service"), () => ({
  getProducts: vi.fn<typeof getProducts>(),
}))

const useRegionsMock = vi.mocked(useRegions)
const getProductsMock = vi.mocked(getProducts)
const selectedRegion = {
  currency_code: "czk",
  id: "region_1",
  name: "Czechia",
} satisfies StoreRegion

const queryResponse = {
  count: 0,
  limit: 12,
  offset: 0,
  products: [],
}

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const createWrapper = (queryClient: QueryClient) => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return wrapper
}

const flushPrefetch = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe(useCategoryPrefetch, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useRegionsMock.mockReturnValue({
      error: null,
      isLoading: false,
      regions: [selectedRegion],
      selectedRegion,
      setSelectedRegion: vi
        .fn<(region: StoreRegion) => Promise<void>>()
        .mockResolvedValue(),
    })
    getProductsMock.mockResolvedValue(queryResponse)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("runs a delayed prefetch after the requested delay", async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useCategoryPrefetch(), {
      wrapper: createWrapper(queryClient),
    })

    let prefetchId = ""
    act(() => {
      prefetchId = result.current.delayedPrefetch(
        ["category_1"],
        200,
        "success",
      )
      vi.advanceTimersByTime(199)
    })

    expect(prefetchId).toBe("success")
    expect(getProductsMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1)
      await flushPrefetch()
      await vi.runAllTimersAsync()
    })

    expect(getProductsMock).toHaveBeenCalledExactlyOnceWith({
      filters: { categories: ["category_1"], sizes: [] },
      limit: 12,
      offset: 0,
      region_id: "region_1",
      sort: "newest",
    })
    expect(result.current.cancelPrefetch(prefetchId)).toBeFalsy()
  })

  it("logs delayed prefetch failures and removes the completed timeout", async () => {
    const failure = new Error("network unavailable")
    const consoleError = vi.spyOn(console, "error").mockReturnValue()
    const queryClient = createQueryClient()
    vi.spyOn(queryClient, "prefetchQuery").mockRejectedValue(failure)
    const { result } = renderHook(() => useCategoryPrefetch(), {
      wrapper: createWrapper(queryClient),
    })

    let prefetchId = ""
    act(() => {
      prefetchId = result.current.delayedPrefetch(
        ["category_1"],
        100,
        "failure",
      )
    })

    await act(async () => {
      vi.advanceTimersByTime(100)
      await flushPrefetch()
      await vi.runAllTimersAsync()
    })

    expect(consoleError).toHaveBeenCalledWith(
      "Category prefetch failed:",
      failure,
    )
    expect(result.current.cancelPrefetch(prefetchId)).toBeFalsy()
  })

  it("cancels a delayed prefetch before it runs", () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useCategoryPrefetch(), {
      wrapper: createWrapper(queryClient),
    })

    let prefetchId = ""
    act(() => {
      prefetchId = result.current.delayedPrefetch(["category_1"], 100, "cancel")
      expect(result.current.cancelPrefetch(prefetchId)).toBeTruthy()
      vi.advanceTimersByTime(100)
    })

    expect(getProductsMock).not.toHaveBeenCalled()
    expect(result.current.cancelPrefetch(prefetchId)).toBeFalsy()
  })

  it.each([
    { enabled: false, name: "disabled" },
    { name: "without a selected region", selectedRegion: null },
    { categories: [], name: "with no categories" },
  ])(
    "does not prefetch when guarded ($name)",
    async ({
      categories = ["category_1"],
      enabled = true,
      selectedRegion: region = selectedRegion,
    }) => {
      useRegionsMock.mockReturnValue({
        error: null,
        isLoading: false,
        regions: region === null ? [] : [region],
        selectedRegion: region,
        setSelectedRegion: vi
          .fn<(nextRegion: StoreRegion) => Promise<void>>()
          .mockResolvedValue(),
      })
      const queryClient = createQueryClient()
      const { result } = renderHook(() => useCategoryPrefetch({ enabled }), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        await result.current.prefetchCategoryProducts(categories)
      })

      expect(getProductsMock).not.toHaveBeenCalled()
    },
  )
})
