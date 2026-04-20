import { z } from "zod"

export const runtimeProviderOutputValueSchema = z.object({
  value: z.string().default(""),
  env_var: z.string().default(""),
})

export const runtimeProviderOutputsSchema = z.record(
  z.string(),
  runtimeProviderOutputValueSchema
)

export type RuntimeProviderOutputValue = z.infer<
  typeof runtimeProviderOutputValueSchema
>
export type RuntimeProviderOutputs = z.infer<typeof runtimeProviderOutputsSchema>

export function runtimeProviderOutputKey(
  providerId: string,
  outputId: string
): string {
  return `${providerId}:${outputId}`
}

export function parseRuntimeProviderOutputs(
  raw: string | undefined,
  label = "--runtime-provider-outputs-json"
): RuntimeProviderOutputs {
  const value = raw?.trim()
  if (!value) {
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid ${label}: ${message}`)
  }

  return runtimeProviderOutputsSchema.parse(parsed)
}
