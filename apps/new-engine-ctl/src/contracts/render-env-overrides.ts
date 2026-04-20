import { z } from "zod"

import { runtimeProviderOutputsSchema } from "./runtime-provider-outputs.js"
import { laneSchema } from "./stack-manifest.js"
import {
  envOverrideSchema,
  previewRandomOnceSecretInputSchema,
} from "./verify.js"

export const renderEnvOverridesCommandInputSchema = z.object({
  lane: laneSchema,
  servicesCsv: z.string().default(""),
  previewDbName: z.string().default(""),
  previewDbUser: z.string().default(""),
  previewDbPassword: z.string().default(""),
  previewRandomOnceSecrets: z
    .array(previewRandomOnceSecretInputSchema)
    .default([]),
  runtimeProviderOutputs: runtimeProviderOutputsSchema.default({}),
  outputJson: z.string().min(1).optional(),
  stackManifestPath: z.string().min(1),
  stackInputsPath: z.string().min(1),
})

export const renderEnvOverridesResponseSchema = z.object({
  lane: laneSchema,
  services: z.array(envOverrideSchema),
})

export type RenderEnvOverridesCommandInput = z.infer<
  typeof renderEnvOverridesCommandInputSchema
>
export type RenderEnvOverridesResponse = z.infer<
  typeof renderEnvOverridesResponseSchema
>
