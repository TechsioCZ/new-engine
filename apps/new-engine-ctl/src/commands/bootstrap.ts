import { Command } from "commander"
import { z } from "zod"

import { bootstrapPreviewTemplateDbPlanCommandInputSchema } from "../contracts/bootstrap-preview-template-db.js"
import { bootstrapZaneProjectPlanCommandInputSchema } from "../contracts/bootstrap-zane-project.js"
import { executeBootstrapPreviewTemplateDbPlan } from "../orchestration/bootstrap/preview-template-db.js"
import { executeBootstrapZaneProjectPlan } from "../orchestration/bootstrap/zane-project.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const zaneProjectOptionsSchema = z.object({
  adminCors: z.string().optional(),
  authCors: z.string().optional(),
  branch: z.string().optional(),
  environmentName: z.string(),
  gitAppId: z.string(),
  inspectJson: z.string(),
  minioFileUrl: z.string().optional(),
  operatorUpstreamZaneBaseUrl: z.string().optional(),
  operatorUpstreamZaneConnectBaseUrl: z.string().optional(),
  operatorUpstreamZaneConnectHostHeader: z.string().optional(),
  operatorUpstreamZanePassword: z.string().optional(),
  operatorUpstreamZaneUsername: z.string().optional(),
  phase: z.string(),
  projectDescription: z.string().optional(),
  projectSlug: z.string().optional(),
  publicDomain: z.string().optional(),
  publicUrlAffix: z.string(),
  repositoryUrl: z.string().optional(),
  stackInputsPath: z.string(),
  stackManifestPath: z.string(),
  storeCors: z.string().optional(),
})

const previewTemplateDbOptionsSchema = z.object({
  dbAdminName: z.string().optional(),
  dbHost: z.string().optional(),
  dbPassword: z.string().optional(),
  dbPort: z.string().optional(),
  dbServiceSlug: z.string().optional(),
  dbSslmode: z.string().optional(),
  dbUser: z.string().optional(),
  dockerNetwork: z.string(),
  dumpFile: z.string().optional(),
  environmentName: z.string(),
  includeSecrets: z.boolean(),
  inspectJson: z.string(),
  operatorServiceSlug: z.string().optional(),
  postgresClientImage: z.string(),
  projectSlug: z.string().optional(),
  sourceDbName: z.string(),
  stagingDbName: z.string().optional(),
  templateDbName: z.string().optional(),
  templateOwner: z.string().optional(),
})

const bootstrapEnvironmentSchema = z.object({
  DC_MEDUSA_APP_DB_NAME: z.string().optional(),
  MEDUSA_APP_DB_NAME: z.string().optional(),
  STACK_INPUTS_PATH: z.string().optional(),
  STACK_MANIFEST_PATH: z.string().optional(),
  ZANE_ADMIN_CORS: z.string().optional(),
  ZANE_AUTH_CORS: z.string().optional(),
  ZANE_DOCKER_NETWORK: z.string().optional(),
  ZANE_ENVIRONMENT_NAME: z.string().optional(),
  ZANE_GIT_APP_ID: z.string().optional(),
  ZANE_OPERATOR_UPSTREAM_ZANE_BASE_URL: z.string().optional(),
  ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL: z.string().optional(),
  ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER: z.string().optional(),
  ZANE_OPERATOR_UPSTREAM_ZANE_PASSWORD: z.string().optional(),
  ZANE_OPERATOR_UPSTREAM_ZANE_USERNAME: z.string().optional(),
  ZANE_POSTGRES_CLIENT_IMAGE: z.string().optional(),
  ZANE_PRODUCTION_ENVIRONMENT_NAME: z.string().optional(),
  ZANE_PROJECT_DESCRIPTION: z.string().optional(),
  ZANE_PROJECT_SLUG: z.string().optional(),
  ZANE_PUBLIC_DOMAIN: z.string().optional(),
  ZANE_PUBLIC_MINIO_FILE_URL: z.string().optional(),
  ZANE_PUBLIC_URL_AFFIX: z.string().optional(),
  ZANE_STORE_CORS: z.string().optional(),
})

const getBootstrapEnvironment = () =>
  bootstrapEnvironmentSchema.parse(process.env)

