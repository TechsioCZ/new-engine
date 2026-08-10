import { z } from "zod"

const previewSharedEnvValueSourceSchema = z.enum([
  "literal",
  "service_network_alias",
  "service_global_network_alias",
  "service_public_origin",
  "service_internal_origin",
  "service_internal_bucket_url",
])

const previewRuntimeSourceInputSchema = z
  .object({
    bucket_shared_env_key: z.string().min(1).optional(),
    kind: previewSharedEnvValueSourceSchema,
    port: z.number().int().positive().optional(),
    service_slug: z.string().min(1).optional(),
    source_environment_name: z.string().min(1).optional(),
    trailing_slash: z.boolean().optional(),
    value: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "literal") {
      if (value.value === undefined || value.value === "") {
        ctx.addIssue({
          code: "custom",
          message: "literal preview runtime sources require value",
          path: ["value"],
        })
      }
      return
    }

    if (value.service_slug === undefined || value.service_slug === "") {
      ctx.addIssue({
        code: "custom",
        message: "derived preview runtime sources require service_slug",
        path: ["service_slug"],
      })
    }

    if (
      value.kind === "service_internal_origin" &&
      (value.port === undefined || value.port === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "service_internal_origin requires port",
        path: ["port"],
      })
    }

    if (value.kind === "service_internal_bucket_url") {
      if (value.port === undefined || value.port === 0) {
        ctx.addIssue({
          code: "custom",
          message: "service_internal_bucket_url requires port",
          path: ["port"],
        })
      }
      if (
        value.bucket_shared_env_key === undefined ||
        value.bucket_shared_env_key === ""
      ) {
        ctx.addIssue({
          code: "custom",
          message: "service_internal_bucket_url requires bucket_shared_env_key",
          path: ["bucket_shared_env_key"],
        })
      }
    }
  })

const previewSharedEnvVariableInputSchema = z.object({
  key: z.string().min(1),
  source: previewRuntimeSourceInputSchema,
})

export const previewSharedEnvSyncResponseSchema = z.object({
  environment_exists: z.boolean(),
  environment_name: z.string().min(1),
  project_slug: z.string().min(1),
  variables: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    }),
  ),
})

export type PreviewSharedEnvVariableInput = z.infer<
  typeof previewSharedEnvVariableInputSchema
>
export type PreviewSharedEnvSyncResponse = z.infer<
  typeof previewSharedEnvSyncResponseSchema
>
