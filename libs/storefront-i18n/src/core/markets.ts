export type StorefrontMarket = {
  code: string
  locale: string
}

export type ResolveStorefrontMarketInput = {
  acceptLanguage?: string | null
  host?: string | null
}

export const normalizeStorefrontHost = (host?: string | null) => {
  const firstHost = host?.split(",")[0]?.trim().toLowerCase()

  if (!firstHost) {
    return null
  }

  return firstHost
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
}

const getAcceptedLanguages = (acceptLanguage?: string | null) => {
  if (!acceptLanguage) {
    return []
  }

  return acceptLanguage
    .split(",")
    .map((item, index) => {
      const [rawTag, ...parameters] = item.trim().split(";")
      const qualityParameter = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.toLowerCase().startsWith("q="))
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.slice(2))
        : 1

      return {
        index,
        language: rawTag?.split("-")[0]?.toLowerCase() ?? "",
        quality: Number.isFinite(quality) ? quality : 1,
      }
    })
    .filter(
      (item) => item.language && item.quality > 0 && item.quality <= 1
    )
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index
    )
    .map((item) => item.language)
}

type MarketCode<TMarkets> = Extract<keyof TMarkets, string>

type DefineStorefrontMarketsOptions<
  TMarkets extends Record<string, StorefrontMarket>,
> = {
  defaultMarketCode: MarketCode<TMarkets>
  hostMarketMap?: Readonly<Record<string, MarketCode<TMarkets>>>
  languageMarketMap?: Readonly<Record<string, MarketCode<TMarkets>>>
  markets: TMarkets
}

export const defineStorefrontMarkets = <
  const TMarkets extends Record<string, StorefrontMarket>,
>({
  defaultMarketCode,
  hostMarketMap = {},
  languageMarketMap = {},
  markets,
}: DefineStorefrontMarketsOptions<TMarkets>) => {
  const getMarket = (code: MarketCode<TMarkets>) => markets[code]

  const resolveMarket = ({
    acceptLanguage,
    host,
  }: ResolveStorefrontMarketInput = {}) => {
    const normalizedHost = normalizeStorefrontHost(host)
    const hostMarketCode = normalizedHost
      ? hostMarketMap[normalizedHost]
      : undefined

    if (hostMarketCode) {
      return getMarket(hostMarketCode)
    }

    for (const language of getAcceptedLanguages(acceptLanguage)) {
      const languageMarketCode = languageMarketMap[language]

      if (languageMarketCode) {
        return getMarket(languageMarketCode)
      }
    }

    return getMarket(defaultMarketCode)
  }

  return {
    defaultMarket: getMarket(defaultMarketCode),
    getMarket,
    markets,
    resolveMarket,
  }
}
