import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  authorizeUrlRegistryAdmin,
  parseTombstoneAllInput,
  readJson,
  urlRegistryErrorResponse,
} from "../common"

export const POST = async (request: Request) => {
  const unauthorized = authorizeUrlRegistryAdmin(request)
  if (unauthorized) {
    return unauthorized
  }
  try {
    const input = parseTombstoneAllInput(await readJson(request))
    const registry = await getUrlRegistry()
    const records = await registry.tombstoneAllMarkets(
      input.kind,
      input.entityId
    )
    return Response.json({ records })
  } catch (error) {
    return urlRegistryErrorResponse(error)
  }
}
