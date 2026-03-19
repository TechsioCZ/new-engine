import { z } from "zod"

import {
  bootstrapInspectServiceDetailsSchema,
  bootstrapPlanStatusSchema,
} from "./bootstrap-shared.js"

export const bootstrapPreviewTemplateDbInspectResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  project_exists: z.boolean(),
  environment_exists: z.boolean(),
  db_service: z.object({
    service_slug: z.string().min(1),
    exists: z.boolean(),
    details: bootstrapInspectServiceDetailsSchema.nullable(),
  }),
  operator_service: z.object({
    service_slug: z.string().min(1),
    exists: z.boolean(),
    details: bootstrapInspectServiceDetailsSchema.nullable(),
  }),
})

export const bootstrapPreviewTemplateDbPlanCommandInputSchema = z.object({
  projectSlug: z.string().min(1, "Zane project slug is required."),
  environmentName: z.string().min(1),
  inspectJsonPath: z.string().min(1),
  dbServiceSlug: z.string().min(1),
  operatorServiceSlug: z.string().min(1),
  sourceDbName: z.string().min(1),
  templateDbName: z.string().min(1).optional(),
  stagingDbName: z.string().min(1).optional(),
  templateOwner: z.string().min(1).optional(),
  dbHost: z.string().min(1).optional(),
  dbPort: z.string().min(1).optional(),
  dbUser: z.string().min(1).optional(),
  dbPassword: z.string().min(1).optional(),
  dbAdminName: z.string().min(1).optional(),
  dbSslmode: z.string().min(1).optional(),
  dockerNetwork: z.string().min(1).default("zane"),
  postgresClientImage: z.string().min(1).default("postgres:18.1-alpine"),
  dumpFile: z.string().min(1).optional(),
  includeSecrets: z.boolean().default(false),
})

export const bootstrapPreviewTemplateDbPlanResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  status: bootstrapPlanStatusSchema,
  blocking_reasons: z.array(z.string()).default([]),
  project_exists: z.boolean(),
  environment_exists: z.boolean(),
  db_service_slug: z.string().min(1),
  db_service_exists: z.boolean(),
  operator_service_slug: z.string().min(1),
  operator_service_exists: z.boolean(),
  source_db_name: z.string().min(1),
  template_db_name: z.string().nullable(),
  staging_db_name: z.string().nullable(),
  template_owner: z.string().nullable(),
  db_host: z.string().nullable(),
  db_port: z.string().nullable(),
  db_user: z.string().nullable(),
  db_password: z.string().nullable().optional(),
  db_password_present: z.boolean(),
  db_admin_name: z.string().nullable(),
  db_sslmode: z.string().nullable(),
  docker_network: z.string().min(1),
  postgres_client_image: z.string().min(1),
  dump_file: z.string().nullable(),
})

export type BootstrapPreviewTemplateDbInspectResponse = z.infer<
  typeof bootstrapPreviewTemplateDbInspectResponseSchema
>
export type BootstrapPreviewTemplateDbPlanCommandInput = z.infer<
  typeof bootstrapPreviewTemplateDbPlanCommandInputSchema
>
export type BootstrapPreviewTemplateDbPlanResponse = z.infer<
  typeof bootstrapPreviewTemplateDbPlanResponseSchema
>
