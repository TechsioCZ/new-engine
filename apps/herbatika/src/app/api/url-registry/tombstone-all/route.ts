import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  parseTombstoneAllInput,
  readJson,
  withUrlRegistryAdmin,
} from "../common"

export const POST = withUrlRegistryAdmin(async (request) => {
  const input = parseTombstoneAllInput(await readJson(request))
  const registry = await getUrlRegistry()
  const records = await registry.tombstoneAllMarkets(input.kind, input.entityId)
  return Response.json({ records })
})
