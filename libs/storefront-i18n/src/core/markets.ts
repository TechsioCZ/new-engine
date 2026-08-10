export interface StorefrontMarket {
  code: string
  locale: string
}

export interface ResolveStorefrontMarketInput {
  acceptLanguage?: string | null
  host?: string | null
}

const normalizeStorefrontHost = (host?: string | null) => {
  const firstHost = host?.split(",")[0]?.trim().toLowerCase()

  if (firstHost === undefined || firstHost === "") {
    return null
  }

  return firstHost
    .replace(/^https?:\/\//u, "")
    .replace(/\/.*$/u, "")
    .replace(/:\d+$/u, "")
    .replace(/\.$/u, "")
}

interface AcceptedLanguage {
  language: string
  quality: number
}

const insertAcceptedLanguage = (
  acceptedLanguages: readonly AcceptedLanguage[],
  candidate: AcceptedLanguage,
): readonly AcceptedLanguage[] => {
  const insertionIndex = acceptedLanguages.findIndex(
    (accepted) => candidate.quality > accepted.quality,
  )

  if (insertionIndex === -1) {
    return [...acceptedLanguages, candidate]
  }

  return [
    ...acceptedLanguages.slice(0, insertionIndex),
    candidate,
    ...acceptedLanguages.slice(insertionIndex),
  ]
}

const getAcceptedLanguages = (acceptLanguage?: string | null) => {
  if (
    acceptLanguage === undefined ||
    acceptLanguage === null ||
    acceptLanguage === ""
  ) {
    return []
  }

  const candidates = acceptLanguage
    .split(",")
    .map((item) => {
      const [rawTag, ...parameters] = item.trim().split(";")
      const qualityParameter = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.toLowerCase().startsWith("q="))
      const quality =
        qualityParameter === undefined ? 1 : Number(qualityParameter.slice(2))

      return {
        language: rawTag?.split("-")[0]?.toLowerCase() ?? "",
        quality: Number.isFinite(quality) ? quality : 1,
      }
    })
    .filter(
      (item) => item.language !== "" && item.quality > 0 && item.quality <= 1,
    )

  let acceptedLanguages: readonly AcceptedLanguage[] = []

  for (const candidate of candidates) {
    acceptedLanguages = insertAcceptedLanguage(acceptedLanguages, candidate)
  }

  return acceptedLanguages.map((item) => item.language)
}

type MarketCode<TMarkets> = Extract<keyof TMarkets, string>

interface DefineStorefrontMarketsOptions<
  TMarkets extends Record<string, StorefrontMarket>,
> {
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
    const hostMarketCode =
      normalizedHost === null ? undefined : hostMarketMap[normalizedHost]

    if (hostMarketCode !== undefined) {
      return getMarket(hostMarketCode)
    }

    for (const language of getAcceptedLanguages(acceptLanguage)) {
      const languageMarketCode = languageMarketMap[language]

      if (languageMarketCode !== undefined) {
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
