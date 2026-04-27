import { z } from "zod"

export const archiveEnvironmentResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  deleted: z.boolean(),
  noop: z.boolean(),
  noop_reason: z.string().nullable().default(null),
})

export type ArchiveEnvironmentResponse = z.infer<
  typeof archiveEnvironmentResponseSchema
>
