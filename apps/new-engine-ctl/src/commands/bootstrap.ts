import { Command } from "commander"

import { bootstrapPreviewTemplateDbPlanCommandInputSchema } from "../contracts/bootstrap-preview-template-db.js"
import { bootstrapZaneProjectPlanCommandInputSchema } from "../contracts/bootstrap-zane-project.js"
import { executeBootstrapPreviewTemplateDbPlan } from "../orchestration/bootstrap/preview-template-db.js"
import { executeBootstrapZaneProjectPlan } from "../orchestration/bootstrap/zane-project.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

// command setup is a flat list of CLI options mirroring env inputs
export function createBootstrapCommand(): Command {
  const command = new Command("bootstrap").description(
    "Bootstrap planning surfaces for local Zane helper flows"
  )

  const zaneProject = new Command("zane-project").description(
    "Plan canonical Zane project bootstrap/sync"
  )
  zaneProject
    .command("plan")
    .description("Render the canonical Zane project bootstrap plan")
    .option("--project-slug <slug>")
    .option("--project-description <text>")
    .option(
      "--environment-name <name>",
      "",
      process.env.ZANE_ENVIRONMENT_NAME ??
        process.env.ZANE_PRODUCTION_ENVIRONMENT_NAME ??
        "production"
    )
    .requiredOption("--inspect-json <path>")
    .option("--phase <services|env|all>", "", "all")
    .option("--repository-url <url>")
    .option("--branch <name>")
    .option("--git-app-id <id>", "", process.env.ZANE_GIT_APP_ID ?? "")
    .option(
      "--public-domain <domain>",
      "",
      process.env.ZANE_PUBLIC_DOMAIN ?? ""
    )
    .option(
      "--public-url-affix <suffix>",
      "",
      process.env.ZANE_PUBLIC_URL_AFFIX ?? "-zane"
    )
    .option(
      "--minio-file-url <url>",
      "",
      process.env.ZANE_PUBLIC_MINIO_FILE_URL ?? ""
    )
    .option("--store-cors <value>", "", process.env.ZANE_STORE_CORS ?? "")
    .option("--admin-cors <value>", "", process.env.ZANE_ADMIN_CORS ?? "")
    .option("--auth-cors <value>", "", process.env.ZANE_AUTH_CORS ?? "")
    .option(
      "--operator-upstream-zane-base-url <url>",
      "",
      process.env.ZANE_OPERATOR_UPSTREAM_ZANE_BASE_URL ?? ""
    )
    .option(
      "--operator-upstream-zane-connect-base-url <url>",
      "",
      process.env.ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL ?? ""
    )
    .option(
      "--operator-upstream-zane-connect-host-header <value>",
      "",
      process.env.ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER ?? ""
    )
    .option(
      "--operator-upstream-zane-username <user>",
      "",
      process.env.ZANE_OPERATOR_UPSTREAM_ZANE_USERNAME ?? ""
    )
    .option(
      "--operator-upstream-zane-password <password>",
      "",
      process.env.ZANE_OPERATOR_UPSTREAM_ZANE_PASSWORD ?? ""
    )
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      process.env.STACK_INPUTS_PATH ?? defaultStackInputsPath
    )
    .action(async (options) => {
      const projectSlug =
        options.projectSlug || process.env.ZANE_PROJECT_SLUG || ""
      const result = await executeBootstrapZaneProjectPlan(
        bootstrapZaneProjectPlanCommandInputSchema.parse({
          adminCorsOverride: options.adminCors || undefined,
          authCorsOverride: options.authCors || undefined,
          branchName: options.branch || undefined,
          environmentName: options.environmentName,
          gitAppId: options.gitAppId || undefined,
          inspectJsonPath: options.inspectJson,
          minioFileUrlOverride: options.minioFileUrl || undefined,
          operatorUpstreamZaneBaseUrl:
            options.operatorUpstreamZaneBaseUrl || undefined,
          operatorUpstreamZaneConnectBaseUrl:
            options.operatorUpstreamZaneConnectBaseUrl || undefined,
          operatorUpstreamZaneConnectHostHeader:
            options.operatorUpstreamZaneConnectHostHeader || undefined,
          operatorUpstreamZanePassword:
            options.operatorUpstreamZanePassword || undefined,
          operatorUpstreamZaneUsername:
            options.operatorUpstreamZaneUsername || undefined,
          phase: options.phase,
          projectDescription:
            options.projectDescription ||
            process.env.ZANE_PROJECT_DESCRIPTION ||
            `${projectSlug} local bootstrap`,
          projectSlug,
          publicDomain: options.publicDomain || undefined,
          publicUrlAffix: options.publicUrlAffix,
          repositoryUrl: options.repositoryUrl || undefined,
          stackInputsPath: options.stackInputsPath,
          stackManifestPath: options.stackManifestPath,
          storeCorsOverride: options.storeCors || undefined,
        })
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })
  command.addCommand(zaneProject)

  const previewTemplateDb = new Command("preview-template-db").description(
    "Plan preview template DB refresh/bootstrap"
  )
  previewTemplateDb
    .command("plan")
    .description("Render the preview template DB refresh plan")
    .option("--project-slug <slug>")
    .option(
      "--environment-name <name>",
      "",
      process.env.ZANE_ENVIRONMENT_NAME ??
        process.env.ZANE_PRODUCTION_ENVIRONMENT_NAME ??
        "production"
    )
    .requiredOption("--inspect-json <path>")
    .option("--db-service-slug <slug>")
    .option("--operator-service-slug <slug>")
    .option(
      "--source-db-name <name>",
      "",
      process.env.MEDUSA_APP_DB_NAME ??
        process.env.DC_MEDUSA_APP_DB_NAME ??
        "medusa"
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
      process.env.ZANE_DOCKER_NETWORK ?? "zane"
    )
    .option(
      "--postgres-client-image <image>",
      "",
      process.env.ZANE_POSTGRES_CLIENT_IMAGE ?? "postgres:18.1-alpine"
    )
    .option("--dump-file <path>")
    .option("--include-secrets", "", false)
    .action(async (options) => {
      const projectSlug =
        options.projectSlug || process.env.ZANE_PROJECT_SLUG || ""
      const result = await executeBootstrapPreviewTemplateDbPlan(
        bootstrapPreviewTemplateDbPlanCommandInputSchema.parse({
          dbAdminName: options.dbAdminName || undefined,
          dbHost: options.dbHost || undefined,
          dbPassword: options.dbPassword || undefined,
          dbPort: options.dbPort || undefined,
          dbServiceSlug: options.dbServiceSlug,
          dbSslmode: options.dbSslmode || undefined,
          dbUser: options.dbUser || undefined,
          dockerNetwork: options.dockerNetwork,
          dumpFile: options.dumpFile || undefined,
          environmentName: options.environmentName,
          includeSecrets: Boolean(options.includeSecrets),
          inspectJsonPath: options.inspectJson,
          operatorServiceSlug: options.operatorServiceSlug,
          postgresClientImage: options.postgresClientImage,
          projectSlug,
          sourceDbName: options.sourceDbName,
          stagingDbName: options.stagingDbName || undefined,
          templateDbName: options.templateDbName || undefined,
          templateOwner: options.templateOwner || undefined,
        })
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })
  command.addCommand(previewTemplateDb)

  return command
}
