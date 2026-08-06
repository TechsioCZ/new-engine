import { z } from "zod"

import { laneSchema } from "./stack-manifest.js"

const planServiceSchema = z.object({
  clone_to_preview: z.boolean(),
  deploy_lanes: z.array(laneSchema),
  deploy_stage: z.number().int(),
  downtime_risk: z.boolean(),
  id: z.string().min(1),
  service_dependencies: z.array(z.string().min(1)),
  service_slug: z.string().min(1),
})

export const planCommandInputSchema = z
  .object({
    lane: laneSchema,
    outputJson: z.string().min(1).optional(),
    prNumber: z.number().int().positive().optional(),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    servicesCsv: z.string().default(""),
    stackManifestPath: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (
      (value.lane === "preview" && value.prNumber === undefined) ||
      value.prNumber === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "PR number is required for preview lane.",
        path: ["prNumber"],
      })
    }
  })

export const planResponseSchema = z.object({
  deploy_services: z.array(planServiceSchema),
  deploy_services_csv: z.string(),
  lane: laneSchema,
  pr_number: z.number().int().positive().nullable(),
  preview_cloned_service_ids_csv: z.string(),
  preview_cloned_services: z.array(planServiceSchema),
  preview_environment_name: z.string(),
  preview_excluded_service_ids_csv: z.string(),
  preview_excluded_services: z.array(planServiceSchema),
  requested_services: z.array(planServiceSchema),
  requested_services_csv: z.string(),
  source_services_csv: z.string(),
})

export type PlanCommandInput = z.infer<typeof planCommandInputSchema>
export type PlanResponse = z.infer<typeof planResponseSchema>
