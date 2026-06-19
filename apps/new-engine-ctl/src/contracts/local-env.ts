import { z } from "zod"

export const localEnvRuntimeProviderOutputTargetsCommandInputSchema = z.object({
  providerId: z.string().min(1),
  outputId: z.string().min(1),
  serviceIdsCsv: z.string().default(""),
  format: z.enum(["json", "local-env-vars"]).default("json"),
  stackInputsPath: z.string().min(1),
})

export const localEnvRuntimeProviderOutputTargetsResponseSchema = z.object({
  provider_id: z.string().min(1),
  output_id: z.string().min(1),
  service_ids_csv: z.string(),
  targets: z.array(
    z.object({
      service_id: z.string().min(1),
      env_var: z.string().min(1),
      local_env_var: z.string().min(1),
    })
  ),
})

export type LocalEnvRuntimeProviderOutputTargetsCommandInput = z.infer<
  typeof localEnvRuntimeProviderOutputTargetsCommandInputSchema
>
export type LocalEnvRuntimeProviderOutputTargetsResponse = z.infer<
  typeof localEnvRuntimeProviderOutputTargetsResponseSchema
>
