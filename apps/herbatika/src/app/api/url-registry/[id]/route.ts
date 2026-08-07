import { getUrlRegistry } from "@/lib/url-registry/factory"
import { withUrlRegistryAdmin } from "../common"

type DetailContext = { params: Promise<{ id: string }> }

export const GET = withUrlRegistryAdmin<DetailContext>(
  async (_request, context) => {
    const { id } = await context.params
    const registry = await getUrlRegistry()
    const result = await registry.list({ id, limit: 1 })
    const record = result.records[0]
    return record
      ? Response.json({ record })
      : Response.json({ error: "URL record not found" }, { status: 404 })
  }
)
