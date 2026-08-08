import type { ExecArgs } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { PACKETA_CLIENT_MODULE } from "../modules/packeta-client"
import type { PacketaClientModuleService } from "../modules/packeta-client"

/**
 * Manual smoke test for Packeta createPacket against the real Packeta API.
 *
 * Reads the API password and sender config from the `packeta_config` row in DB
 * (Settings → Packeta in admin), so make sure Packeta is enabled and configured
 * before running this.
 *
 * Required env vars:
 *   PACKETA_ADDRESS_ID   Valid pickup-point ID (branch.json `id` field or widget output)
 *
 * Optional env vars:
 *   PACKETA_TEST_EMAIL   Recipient email (default: test@example.com)
 *   PACKETA_TEST_PHONE   Recipient phone (default: +420777123456)
 *   PACKETA_TEST_VALUE   Declared packet value, CZK (default: 100)
 *   PACKETA_TEST_WEIGHT  Weight in kg (default: 0.5)
 *
 * Usage:
 *   PACKETA_ADDRESS_ID=79 npx medusa exec ./src/scripts/test-packeta-create-packet.ts
 *
 * No charges apply unless the packet is physically picked up by Packeta. To be
 * safe, configure a dedicated testing sender in Settings → Packeta first.
 */
export default async function testPacketaCreatePacket({ container }: ExecArgs) {
  const addressIdRaw = process.env["PACKETA_ADDRESS_ID"]
  if (addressIdRaw === undefined || addressIdRaw === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Set PACKETA_ADDRESS_ID env var",
    )
  }
  const addressId = Math.trunc(Number(addressIdRaw))
  if (!Number.isFinite(addressId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `PACKETA_ADDRESS_ID must be a number, got: ${addressIdRaw}`,
    )
  }

  const packetaService = container.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE,
  )

  const config = await packetaService.getConfig()
  if (!config) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No Packeta config in DB. Configure it first in Admin → Settings → Packeta.",
    )
  }
  if (!config.is_enabled) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta is disabled in DB config (is_enabled=false).",
    )
  }
  if (config.api_password === null || config.api_password === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta config has no api_password set.",
    )
  }

  const orderRef = `TEST-${Date.now()}`
  const value = Number(process.env["PACKETA_TEST_VALUE"] ?? "100")
  const weight = Number(process.env["PACKETA_TEST_WEIGHT"] ?? "0.5")

  process.stdout.write(
    `Creating Packeta test packet '${orderRef}' (env: ${JSON.stringify(packetaService.getEnvironment())})...\n`,
  )

  try {
    const result = await packetaService.createPacket({
      addressId,
      currency: "CZK",
      email: process.env["PACKETA_TEST_EMAIL"] ?? "test@example.com",
      name: "Jan",
      number: orderRef,
      phone: process.env["PACKETA_TEST_PHONE"] ?? "+420777123456",
      surname: "Tester",
      value,
      weight,
    })

    process.stdout.write("\nSUCCESS:\n")
    process.stdout.write(`  packetId    : ${result.id}\n`)
    process.stdout.write(`  barcode     : ${result.barcode}\n`)
    process.stdout.write(`  barcodeText : ${result.barcodeText}\n`)
    process.stdout.write(
      "\nThe packet exists in Packeta but will not be charged unless physically handed over.\n",
    )
    process.stdout.write(`To cancel it, call cancelPacket(${result.id}).\n`)
  } catch (error) {
    process.stderr.write("\nFAILED:\n")
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    )
    throw error
  }
}
