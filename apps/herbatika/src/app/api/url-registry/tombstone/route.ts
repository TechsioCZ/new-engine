import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  authorizeUrlRegistryAdmin,
  parseEntityActionInput,
  readJson,
  urlRegistryErrorResponse,
} from "../common"

export const POST = async (request: Request) => {
  const unauthorized = authorizeUrlRegistryAdmin(request)
  if (unauthorized) {
    return unauthorized
  }
  try {
    const input = parseEntityActionInput(await readJson(request))
    const registry = await getUrlRegistry()
    const record = await registry.tombstone(
      input.market,
      input.kind,
      input.entityId
    )
    return Response.json({ record })
  } catch (error) {
    return urlRegistryErrorResponse(error)
  }
}
