import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  authorizeUrlRegistryAdmin,
  parseCreateInput,
  parseListQuery,
  readJson,
  urlRegistryErrorResponse,
} from "./common"

export const GET = async (request: Request) => {
  const unauthorized = authorizeUrlRegistryAdmin(request)
  if (unauthorized) {
    return unauthorized
  }
  try {
    const registry = await getUrlRegistry()
    return Response.json(
      await registry.list(parseListQuery(new URL(request.url)))
    )
  } catch (error) {
    return urlRegistryErrorResponse(error)
  }
}

export const POST = async (request: Request) => {
  const unauthorized = authorizeUrlRegistryAdmin(request)
  if (unauthorized) {
    return unauthorized
  }
  try {
    const registry = await getUrlRegistry()
    const record = await registry.create(
      parseCreateInput(await readJson(request))
    )
    return Response.json({ record }, { status: 201 })
  } catch (error) {
    return urlRegistryErrorResponse(error)
  }
}
