import { z } from "zod"

export const previewRandomOnceSecretsResponseSchema = z.object({
  environment_exists: z.boolean(),
  environment_name: z.string().min(1),
  missing_secret_ids: z.array(z.string().min(1)).default([]),
  project_slug: z.string().min(1),
  secrets: z.array(
    z.object({
      secret_id: z.string().min(1),
      value: z.string().min(1),
    }),
  ),
})

export type PreviewRandomOnceSecretsResponse = z.infer<
  typeof previewRandomOnceSecretsResponseSchema
>
