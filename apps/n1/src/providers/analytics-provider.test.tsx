// @vitest-environment happy-dom

import type { Analytics, AnalyticsAdapter } from "@techsio/analytics"
import type {
  LeadhubExtras,
  LeadhubIdentifyParams,
  LeadhubSetCartParams,
  LeadhubViewCategoryParams,
} from "@techsio/analytics/leadhub"
import { cleanup, renderHook } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  AnalyticsProvider,
  useAnalytics as getAnalytics,
} from "./analytics-provider"

const mocks = vi.hoisted(() => {
  const analytics: Analytics = {
    trackAddToCart: vi.fn<Analytics["trackAddToCart"]>(() => ({
      results: {},
      success: true,
    })),
    trackCustom: vi.fn<Analytics["trackCustom"]>(() => ({
      results: {},
      success: true,
    })),
    trackInitiateCheckout: vi.fn<Analytics["trackInitiateCheckout"]>(() => ({
      results: {},
      success: true,
    })),
    trackPurchase: vi.fn<Analytics["trackPurchase"]>(() => ({
      results: {},
      success: true,
    })),
    trackViewContent: vi.fn<Analytics["trackViewContent"]>(() => ({
      results: {},
      success: true,
    })),
  }

  const metaAdapter: AnalyticsAdapter = { key: "meta" }
  const googleAdapter: AnalyticsAdapter = { key: "google" }
  const leadhubAdapter: AnalyticsAdapter & LeadhubExtras = {
    key: "leadhub",
    trackIdentify: vi.fn<(params: LeadhubIdentifyParams) => boolean>(
      () => true,
    ),
    trackPageview: vi.fn<() => boolean>(() => true),
    trackSetCart: vi.fn<(params: LeadhubSetCartParams) => boolean>(() => true),
    trackViewCategory: vi.fn<(params: LeadhubViewCategoryParams) => boolean>(
      () => true,
    ),
  }

  return {
    analytics,
    createGoogleAdapter: vi.fn<
      (config?: {
        conversionLabel?: string
        debug?: boolean
      }) => AnalyticsAdapter
    >(() => googleAdapter),
    createLeadhubAdapter: vi.fn<
      (config?: { debug?: boolean }) => AnalyticsAdapter & LeadhubExtras
    >(() => leadhubAdapter),
    createMetaAdapter: vi.fn<
      (config?: { debug?: boolean }) => AnalyticsAdapter
    >(() => metaAdapter),
    googleAdapter,
    leadhubAdapter,
    metaAdapter,
    useUnifiedAnalytics: vi.fn<
      (config: { adapters: AnalyticsAdapter[]; debug?: boolean }) => Analytics
    >(() => analytics),
  }
})

vi.mock(import("@techsio/analytics"), () => ({
  useAnalytics: mocks.useUnifiedAnalytics,
}))
vi.mock(import("@techsio/analytics/google"), () => ({
  useGoogleAdapter: mocks.createGoogleAdapter,
}))
vi.mock(import("@techsio/analytics/leadhub"), () => ({
  useLeadhubAdapter: mocks.createLeadhubAdapter,
}))
vi.mock(import("@techsio/analytics/meta"), () => ({
  useMetaAdapter: mocks.createMetaAdapter,
}))

const contextProbe = () => {
  const analytics = getAnalytics()
  analytics.trackIdentify({
    email: "customer@example.com",
    subscribe: [],
  })
  analytics.trackPageview()
  analytics.trackSetCart({ products: [] })
  analytics.trackViewCategory({ category: "Women > Coats" })
  return null
}

const outsideProvider = () => {
  getAnalytics()
  return null
}

const ContextProbe = contextProbe
const OutsideProvider = outsideProvider

interface AnalyticsProviderTestConfig {
  debug: boolean
  googleConversionLabel?: string
}

const createAnalyticsProviderWrapper = (
  getConfig: () => AnalyticsProviderTestConfig,
) => {
  const wrapper = ({ children }: PropsWithChildren) => {
    const { debug, googleConversionLabel } = getConfig()
    return (
      <AnalyticsProvider
        debug={debug}
        {...(googleConversionLabel === undefined
          ? {}
          : { googleConversionLabel })}
      >
        {children}
      </AnalyticsProvider>
    )
  }

  return wrapper
}

