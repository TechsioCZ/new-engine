import { z } from "zod"

import { laneSchema } from "./stack-manifest.js"

const planServiceSchema = z.object({
  id: z.string().min(1),
  service_slug: z.string().min(1),
  clone_to_preview: z.boolean(),
  deploy_lanes: z.array(laneSchema),
  deploy_stage: z.number().int(),
  downtime_risk: z.boolean(),
  consumes: z.object({
    preview_db: z.boolean(),
    meili_frontend_key: z.boolean(),
    meili_backend_key: z.boolean(),
  }),
  service_dependencies: z.array(z.string().min(1)),
})

export const planCommandInputSchema = z
  .object({
    lane: laneSchema,
    servicesCsv: z.string().default(""),
    prNumber: z.number().int().positive().optional(),
    outputJson: z.string().min(1).optional(),
    stackManifestPath: z.string().min(1),
    previewEnvPrefix: z.string().min(1).default("pr-"),
  })
  .superRefine((value, ctx) => {
    if (value.lane === "preview" && !value.prNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prNumber"],
        message: "PR number is required for preview lane.",
      })
    }
  })

export const planResponseSchema = z.object({
  lane: laneSchema,
  source_services_csv: z.string(),
  requested_services_csv: z.string(),
  deploy_services_csv: z.string(),
  preview_environment_name: z.string(),
  preview_cloned_service_ids_csv: z.string(),
  preview_excluded_service_ids_csv: z.string(),
  pr_number: z.number().int().positive().nullable(),
  requested_services: z.array(planServiceSchema),
  deploy_services: z.array(planServiceSchema),
  preview_cloned_services: z.array(planServiceSchema),
  preview_excluded_services: z.array(planServiceSchema),
})

export type PlanCommandInput = z.infer<typeof planCommandInputSchema>
export type PlanResponse = z.infer<typeof planResponseSchema>
