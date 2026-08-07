import { getUrlRegistry } from "@/lib/url-registry/factory"
import { parseCreateInput, readJson, withUrlRegistryAdmin } from "../common"

export const POST = withUrlRegistryAdmin(async (request) => {
  const registry = await getUrlRegistry()
  const record = await registry.sync(parseCreateInput(await readJson(request)))
  return Response.json({ record })
})
