import { getUrlRegistry } from "@/lib/url-registry/factory"
import {
  parseEntityActionInput,
  readJson,
  withUrlRegistryAdmin,
} from "../common"

export const POST = withUrlRegistryAdmin(async (request) => {
  const input = parseEntityActionInput(await readJson(request))
  const registry = await getUrlRegistry()
  const record = await registry.tombstone(
    input.market,
    input.kind,
    input.entityId
  )
  return Response.json({ record })
})
