import { z } from "zod"

export const previewSharedEnvValueSourceSchema = z.enum([
  "literal",
  "service_network_alias",
  "service_global_network_alias",
  "service_public_origin",
  "service_internal_origin",
  "service_internal_bucket_url",
])

export const previewRuntimeSourceInputSchema = z
  .object({
    kind: previewSharedEnvValueSourceSchema,
    value: z.string().min(1).optional(),
    service_slug: z.string().min(1).optional(),
    source_environment_name: z.string().min(1).optional(),
    port: z.number().int().positive().optional(),
    trailing_slash: z.boolean().optional(),
    bucket_shared_env_key: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "literal") {
      if (!value.value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "literal preview runtime sources require value",
        })
      }
      return
    }

    if (!value.service_slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["service_slug"],
        message: "derived preview runtime sources require service_slug",
      })
    }

    if (value.kind === "service_internal_origin" && !value.port) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["port"],
        message: "service_internal_origin requires port",
      })
    }

    if (value.kind === "service_internal_bucket_url") {
      if (!value.port) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["port"],
          message: "service_internal_bucket_url requires port",
        })
      }
      if (!value.bucket_shared_env_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bucket_shared_env_key"],
          message: "service_internal_bucket_url requires bucket_shared_env_key",
        })
      }
    }
  })

export const previewSharedEnvVariableInputSchema = z
  .object({
    key: z.string().min(1),
    source: previewRuntimeSourceInputSchema,
  })

export const previewSharedEnvSyncResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  environment_exists: z.boolean(),
  variables: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    })
  ),
})

export type PreviewSharedEnvVariableInput = z.infer<
  typeof previewSharedEnvVariableInputSchema
>
export type PreviewSharedEnvSyncResponse = z.infer<
  typeof previewSharedEnvSyncResponseSchema
>
