import { basename } from "node:path"

import type { BootstrapPreviewTemplateDbPlanCommandInput } from "../../contracts/bootstrap-preview-template-db.js"
import {
  bootstrapPreviewTemplateDbInspectResponseSchema,
  bootstrapPreviewTemplateDbPlanResponseSchema,
} from "../../contracts/bootstrap-preview-template-db.js"
import type { BootstrapInspectServiceDetails } from "../../contracts/bootstrap-shared.js"
import { readJsonFile, resolveOptionalPath } from "./shared.js"

function serviceEnvValue(
  serviceDetails: BootstrapInspectServiceDetails | null,
  key: string
): string | undefined {
  return serviceDetails?.env_variables.find((envVar) => envVar.key === key)
    ?.value
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return
}

function buildStagingDbName(
  explicitValue: string | undefined,
  templateDbName: string | undefined
): string | undefined {
  if (explicitValue?.trim()) {
    return explicitValue.trim()
  }

  if (!templateDbName) {
    return
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14)
  return `${templateDbName}_staging_${stamp}`
}

function buildBlockingReasons(input: {
  projectExists: boolean
  environmentExists: boolean
  dbServiceExists: boolean
  operatorServiceExists: boolean
  dbHost?: string
  dbPort?: string
  dbUser?: string
  dbPassword?: string
  templateDbName?: string
  templateOwner?: string
  dbAdminName?: string
}): string[] {
  const reasons: string[] = []

  if (!input.projectExists) {
    reasons.push("Zane project does not exist.")
  }
  if (!input.environmentExists) {
    reasons.push("Target Zane environment does not exist.")
  }
  if (!input.dbServiceExists) {
    reasons.push(
      "Database service is missing from the target Zane environment."
    )
  }
  if (!input.operatorServiceExists) {
    reasons.push(
      "zane-operator service is missing from the target Zane environment."
    )
  }
  if (!input.dbHost) {
    reasons.push("Database host could not be resolved.")
  }
  if (!input.dbPort) {
    reasons.push("Database port could not be resolved.")
  }
  if (!input.dbUser) {
    reasons.push("Database admin user could not be resolved.")
  }
  if (!input.dbPassword) {
    reasons.push("Database admin password could not be resolved.")
  }
  if (!input.dbAdminName) {
    reasons.push("Database admin database name could not be resolved.")
  }
  if (!input.templateDbName) {
    reasons.push("Template database name could not be resolved.")
  }
  if (!input.templateOwner) {
    reasons.push("Template database owner could not be resolved.")
  }

  return reasons
}

export async function executeBootstrapPreviewTemplateDbPlan(
  input: BootstrapPreviewTemplateDbPlanCommandInput
) {
  const inspectResponse = bootstrapPreviewTemplateDbInspectResponseSchema.parse(
    await readJsonFile(input.inspectJsonPath)
  )

  const dbDetails = inspectResponse.db_service.details
  const operatorDetails = inspectResponse.operator_service.details
  const dbHost = firstNonEmpty(
    input.dbHost,
    dbDetails?.global_network_alias,
    dbDetails?.network_alias
  )
  const dbPort = firstNonEmpty(
    input.dbPort,
    serviceEnvValue(operatorDetails, "PGPORT"),
    "5432"
  )
  const dbUser = firstNonEmpty(
    input.dbUser,
    serviceEnvValue(dbDetails, "POSTGRES_USER")
  )
  const dbPassword = firstNonEmpty(
    input.dbPassword,
    serviceEnvValue(dbDetails, "POSTGRES_PASSWORD")
  )
  const dbAdminName = firstNonEmpty(input.dbAdminName, "postgres")
  const dbSslmode = firstNonEmpty(
    input.dbSslmode,
    serviceEnvValue(operatorDetails, "PGSSLMODE"),
    "disable"
  )
  const templateDbName = firstNonEmpty(
    input.templateDbName,
    serviceEnvValue(dbDetails, "MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME"),
    serviceEnvValue(operatorDetails, "DB_TEMPLATE_NAME")
  )
  const templateOwner = firstNonEmpty(
    input.templateOwner,
    serviceEnvValue(dbDetails, "MEDUSA_DB_ZANE_OPERATOR_USER"),
    serviceEnvValue(operatorDetails, "PGUSER")
  )
  const stagingDbName = buildStagingDbName(input.stagingDbName, templateDbName)
  const blockingReasons = buildBlockingReasons({
    projectExists: inspectResponse.project_exists,
    environmentExists: inspectResponse.environment_exists,
    dbServiceExists: inspectResponse.db_service.exists,
    operatorServiceExists: inspectResponse.operator_service.exists,
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    templateDbName,
    templateOwner,
    dbAdminName,
  })
  const dumpFile = resolveOptionalPath(input.dumpFile)

  return bootstrapPreviewTemplateDbPlanResponseSchema.parse({
    project_slug: input.projectSlug,
    environment_name: input.environmentName,
    status: blockingReasons.length === 0 ? "ready" : "blocked",
    blocking_reasons: blockingReasons,
    project_exists: inspectResponse.project_exists,
    environment_exists: inspectResponse.environment_exists,
    db_service_slug: input.dbServiceSlug,
    db_service_exists: inspectResponse.db_service.exists,
    operator_service_slug: input.operatorServiceSlug,
    operator_service_exists: inspectResponse.operator_service.exists,
    source_db_name: input.sourceDbName,
    template_db_name: templateDbName ?? null,
    staging_db_name: stagingDbName ?? null,
    template_owner: templateOwner ?? null,
    db_host: dbHost ?? null,
    db_port: dbPort ?? null,
    db_user: dbUser ?? null,
    db_password: input.includeSecrets ? (dbPassword ?? null) : undefined,
    db_password_present: Boolean(dbPassword),
    db_admin_name: dbAdminName ?? null,
    db_sslmode: dbSslmode ?? null,
    docker_network: input.dockerNetwork,
    postgres_client_image: input.postgresClientImage,
    dump_file: dumpFile ? basename(dumpFile) : null,
  })
}
