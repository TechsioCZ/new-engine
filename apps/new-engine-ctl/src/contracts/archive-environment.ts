import { z } from "zod"

export const archiveEnvironmentResponseSchema = z.object({
  deleted: z.boolean(),
  environment_name: z.string().min(1),
  noop: z.boolean(),
  noop_reason: z.string().nullable().default(null),
  project_slug: z.string().min(1),
})

export type ArchiveEnvironmentResponse = z.infer<
  typeof archiveEnvironmentResponseSchema
>