describe("analytics provider wiring", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("propagates debug to every adapter and unified analytics", () => {
    renderToStaticMarkup(
      <AnalyticsProvider debug={true}>
        <ContextProbe />
      </AnalyticsProvider>,
    )

    expect(mocks.createMetaAdapter).toHaveBeenCalledWith({ debug: true })
    expect(mocks.createGoogleAdapter).toHaveBeenCalledWith({ debug: true })
    expect(mocks.createLeadhubAdapter).toHaveBeenCalledWith({ debug: true })
    expect(mocks.useUnifiedAnalytics).toHaveBeenCalledWith({
      adapters: [mocks.metaAdapter, mocks.googleAdapter, mocks.leadhubAdapter],
      debug: true,
    })
  })

  it("omits an unconfigured Google conversion label", () => {
    renderToStaticMarkup(
      <AnalyticsProvider debug={false}>
        <ContextProbe />
      </AnalyticsProvider>,
    )

    expect(mocks.createGoogleAdapter).toHaveBeenCalledWith({ debug: false })
  })

  it("includes a configured Google conversion label", () => {
    renderToStaticMarkup(
      <AnalyticsProvider debug={false} googleConversionLabel="AW-123/checkout">
        <ContextProbe />
      </AnalyticsProvider>,
    )

    expect(mocks.createGoogleAdapter).toHaveBeenCalledWith({
      conversionLabel: "AW-123/checkout",
      debug: false,
    })
  })

  it("preserves adapter ordering and exposes Leadhub-specific methods", () => {
    renderToStaticMarkup(
      <AnalyticsProvider debug={true}>
        <ContextProbe />
      </AnalyticsProvider>,
    )

    expect(mocks.useUnifiedAnalytics).toHaveBeenCalledWith({
      adapters: [mocks.metaAdapter, mocks.googleAdapter, mocks.leadhubAdapter],
      debug: true,
    })
    expect(mocks.leadhubAdapter.trackIdentify).toHaveBeenCalledWith({
      email: "customer@example.com",
      subscribe: [],
    })
    expect(mocks.leadhubAdapter.trackPageview).toHaveBeenCalledWith()
    expect(mocks.leadhubAdapter.trackSetCart).toHaveBeenCalledWith({
      products: [],
    })
    expect(mocks.leadhubAdapter.trackViewCategory).toHaveBeenCalledWith({
      category: "Women > Coats",
    })
  })

  it("keeps adapter and context identities stable on unrelated rerenders", () => {
    const config: AnalyticsProviderTestConfig = { debug: false }
    const wrapper = createAnalyticsProviderWrapper(() => config)
    const { rerender, result } = renderHook(getAnalytics, { wrapper })
    const initialValue = result.current

    rerender()

    expect({
      google: mocks.createGoogleAdapter.mock.calls.length,
      leadhub: mocks.createLeadhubAdapter.mock.calls.length,
      meta: mocks.createMetaAdapter.mock.calls.length,
    }).toStrictEqual({ google: 1, leadhub: 1, meta: 1 })
    expect(result.current).toBe(initialValue)
  })

  it("replaces the complete context when adapter configuration changes", () => {
    let config: AnalyticsProviderTestConfig = { debug: false }
    const wrapper = createAnalyticsProviderWrapper(() => config)
    const { rerender, result } = renderHook(getAnalytics, { wrapper })
    const initialValue = result.current
    const nextPageview = vi.fn<() => boolean>(() => true)
    const nextLeadhubAdapter: AnalyticsAdapter & LeadhubExtras = {
      key: "leadhub",
      trackIdentify: vi.fn<(params: LeadhubIdentifyParams) => boolean>(
        () => true,
      ),
      trackPageview: nextPageview,
      trackSetCart: vi.fn<(params: LeadhubSetCartParams) => boolean>(
        () => true,
      ),
      trackViewCategory: vi.fn<(params: LeadhubViewCategoryParams) => boolean>(
        () => true,
      ),
    }
    const nextMetaAdapter: AnalyticsAdapter = { key: "meta" }
    const nextGoogleAdapter: AnalyticsAdapter = { key: "google" }
    mocks.createMetaAdapter.mockReturnValueOnce(nextMetaAdapter)
    mocks.createGoogleAdapter.mockReturnValueOnce(nextGoogleAdapter)
    mocks.createLeadhubAdapter.mockReturnValueOnce(nextLeadhubAdapter)
    config = {
      debug: true,
      googleConversionLabel: "AW-123/reconfigured",
    }

    rerender()

    expect({
      google: mocks.createGoogleAdapter.mock.calls.length,
      leadhub: mocks.createLeadhubAdapter.mock.calls.length,
      meta: mocks.createMetaAdapter.mock.calls.length,
    }).toStrictEqual({ google: 2, leadhub: 2, meta: 2 })
    expect(mocks.useUnifiedAnalytics).toHaveBeenLastCalledWith({
      adapters: [nextMetaAdapter, nextGoogleAdapter, nextLeadhubAdapter],
      debug: true,
    })
    expect(result.current).not.toBe(initialValue)
    result.current.trackPageview()
    expect(nextPageview).toHaveBeenCalledExactlyOnceWith()
  })

  it("throws when used outside the provider", () => {
    expect(() => renderToStaticMarkup(<OutsideProvider />)).toThrow(
      "useAnalytics must be used within an AnalyticsProvider",
    )
  })
})
