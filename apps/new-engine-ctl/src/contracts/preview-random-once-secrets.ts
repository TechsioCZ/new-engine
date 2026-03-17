import { z } from "zod"

export const previewRandomOnceSecretsResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  environment_exists: z.boolean(),
  secrets: z.array(
    z.object({
      secret_id: z.string().min(1),
      value: z.string().min(1),
    }),
  ),
  missing_secret_ids: z.array(z.string().min(1)).default([]),
})

export type PreviewRandomOnceSecretsResponse = z.infer<
  typeof previewRandomOnceSecretsResponseSchema
>
