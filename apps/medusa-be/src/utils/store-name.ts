import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const getMedusaStoreName = async (
  container: MedusaContainer,
  fallback = "N1 Shop",
): Promise<string> => {
  try {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "store",
      fields: ["name"],
      pagination: { skip: 0, take: 1 },
    })
    const name = data[0]?.name
    const normalizedName = typeof name === "string" ? name.trim() : ""
    return normalizedName === "" ? fallback : normalizedName
  } catch {
    return fallback
  }
}
