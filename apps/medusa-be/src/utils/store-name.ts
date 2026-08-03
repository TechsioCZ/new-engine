import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function getMedusaStoreName(
  container: Record<string, unknown>,
  fallback = "N1 Shop"
): Promise<string> {
  const resolver = container.resolve

  if (typeof resolver !== "function") {
    return fallback
  }

  try {
    const query = resolver.call(
      container,
      ContainerRegistrationKeys.QUERY
    ) as Query
    const { data } = await query.graph({
      entity: "store",
      fields: ["name"],
      pagination: { take: 1, skip: 0 },
    })
    const name = (data[0] as { name?: unknown } | undefined)?.name

    return typeof name === "string" && name.trim() ? name.trim() : fallback
  } catch {
    return fallback
  }
}
