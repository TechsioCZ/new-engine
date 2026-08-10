import { z } from "zod"

const runtimeProviderOutputValueSchema = z.object({
  env_var: z.string().default(""),
  value: z.string().default(""),
})

export const runtimeProviderOutputsSchema = z.record(
  z.string(),
  runtimeProviderOutputValueSchema,
)

export type RuntimeProviderOutputs = z.infer<
  typeof runtimeProviderOutputsSchema
>

export const runtimeProviderOutputKey = (
  providerId: string,
  outputId: string,
): string => `${providerId}:${outputId}`

export const parseRuntimeProviderOutputs = (
  raw: string | undefined,
  label = "--runtime-provider-outputs-json",
): RuntimeProviderOutputs => {
  const value = raw?.trim()
  if (value === undefined || value === "") {
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid ${label}: ${message}`, { cause: error })
  }

  return runtimeProviderOutputsSchema.parse(parsed)
}
