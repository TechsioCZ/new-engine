import { readFile } from "node:fs/promises"
import type { ExecArgs } from "@medusajs/framework/types"
import { readExactCatalogTranslations } from "../utils/catalog-translation"

const MARKETS = ["sk", "cz", "hu", "ro"] as const

export default async function debug({ container, args }: ExecArgs) {
  const path = args[0]?.includes("=") ? args[0].split("=").slice(1).join("=") : args[0]
  if (!path) {
    throw new Error("manifest path required")
  }
  const manifest = JSON.parse(await readFile(path, "utf8")) as {
    markets: Record<(typeof MARKETS)[number], Record<string, unknown>>
  }
  for (const market of MARKETS) {
    const ids = Object.keys(manifest.markets[market])
    const failures: Array<{ id: string; result: unknown }> = []
    for (const id of ids) {
      const result = await readExactCatalogTranslations({
        container,
        entityIds: [id],
        entityKind: "product",
        market,
      })
      if (result.kind !== "found" || result.missingEntityIds.length > 0) {
        failures.push({ id, result })
        if (failures.length >= 20) {
          break
        }
      }
    }
    console.log(market, ids.length, JSON.stringify(failures))
  }
}
