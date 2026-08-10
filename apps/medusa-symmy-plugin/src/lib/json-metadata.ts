import { z } from "@medusajs/framework/zod"

export const JsonMetadataSchema = z.record(z.string(), z.json())

export type JsonMetadata = z.infer<typeof JsonMetadataSchema>
