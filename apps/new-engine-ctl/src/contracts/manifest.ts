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
