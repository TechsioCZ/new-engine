import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

export const getMedusaStoreName = async (
  container: Record<string, unknown>,
  fallback = "N1 Shop",
): Promise<string> => {
  const resolver = container["resolve"]

  if (typeof resolver !== "function") {
    return fallback
  }

  try {
    const query: unknown = Reflect.apply(resolver, container, [
      ContainerRegistrationKeys.QUERY,
    ])
    if (!isRecord(query) || typeof query["graph"] !== "function") {
      return fallback
    }

    const response: unknown = await Reflect.apply(query["graph"], query, [
      {
        entity: "store",
        fields: ["name"],
        pagination: { skip: 0, take: 1 },
      },
    ])
    if (!isRecord(response)) {
      return fallback
    }
    const data: unknown = response["data"]
    if (!isUnknownArray(data)) {
      return fallback
    }

    const [store] = data
    const name = isRecord(store) ? store["name"] : undefined
    const normalizedName = typeof name === "string" ? name.trim() : ""
    return normalizedName === "" ? fallback : normalizedName
  } catch {
    return fallback
  }
}