const executeZaneProjectPlanAction = async (
  options: unknown,
): Promise<void> => {
  const parsedOptions = zaneProjectOptionsSchema.parse(options)
  const environment = getBootstrapEnvironment()
  const projectSlug =
    parsedOptions.projectSlug ?? environment.ZANE_PROJECT_SLUG ?? ""
  const result = await executeBootstrapZaneProjectPlan(
    bootstrapZaneProjectPlanCommandInputSchema.parse({
      adminCorsOverride: parsedOptions.adminCors ?? undefined,
      authCorsOverride: parsedOptions.authCors ?? undefined,
      branchName: parsedOptions.branch ?? undefined,
      environmentName: parsedOptions.environmentName,
      gitAppId: parsedOptions.gitAppId ?? undefined,
      inspectJsonPath: parsedOptions.inspectJson,
      minioFileUrlOverride: parsedOptions.minioFileUrl ?? undefined,
      operatorUpstreamZaneBaseUrl:
        parsedOptions.operatorUpstreamZaneBaseUrl ?? undefined,
      operatorUpstreamZaneConnectBaseUrl:
        parsedOptions.operatorUpstreamZaneConnectBaseUrl ?? undefined,
      operatorUpstreamZaneConnectHostHeader:
        parsedOptions.operatorUpstreamZaneConnectHostHeader ?? undefined,
      operatorUpstreamZanePassword:
        parsedOptions.operatorUpstreamZanePassword ?? undefined,
      operatorUpstreamZaneUsername:
        parsedOptions.operatorUpstreamZaneUsername ?? undefined,
      phase: parsedOptions.phase,
      projectDescription:
        parsedOptions.projectDescription ??
        environment.ZANE_PROJECT_DESCRIPTION ??
        `${projectSlug} local bootstrap`,
      projectSlug,
      publicDomain: parsedOptions.publicDomain ?? undefined,
      publicUrlAffix: parsedOptions.publicUrlAffix,
      repositoryUrl: parsedOptions.repositoryUrl ?? undefined,
      stackInputsPath: parsedOptions.stackInputsPath,
      stackManifestPath: parsedOptions.stackManifestPath,
      storeCorsOverride: parsedOptions.storeCors ?? undefined,
    }),
  )
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

const executePreviewTemplateDbPlanAction = async (
  options: unknown,
): Promise<void> => {
  const parsedOptions = previewTemplateDbOptionsSchema.parse(options)
  const environment = getBootstrapEnvironment()
  const projectSlug =
    parsedOptions.projectSlug ?? environment.ZANE_PROJECT_SLUG ?? ""
  const result = await executeBootstrapPreviewTemplateDbPlan(
    bootstrapPreviewTemplateDbPlanCommandInputSchema.parse({
      dbAdminName: parsedOptions.dbAdminName ?? undefined,
      dbHost: parsedOptions.dbHost ?? undefined,
      dbPassword: parsedOptions.dbPassword ?? undefined,
      dbPort: parsedOptions.dbPort ?? undefined,
      dbServiceSlug: parsedOptions.dbServiceSlug,
      dbSslmode: parsedOptions.dbSslmode ?? undefined,
      dbUser: parsedOptions.dbUser ?? undefined,
      dockerNetwork: parsedOptions.dockerNetwork,
      dumpFile: parsedOptions.dumpFile ?? undefined,
      environmentName: parsedOptions.environmentName,
      includeSecrets: parsedOptions.includeSecrets,
      inspectJsonPath: parsedOptions.inspectJson,
      operatorServiceSlug: parsedOptions.operatorServiceSlug,
      postgresClientImage: parsedOptions.postgresClientImage,
      projectSlug,
      sourceDbName: parsedOptions.sourceDbName,
      stagingDbName: parsedOptions.stagingDbName ?? undefined,
      templateDbName: parsedOptions.templateDbName ?? undefined,
      templateOwner: parsedOptions.templateOwner ?? undefined,
    }),
  )
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

const addZaneProjectCommand = (
  command: Command,
  environment: z.infer<typeof bootstrapEnvironmentSchema>,
): void => {
  const zaneProject = new Command("zane-project").description(
    "Plan canonical Zane project bootstrap/sync",
  )
  zaneProject
    .command("plan")
    .description("Render the canonical Zane project bootstrap plan")
    .option("--project-slug <slug>")
    .option("--project-description <text>")
    .option(
      "--environment-name <name>",
      "",
      environment.ZANE_ENVIRONMENT_NAME ??
        environment.ZANE_PRODUCTION_ENVIRONMENT_NAME ??
        "production",
    )
    .requiredOption("--inspect-json <path>")
    .option("--phase <services|env|all>", "", "all")
    .option("--repository-url <url>")
    .option("--branch <name>")
    .option("--git-app-id <id>", "", environment.ZANE_GIT_APP_ID ?? "")
    .option(
      "--public-domain <domain>",
      "",
      environment.ZANE_PUBLIC_DOMAIN ?? "",
    )
    .option(
      "--public-url-affix <suffix>",
      "",
      environment.ZANE_PUBLIC_URL_AFFIX ?? "-zane",
    )
    .option(
      "--minio-file-url <url>",
      "",
      environment.ZANE_PUBLIC_MINIO_FILE_URL ?? "",
    )
    .option("--store-cors <value>", "", environment.ZANE_STORE_CORS ?? "")
    .option("--admin-cors <value>", "", environment.ZANE_ADMIN_CORS ?? "")
    .option("--auth-cors <value>", "", environment.ZANE_AUTH_CORS ?? "")
    .option(
      "--operator-upstream-zane-base-url <url>",
      "",
      environment.ZANE_OPERATOR_UPSTREAM_ZANE_BASE_URL ?? "",
    )
    .option(
      "--operator-upstream-zane-connect-base-url <url>",
      "",
      environment.ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL ?? "",
    )
    .option(
      "--operator-upstream-zane-connect-host-header <value>",
      "",
      environment.ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER ?? "",
    )
    .option(
      "--operator-upstream-zane-username <user>",
      "",
      environment.ZANE_OPERATOR_UPSTREAM_ZANE_USERNAME ?? "",
    )
    .option(
      "--operator-upstream-zane-password <password>",
      "",
      environment.ZANE_OPERATOR_UPSTREAM_ZANE_PASSWORD ?? "",
    )
    .option(
      "--stack-manifest-path <path>",
      "",
      environment.STACK_MANIFEST_PATH ?? defaultStackManifestPath,
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      environment.STACK_INPUTS_PATH ?? defaultStackInputsPath,
    )
    .action(executeZaneProjectPlanAction)
  command.addCommand(zaneProject)
}

const addPreviewTemplateDbCommand = (
  command: Command,
  environment: z.infer<typeof bootstrapEnvironmentSchema>,
): void => {
  const previewTemplateDb = new Command("preview-template-db").description(
    "Plan preview template DB refresh/bootstrap",
  )
  previewTemplateDb
    .command("plan")
    .description("Render the preview template DB refresh plan")
    .option("--project-slug <slug>")
    .option(
      "--environment-name <name>",
      "",
      environment.ZANE_ENVIRONMENT_NAME ??
        environment.ZANE_PRODUCTION_ENVIRONMENT_NAME ??
        "production",
    )
    .requiredOption("--inspect-json <path>")
    .option("--db-service-slug <slug>")
    .option("--operator-service-slug <slug>")
    .option(
      "--source-db-name <name>",
      "",
      environment.MEDUSA_APP_DB_NAME ??
        environment.DC_MEDUSA_APP_DB_NAME ??
        "medusa",
    )
    .option("--template-db-name <name>")
    .option("--staging-db-name <name>")
    .option("--template-owner <role>")
    .option("--db-host <host>")
    .option("--db-port <port>")
    .option("--db-user <user>")
    .option("--db-password <password>")
    .option("--db-admin-name <name>")
    .option("--db-sslmode <mode>")
    .option(
      "--docker-network <name>",
      "",
      environment.ZANE_DOCKER_NETWORK ?? "zane",
    )
    .option(
      "--postgres-client-image <image>",
      "",
      environment.ZANE_POSTGRES_CLIENT_IMAGE ?? "postgres:18.1-alpine",
    )
    .option("--dump-file <path>")
    .option("--include-secrets", "", false)
    .action(executePreviewTemplateDbPlanAction)
  command.addCommand(previewTemplateDb)
}

// command setup is a flat list of CLI options mirroring env inputs
export const createBootstrapCommand = (): Command => {
  const environment = getBootstrapEnvironment()
  const command = new Command("bootstrap").description(
    "Bootstrap planning surfaces for local Zane helper flows",
  )

  addZaneProjectCommand(command, environment)
  addPreviewTemplateDbCommand(command, environment)

  return command
}
