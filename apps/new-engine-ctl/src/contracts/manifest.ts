import { z } from "zod"

import { localPhaseSchema } from "./stack-manifest.js"

export const manifestComposeServicesCommandInputSchema = z.object({
  phase: localPhaseSchema,
  defaultOnly: z.boolean().default(false),
  stackManifestPath: z.string().min(1),
})

export const manifestComposeServicesResponseSchema = z.object({
  phase: localPhaseSchema,
  default_only: z.boolean(),
  compose_services: z.array(z.string().min(1)),
  compose_services_shell: z.string(),
})

export type ManifestComposeServicesCommandInput = z.infer<
  typeof manifestComposeServicesCommandInputSchema
>
export type ManifestComposeServicesResponse = z.infer<
  typeof manifestComposeServicesResponseSchema
>

export const manifestServiceSlugsCommandInputSchema = z.object({
  serviceIdsCsv: z.string().min(1),
  stackManifestPath: z.string().min(1),
})

export const manifestServiceSlugsResponseSchema = z.object({
  service_ids_csv: z.string(),
  service_slugs_csv: z.string(),
  services: z.array(
    z.object({
      service_id: z.string().min(1),
      service_slug: z.string().min(1),
    })
  ),
})

export type ManifestServiceSlugsCommandInput = z.infer<
  typeof manifestServiceSlugsCommandInputSchema
 >
export type ManifestServiceSlugsResponse = z.infer<
  typeof manifestServiceSlugsResponseSchema
 >
