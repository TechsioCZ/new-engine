import { getUrlRegistry } from "@/lib/url-registry/factory"
import { parseSlugChangeInput, readJson, withUrlRegistryAdmin } from "../common"

export const POST = withUrlRegistryAdmin(async (request) => {
  const input = parseSlugChangeInput(await readJson(request))
  const registry = await getUrlRegistry()
  const record = await registry.changeSlug(
    input.market,
    input.kind,
    input.entityId,
    input.newSlug
  )
  return Response.json({ record })
})
