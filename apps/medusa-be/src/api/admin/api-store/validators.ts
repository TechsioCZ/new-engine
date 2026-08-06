import { z } from "@medusajs/framework/zod"

const CredentialsSchema = z.record(z.string(), z.unknown())

export const GetAdminApiStoreSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    name: z.string().trim().min(1).optional(),
  })
  .strict()

export const PostAdminApiStoreSchema = z
  .object({
    name: z.string().trim().min(1),
    api_url: z.string().trim().min(1).nullable().optional(),
    api_key: z.string().min(1).nullable().optional(),
    credentials: CredentialsSchema.nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine((data) => !!data.api_key || !!data.credentials, {
    message: "Either api_key or credentials must be provided",
    path: ["api_key"],
  })

export const PostAdminApiStoreByIdSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    api_url: z.string().trim().min(1).nullable().optional(),
    api_key: z.string().min(1).nullable().optional(),
    credentials: CredentialsSchema.nullable().optional(),
    enabled: z.boolean().optional(),
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
