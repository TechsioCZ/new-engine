import { z } from "zod"

export const ensurePreviewDbResponseSchema = z.object({
  db_name: z.string().min(1),
  created: z.boolean(),
  app_user: z.string().min(1),
  app_password: z.string().min(1),
})

export const teardownPreviewDbResponseSchema = z.object({
  db_name: z.string().min(1),
  deleted: z.boolean(),
  app_user: z.string().min(1),
  role_deleted: z.boolean(),
  dev_grants_cleaned: z.boolean(),
  noop: z.boolean(),
  noop_reason: z.string().nullable().default(null),
})

export type EnsurePreviewDbResponse = z.infer<
  typeof ensurePreviewDbResponseSchema
>
export type TeardownPreviewDbResponse = z.infer<
  typeof teardownPreviewDbResponseSchema
>
