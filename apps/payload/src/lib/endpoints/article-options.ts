import { APIError, type Endpoint, type Where } from "payload"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
  isAuthorizedEndpointRequest,
  parseLimit,
} from "../utils/endpoint"

type ArticleOption = {
  id: number | string
  slug: string
  title: string
  thumbnail?: null | string
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
    if (!isAuthorizedEndpointRequest(req)) {
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
      select: {
        id: true,
        slug: true,
        title: true,
        featuredImage: true,
      },
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
