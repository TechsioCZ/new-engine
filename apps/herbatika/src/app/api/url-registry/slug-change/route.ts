import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  authorizeUrlRegistryAdmin,
  parseSlugChangeInput,
  readJson,
  urlRegistryErrorResponse,
} from "../common"

export const POST = async (request: Request) => {
  const unauthorized = authorizeUrlRegistryAdmin(request)
  if (unauthorized) {
    return unauthorized
  }
  try {
    const input = parseSlugChangeInput(await readJson(request))
    const registry = await getUrlRegistry()
    const record = await registry.changeSlug(
      input.market,
      input.kind,
      input.entityId,
      input.newSlug
    )
    return Response.json({ record })
  } catch (error) {
    return urlRegistryErrorResponse(error)
  }
}
