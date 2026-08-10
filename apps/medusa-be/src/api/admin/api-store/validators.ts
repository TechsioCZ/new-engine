import { z } from "@medusajs/framework/zod"

import { ApiStoreCredentialsSchema } from "../../../modules/api-store"

export const GetAdminApiStoreSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    name: z.string().trim().min(1).optional(),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict()

export const PostAdminApiStoreSchema = z
  .object({
    api_key: z.string().min(1).nullable().optional(),
    api_url: z.string().trim().min(1).nullable().optional(),
    credentials: ApiStoreCredentialsSchema.nullable().optional(),
    enabled: z.boolean().optional(),
    name: z.string().trim().min(1),
  })
  .strict()
  .refine(
    (data) =>
      (data.api_key !== null && data.api_key !== undefined) ||
      (data.credentials !== null && data.credentials !== undefined),
    {
      message: "Either api_key or credentials must be provided",
      path: ["api_key"],
    },
  )

export const PostAdminApiStoreByIdSchema = z
  .object({
    api_key: z.string().min(1).nullable().optional(),
    api_url: z.string().trim().min(1).nullable().optional(),
    credentials: ApiStoreCredentialsSchema.nullable().optional(),
    enabled: z.boolean().optional(),
    name: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })

export type GetAdminApiStoreSchemaType = z.infer<typeof GetAdminApiStoreSchema>

export type PostAdminApiStoreSchemaType = z.infer<
  typeof PostAdminApiStoreSchema
>

export type PostAdminApiStoreByIdSchemaType = z.infer<
  typeof PostAdminApiStoreByIdSchema
>
