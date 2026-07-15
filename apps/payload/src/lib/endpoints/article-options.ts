import { APIError, type Endpoint, type Where } from "payload"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "../utils/endpoint"

type ArticleOption = {
  id: number | string
  slug: string
  title: string
  thumbnail?: null | string
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

const parseLimit = (value: string | undefined) => {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT
  }

  return Math.min(parsed, MAX_LIMIT)
}

const isAuthorized = (req: Parameters<Endpoint["handler"]>[0]) => {
  if (req.user) {
    return true
  }

  const apiKey = process.env.PAYLOAD_API_KEY
  return Boolean(apiKey && req.headers.get("x-payload-api-key") === apiKey)
}

const getThumbnail = (featuredImage: unknown) => {
  if (
    featuredImage &&
    typeof featuredImage === "object" &&
    "url" in featuredImage &&
    typeof featuredImage.url === "string"
  ) {
    return featuredImage.url
  }

  return null
}

/** Article lookup endpoint used by Payload admin custom fields. */
export const articleOptionsEndpoint: Endpoint = {
  path: "/article-options",
  method: "get",
  handler: async (req) => {
    if (!isAuthorized(req)) {
      throw new APIError("Unauthorized", 401)
    }

    const search = getQueryParam(req, "search")?.trim()
    const limit = parseLimit(getQueryParam(req, "limit"))
    const where: undefined | Where = search
      ? {
          or: [{ title: { like: search } }, { slug: { like: search } }],
        }
      : undefined

    const result = await req.payload.find({
      collection: "articles",
      depth: 1,
      limit,
      locale: getLocaleFromRequest(req),
      overrideAccess: true,
      pagination: false,
      sort: "title",
      where,
    })

    const articles: ArticleOption[] = result.docs
      .filter((article) => typeof article.slug === "string" && article.slug)
      .map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title || article.slug,
        thumbnail: getThumbnail(article.featuredImage),
      }))

    return buildJsonResponse(req, { articles })
  },
}
