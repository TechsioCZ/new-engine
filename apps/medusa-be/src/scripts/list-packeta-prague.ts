import type { ExecArgs } from "@medusajs/framework/types"
import {
  PACKETA_CLIENT_MODULE,
  type PacketaClientModuleService,
} from "../modules/packeta-client"

/**
 * Lists the first few Packeta pickup points in Prague — handy for grabbing a
 * valid `addressId` for manual createPacket testing.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/list-packeta-prague.ts [city]
 *
 * Default city is "praha" (case-insensitive substring match).
 */
export default async function listPacketaPrague({
  container,
  args,
}: ExecArgs) {
  const cityFilter = (args[0] ?? "praha").toLowerCase()

  const packetaService = container.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE
  )

  const branches = await packetaService.getBranches()
  const matches = branches
    .filter((b) => (b.city ?? "").toLowerCase().includes(cityFilter))
    .slice(0, 10)

  if (matches.length === 0) {
    process.stdout.write(`No branches matched city '${cityFilter}'\n`)
    return
  }

  process.stdout.write(
    `First ${matches.length} Packeta branches matching city '${cityFilter}':\n\n`
  )
  for (const b of matches) {
    process.stdout.write(
      `  id=${b.id}  ${b.name ?? "?"}  (${b.street ?? "?"}, ${b.zip ?? "?"})\n`
    )
  }
}
