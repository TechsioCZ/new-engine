import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import {
  type PublicPageProps,
  type PublicSourceResult,
  resolveFlowPublicPage,
} from "@/lib/routing/public-page"
import type { Market } from "@/lib/url/types"

const MAX_PRIVATE_QUERY_LENGTH = 4096

export type ExactPrivateQuery = ReadonlyMap<string, string>

const decodeFormValue = (value: string) => {
  try {
    return decodeURIComponent(value.replaceAll("+", " "))
  } catch {
    return null
  }
}

export const readExactPrivateQuery = (
  requestUrl: string | undefined,
  allowedKeys: readonly string[]
): ExactPrivateQuery | null => {
  if (!requestUrl) {
    return new Map()
  }
  const queryIndex = requestUrl.indexOf("?")
  if (queryIndex < 0) {
    return new Map()
  }
  const rawQuery = requestUrl.slice(queryIndex + 1)
  if (!rawQuery || rawQuery.length > MAX_PRIVATE_QUERY_LENGTH) {
    return null
  }

  const allowed = new Set(allowedKeys)
  const values = new Map<string, string>()
  for (const segment of rawQuery.split("&")) {
    if (!segment) {
      return null
    }
    const separator = segment.indexOf("=")
    const rawKey = separator < 0 ? segment : segment.slice(0, separator)
    const rawValue = separator < 0 ? "" : segment.slice(separator + 1)
    const key = decodeFormValue(rawKey)
    const value = decodeFormValue(rawValue)
    if (!(key && value !== null && allowed.has(key)) || values.has(key)) {
      return null
    }
    values.set(key, value)
  }
  return values
}

const contextWithoutPrivateQuery = (
  context: GetServerSidePropsContext,
  suppressCanonicalization: boolean
): GetServerSidePropsContext => {
  const requestUrl = context.req.url
  const queryIndex = requestUrl?.indexOf("?") ?? -1
  const url = queryIndex < 0 ? requestUrl : requestUrl?.slice(0, queryIndex)
  return {
    ...context,
    req: {
      ...context.req,
      headers: {
        ...context.req.headers,
        ...(suppressCanonicalization
          ? { "x-sf-canonicalization-required": undefined }
          : {}),
      },
      url,
    },
  } as GetServerSidePropsContext
}

export const resolvePrivateFlowPublicPage = async <Value>(
  context: GetServerSidePropsContext,
  input: Readonly<{
    expectedRouteKey: string
    loadSource: (market: Market) => Promise<PublicSourceResult<Value>>
    suppressCanonicalization?: boolean
  }>
): Promise<GetServerSidePropsResult<PublicPageProps<Value>>> =>
  resolveFlowPublicPage(
    contextWithoutPrivateQuery(
      context,
      input.suppressCanonicalization === true
    ),
    {
      expectedRouteKey: input.expectedRouteKey,
      loadSource: input.loadSource,
    }
  )
