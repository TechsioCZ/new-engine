import { Command } from "commander"

import { bootstrapPreviewTemplateDbPlanCommandInputSchema } from "../contracts/bootstrap-preview-template-db.js"
import { bootstrapZaneProjectPlanCommandInputSchema } from "../contracts/bootstrap-zane-project.js"
import { executeBootstrapPreviewTemplateDbPlan } from "../orchestration/bootstrap/preview-template-db.js"
import { executeBootstrapZaneProjectPlan } from "../orchestration/bootstrap/zane-project.js"
import { defaultStackManifestPath } from "../paths.js"

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
    .action(async (options) => {
      const projectSlug =
        options.projectSlug || process.env.ZANE_PROJECT_SLUG || ""
      const result = await executeBootstrapZaneProjectPlan(
        bootstrapZaneProjectPlanCommandInputSchema.parse({
          projectSlug,
          projectDescription:
            options.projectDescription ||
            process.env.ZANE_PROJECT_DESCRIPTION ||
            `${projectSlug} local bootstrap`,
          environmentName: options.environmentName,
          inspectJsonPath: options.inspectJson,
          phase: options.phase,
          repositoryUrl: options.repositoryUrl || undefined,
          branchName: options.branch || undefined,
          gitAppId: options.gitAppId || undefined,
          publicDomain: options.publicDomain || undefined,
          publicUrlAffix: options.publicUrlAffix,
          minioFileUrlOverride: options.minioFileUrl || undefined,
          storeCorsOverride: options.storeCors || undefined,
          adminCorsOverride: options.adminCors || undefined,
          authCorsOverride: options.authCors || undefined,
          operatorUpstreamZaneBaseUrl:
            options.operatorUpstreamZaneBaseUrl || undefined,
          operatorUpstreamZaneConnectBaseUrl:
            options.operatorUpstreamZaneConnectBaseUrl || undefined,
          operatorUpstreamZaneConnectHostHeader:
            options.operatorUpstreamZaneConnectHostHeader || undefined,
          operatorUpstreamZaneUsername:
            options.operatorUpstreamZaneUsername || undefined,
          operatorUpstreamZanePassword:
            options.operatorUpstreamZanePassword || undefined,
          stackManifestPath: options.stackManifestPath,
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
    .option("--db-service-slug <slug>", "", "medusa-db")
    .option("--operator-service-slug <slug>", "", "zane-operator")
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
          projectSlug,
          environmentName: options.environmentName,
          inspectJsonPath: options.inspectJson,
          dbServiceSlug: options.dbServiceSlug,
          operatorServiceSlug: options.operatorServiceSlug,
          sourceDbName: options.sourceDbName,
          templateDbName: options.templateDbName || undefined,
          stagingDbName: options.stagingDbName || undefined,
          templateOwner: options.templateOwner || undefined,
          dbHost: options.dbHost || undefined,
          dbPort: options.dbPort || undefined,
          dbUser: options.dbUser || undefined,
          dbPassword: options.dbPassword || undefined,
          dbAdminName: options.dbAdminName || undefined,
          dbSslmode: options.dbSslmode || undefined,
          dockerNetwork: options.dockerNetwork,
          postgresClientImage: options.postgresClientImage,
          dumpFile: options.dumpFile || undefined,
          includeSecrets: Boolean(options.includeSecrets),
        })
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })
  command.addCommand(previewTemplateDb)

  return command
}
