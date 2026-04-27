import { z } from "zod"

export const localPortProtocolSchema = z.enum(["tcp", "udp"])

export const localPortEndpointSchema = z.object({
  id: z.string().min(1),
  env_var: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  preferred_port: z.number().int().min(1).max(65_535),
  host: z.string().min(1).default("127.0.0.1"),
  protocols: z.array(localPortProtocolSchema).min(1).default(["tcp"]),
  description: z.string().min(1).optional(),
})

export const localDerivedEnvSchema = z.object({
  env_var: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  value: z.string(),
  replace_when_current: z.array(z.string()).default([]),
  description: z.string().min(1).optional(),
})

export const localPortsConfigSchema = z.object({
  local_ports: z.object({
    runtime_env_file: z.string().min(1).default(".docker_data/dev-runtime.env"),
    endpoints: z.array(localPortEndpointSchema).min(1),
    derived_env: z.array(localDerivedEnvSchema).default([]),
  }),
})

export const localPortsResolveCommandInputSchema = z.object({
  configPath: z.string().min(1),
  envFilePath: z.string().min(1),
  outputPath: z.string().min(1).optional(),
  projectName: z.string().min(1),
})

export const localPortResolutionSchema = z.object({
  id: z.string(),
  env_var: z.string(),
  host: z.string(),
  preferred_port: z.number().int(),
  resolved_port: z.number().int(),
  source: z.enum(["process", "env_file", "runtime_env_file", "config"]),
  shifted: z.boolean(),
  protocols: z.array(localPortProtocolSchema),
})

export const localPortsResolveResponseSchema = z.object({
  config_path: z.string(),
  env_file_path: z.string(),
  output_path: z.string(),
  project_name: z.string(),
  ports: z.array(localPortResolutionSchema),
  env: z.record(z.string(), z.string()),
})

export type LocalPortsConfig = z.infer<typeof localPortsConfigSchema>
export type LocalPortsResolveCommandInput = z.infer<
  typeof localPortsResolveCommandInputSchema
>
export type LocalPortsResolveResponse = z.infer<
  typeof localPortsResolveResponseSchema
>
export type LocalPortEndpoint = z.infer<typeof localPortEndpointSchema>
export type LocalPortProtocol = z.infer<typeof localPortProtocolSchema>
export type LocalDerivedEnv = z.infer<typeof localDerivedEnvSchema>
