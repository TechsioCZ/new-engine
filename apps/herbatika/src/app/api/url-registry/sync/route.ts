import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  authorizeUrlRegistryAdmin,
  parseCreateInput,
  readJson,
  urlRegistryErrorResponse,
} from "../common"

export const POST = async (request: Request) => {
  const unauthorized = authorizeUrlRegistryAdmin(request)
  if (unauthorized) {
    return unauthorized
  }
  try {
    const registry = await getUrlRegistry()
    const record = await registry.sync(
      parseCreateInput(await readJson(request))
    )
    return Response.json({ record })
  } catch (error) {
    return urlRegistryErrorResponse(error)
  }
}
