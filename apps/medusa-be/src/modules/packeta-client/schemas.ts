import { z } from "@medusajs/framework/zod"
import { omitUndefined } from "@techsio/std/object"

import type { PacketaBranch, PacketaCreatePacketResult } from "./types"

export const packetaCreatePacketResultSchema = z.object({
  barcode: z.string(),
  barcodeText: z.string(),
  id: z.number(),
}) satisfies z.ZodType<PacketaCreatePacketResult>

export const packetaBranchSchema = z
  .object({
    branchType: z.string().optional(),
    city: z.string(),
    country: z.string(),
    currency: z.string().optional(),
    id: z.number(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    name: z.string(),
    nameStreet: z.string(),
    openingHours: z.string().optional(),
    street: z.string(),
    zip: z.string(),
  })
  .transform(omitUndefined) satisfies z.ZodType<PacketaBranch>
