import { APIError, type Endpoint, type Where } from "payload"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
  isAuthorizedEndpointRequest,
  parseLimit,
} from "../utils/endpoint"

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

const buildArticleWhere = (search?: string): Where => {
  const published: Where = { status: { equals: "published" } }
  if (!search) {
    return published
  }

  return {
    and: [
      published,
      {
        or: [{ title: { like: search } }, { slug: { like: search } }],
      },
    ],
  }
}

/** Published article lookup used by the article carousel admin field. */
export const articleOptionsEndpoint: Endpoint = {
  path: "/article-options",
  method: "get",
  handler: async (req) => {
    if (!isAuthorizedEndpointRequest(req)) {
      throw new APIError("Unauthorized", 401)
    }

    const search = getQueryParam(req, "search")?.trim()
    const result = await req.payload.find({
      collection: "articles",
      depth: 1,
      fallbackLocale: false,
      limit: parseLimit(getQueryParam(req, "limit")),
      locale: getLocaleFromRequest(req),
      overrideAccess: true,
      pagination: false,
      req,
      sort: "title",
      where: buildArticleWhere(search),
    })

    const articles = result.docs.flatMap((article) => {
      const slug = article.slug?.trim()
      if (!slug) {
        return []
      }

      return [
        {
          id: article.id,
          slug,
          title: article.title?.trim() || slug,
          thumbnail: getThumbnail(article.featuredImage),
        },
      ]
    })

    return buildJsonResponse(req, { articles })
  },
}
