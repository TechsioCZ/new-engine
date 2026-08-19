import {
  getMarketRuntime,
  type MarketCode,
  type MarketRuntime,
  type MarketRuntimeBinding,
} from "@/lib/market/market-runtime"

type MarketSdkConfig = Readonly<{
  baseUrl: string
  publishableKey: string
}>

type MarketSdkAuthorityOptions<TSdk> = Readonly<{
  baseUrl: string
  createSdk: (config: MarketSdkConfig) => TSdk
  runtime: MarketRuntime
}>

export type MarketSdkAuthorityEntry<TSdk> = Readonly<{
  binding: MarketRuntimeBinding
  sdk: TSdk
}>

export const createMarketSdkAuthority = <TSdk>({
  baseUrl,
  createSdk,
  runtime,
}: MarketSdkAuthorityOptions<TSdk>) => {
  const entries = new Map<MarketCode, MarketSdkAuthorityEntry<TSdk>>()

  return (market: MarketCode): MarketSdkAuthorityEntry<TSdk> => {
    const existing = entries.get(market)
    if (existing) {
      return existing
    }

    const binding = getMarketRuntime(runtime, market)
    if (!binding) {
      throw new Error(`Market ${market} is not enabled by ALLOWED_MARKETS`)
    }

    const entry = Object.freeze({
      binding,
      sdk: createSdk({
        baseUrl,
        publishableKey: binding.publishableApiKey,
      }),
    })
    entries.set(market, entry)
    return entry
  }
}
