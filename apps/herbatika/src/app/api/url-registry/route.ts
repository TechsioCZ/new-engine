import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  parseCreateInput,
  parseListQuery,
  readJson,
  withUrlRegistryAdmin,
} from "./common"

export const GET = withUrlRegistryAdmin(async (request) => {
  const registry = await getUrlRegistry()
  return Response.json(
    await registry.list(parseListQuery(new URL(request.url)))
  )
})

export const POST = withUrlRegistryAdmin(async (request) => {
  const registry = await getUrlRegistry()
  const record = await registry.create(
    parseCreateInput(await readJson(request))
  )
  return Response.json({ record }, { status: 201 })
})
