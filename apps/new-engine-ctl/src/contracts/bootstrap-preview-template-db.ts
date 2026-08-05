import { z } from "zod"

import {
  bootstrapInspectServiceDetailsSchema,
  bootstrapPlanStatusSchema,
} from "./bootstrap-shared.js"

export const bootstrapPreviewTemplateDbInspectResponseSchema = z.object({
  db_service: z.object({
    service_slug: z.string().min(1),
    exists: z.boolean(),
    details: bootstrapInspectServiceDetailsSchema.nullable(),
  }),
  environment_exists: z.boolean(),
  environment_name: z.string().min(1),
  operator_service: z.object({
    service_slug: z.string().min(1),
    exists: z.boolean(),
    details: bootstrapInspectServiceDetailsSchema.nullable(),
  }),
  project_exists: z.boolean(),
  project_slug: z.string().min(1),
})

export const bootstrapPreviewTemplateDbPlanCommandInputSchema = z.object({
  dbAdminName: z.string().min(1).optional(),
  dbHost: z.string().min(1).optional(),
  dbPassword: z.string().min(1).optional(),
  dbPort: z.string().min(1).optional(),
  dbServiceSlug: z.string().min(1),
  dbSslmode: z.string().min(1).optional(),
  dbUser: z.string().min(1).optional(),
  dockerNetwork: z.string().min(1).default("zane"),
  dumpFile: z.string().min(1).optional(),
  environmentName: z.string().min(1),
  includeSecrets: z.boolean().default(false),
  inspectJsonPath: z.string().min(1),
  operatorServiceSlug: z.string().min(1),
  postgresClientImage: z.string().min(1).default("postgres:18.1-alpine"),
  projectSlug: z.string().min(1, "Zane project slug is required."),
  sourceDbName: z.string().min(1),
  stagingDbName: z.string().min(1).optional(),
  templateDbName: z.string().min(1).optional(),
  templateOwner: z.string().min(1).optional(),
})

export const bootstrapPreviewTemplateDbPlanResponseSchema = z.object({
  blocking_reasons: z.array(z.string()).default([]),
  db_admin_name: z.string().nullable(),
  db_host: z.string().nullable(),
  db_password: z.string().nullable().optional(),
  db_password_present: z.boolean(),
  db_port: z.string().nullable(),
  db_service_exists: z.boolean(),
  db_service_slug: z.string().min(1),
  db_sslmode: z.string().nullable(),
  db_user: z.string().nullable(),
  docker_network: z.string().min(1),
  dump_file: z.string().nullable(),
  environment_exists: z.boolean(),
  environment_name: z.string().min(1),
  operator_service_exists: z.boolean(),
  operator_service_slug: z.string().min(1),
  postgres_client_image: z.string().min(1),
  project_exists: z.boolean(),
  project_slug: z.string().min(1),
  source_db_name: z.string().min(1),
  staging_db_name: z.string().nullable(),
  status: bootstrapPlanStatusSchema,
  template_db_name: z.string().nullable(),
  template_owner: z.string().nullable(),
})

export type BootstrapPreviewTemplateDbPlanCommandInput = z.infer<
  typeof bootstrapPreviewTemplateDbPlanCommandInputSchema
>
