import { z } from "zod"

export const localEnvRuntimeProviderOutputTargetsCommandInputSchema = z.object({
  format: z.enum(["json", "local-env-vars"]).default("json"),
  outputId: z.string().min(1),
  providerId: z.string().min(1),
  serviceIdsCsv: z.string().default(""),
  stackInputsPath: z.string().min(1),
})

export const localEnvRuntimeProviderOutputTargetsResponseSchema = z.object({
  output_id: z.string().min(1),
  provider_id: z.string().min(1),
  service_ids_csv: z.string(),
  targets: z.array(
    z.object({
      env_var: z.string().min(1),
      local_env_var: z.string().min(1),
      service_id: z.string().min(1),
    }),
  ),
})

export type LocalEnvRuntimeProviderOutputTargetsCommandInput = z.infer<
  typeof localEnvRuntimeProviderOutputTargetsCommandInputSchema
>
export type LocalEnvRuntimeProviderOutputTargetsResponse = z.infer<
  typeof localEnvRuntimeProviderOutputTargetsResponseSchema
>
