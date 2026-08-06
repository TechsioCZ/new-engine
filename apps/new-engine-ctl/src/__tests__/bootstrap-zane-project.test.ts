import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import nodePath from "node:path"

import { describe, afterEach, expect, test, vi } from "vitest"
import { parse } from "yaml"
import { z } from "zod"

import { executeBootstrapZaneProjectPlan } from "../orchestration/bootstrap/zane-project.js"

const composeServiceSchema = z.object({
  environment: z.record(z.string(), z.unknown()),
})
const composeSchema = z.object({
  services: z.looseObject({
    herbatika: composeServiceSchema,
    "medusa-be": composeServiceSchema,
  }),
})
const inspectServicesSchema = z.looseObject({
  services: z.array(z.record(z.string(), z.unknown())),
})

describe("bootstrap-zane-project", () => {
  const repoRoot = nodePath.resolve(import.meta.dirname, "../../../..")
  const stackManifestPath = nodePath.join(
    repoRoot,
    "apps/new-engine-ctl/config/stack-manifest.yaml",
  )
  const stackInputsPath = nodePath.join(
    repoRoot,
    "apps/new-engine-ctl/config/stack-inputs.yaml",
  )
  const projectSlug = "example-project"
  const publicDomain = "example.test"
  const publicUrlAffix = "-deploy"
  const medusaBePublicOrigin = `https://${projectSlug}-medusa-be${publicUrlAffix}.${publicDomain}`
  const herbatikaPublicOrigin = `https://${projectSlug}-herbatika${publicUrlAffix}.${publicDomain}`

  const serviceSlugs = [
    "medusa-db",
    "medusa-valkey",
    "medusa-minio",
    "medusa-meilisearch",
    "medusa-be",
    "payload",
    "herbatika",
    "zane-operator",
  ]
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test("project sync manages Herbatika and current Medusa runtime envs", async () => {
    vi.stubEnv("DC_ZANE_OPERATOR_ZANE_USERNAME", "admin")
    vi.stubEnv("DC_ZANE_OPERATOR_ZANE_PASSWORD", "password")
    vi.stubEnv("DC_ZANE_OPERATOR_API_AUTH_TOKEN", "operator-token")
    vi.stubEnv("DC_ZANE_OPERATOR_PGPASSWORD", "operator-db-password")
    vi.stubEnv(
      "DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET",
      "preview-password-secret",
    )
    vi.stubEnv("DC_STOREFRONT_URL", "https://storefront.example.test")
    vi.stubEnv("DC_STORE_NAME", "Herbatika")
    vi.stubEnv(
      "DC_STORE_CORS",
      "http://localhost:3001,https://storefront.example.test/",
    )
    vi.stubEnv(
      "DC_ADMIN_CORS",
      `http://localhost:5173,${medusaBePublicOrigin}/`,
    )
    vi.stubEnv("DC_AUTH_CORS", "http://127.0.0.1:3001")
    vi.stubEnv("DC_FEATURE_PAYMENT_QR_ENABLED", "1")
    vi.stubEnv(
      "DC_GOPAY_WEBHOOK_URL",
      "http://localhost:9000/hooks/payment/paykit_gopay",
    )
    vi.stubEnv(
      "DC_HERBATICA_REVIEWS_XML_PATH",
      "https://assets.example.test/reviews.xml",
    )
    vi.stubEnv("DC_HERBATIKA_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "")
    vi.stubEnv("DC_MEDUSA_BE_RESEND_FROM_EMAIL", "")
    vi.stubEnv("DC_RESEND_FROM_EMAIL", "noreply@example.test")

    const temporaryDirectory = await mkdtemp(
      nodePath.join(tmpdir(), "new-engine-zane-project-"),
    )
    const inspectJsonPath = nodePath.join(temporaryDirectory, "inspect.json")

    await writeFile(
      inspectJsonPath,
      JSON.stringify({
        environment_exists: true,
        environment_name: "production",
        project_exists: true,
        project_slug: projectSlug,
        services: serviceSlugs.map((serviceSlug) => ({
          details: {
            global_network_alias:
              serviceSlug === "medusa-db" ? "zn-medusa-db.global" : null,
            id: serviceSlug,
            network_alias: `zn-${serviceSlug}`,
            slug: serviceSlug,
            type: "git",
          },
          exists: true,
          service_slug: serviceSlug,
        })),
        settings: {
          app_domain: `control.${publicDomain}`,
          root_domain: publicDomain,
        },
        shared_variables: [],
      }),
      "utf-8",
    )

    try {
      const plan = await executeBootstrapZaneProjectPlan({
        branchName: "main",
        environmentName: "production",
        inspectJsonPath,
        phase: "env",
        projectDescription: "Test project",
        projectSlug,
        publicDomain,
        publicUrlAffix,
        repositoryUrl: "https://github.com/example/new-engine.git",
        stackInputsPath,
        stackManifestPath,
      })

      expect(plan.status).toBe("ready")
      expect(plan.services.map((service) => service.service_id)).toStrictEqual(
        serviceSlugs,
      )
      expect(
        plan.services.some((service) => service.service_id === "n1"),
      ).toBeFalsy()

      const inspectWithN1JsonPath = nodePath.join(
        temporaryDirectory,
        "inspect-with-n1.json",
      )
      const inspectWithN1 = inspectServicesSchema.parse(
        JSON.parse(await readFile(inspectJsonPath, "utf-8")),
      )
      inspectWithN1.services.push({
        details: {
          global_network_alias: null,
          id: "n1",
          network_alias: "zn-n1",
          slug: "n1",
          type: "git",
        },
        exists: true,
        service_slug: "n1",
      })
      await writeFile(
        inspectWithN1JsonPath,
        JSON.stringify(inspectWithN1),
        "utf-8",
      )

      const planWithN1 = await executeBootstrapZaneProjectPlan({
        branchName: "main",
        environmentName: "production",
        inspectJsonPath: inspectWithN1JsonPath,
        phase: "env",
        projectDescription: "Test project",
        projectSlug,
        publicDomain,
        publicUrlAffix,
        repositoryUrl: "https://github.com/example/new-engine.git",
        stackInputsPath,
        stackManifestPath,
      })
      const n1 = planWithN1.services.find(
        (service) => service.service_id === "n1",
      )
      const medusa = plan.services.find(
        (service) => service.service_id === "medusa-be",
      )
      const herbatika = plan.services.find(
        (service) => service.service_id === "herbatika",
      )
      const n1DesiredEnvKeys = new Set(Object.keys(n1?.desired_env ?? {}))
      const n1CleanupEnvKeys = new Set(n1?.cleanup_env_keys)
      const medusaDesiredEnvKeys = new Set(
        Object.keys(medusa?.desired_env ?? {}),
      )
      const herbatikaDesiredEnvKeys = new Set(
        Object.keys(herbatika?.desired_env ?? {}),
      )
      const herbatikaCleanupEnvKeys = new Set(herbatika?.cleanup_env_keys)

      expect({
        herbatika,
        herbatikaCleanupIncludesMeiliKeys: [
          "MEILISEARCH_HOST",
          "MEILISEARCH_SEARCH_API_KEY",
          "MEILISEARCH_PRODUCTS_INDEX",
          "MEILISEARCH_CATEGORIES_INDEX",
          "MEILISEARCH_PRODUCERS_INDEX",
        ].every((key) => herbatikaCleanupEnvKeys.has(key)),
        herbatikaHasMedusaKey: herbatikaDesiredEnvKeys.has(
          "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
        ),
        herbatikaHasMeiliHost: herbatikaDesiredEnvKeys.has("MEILISEARCH_HOST"),
        herbatikaHasMeiliSearchKey: herbatikaDesiredEnvKeys.has(
          "MEILISEARCH_SEARCH_API_KEY",
        ),
        medusa,
        medusaHasMeiliKey: medusaDesiredEnvKeys.has("MEILISEARCH_API_KEY"),
        medusaHasQueueBatchSize: medusaDesiredEnvKeys.has(
          "WORKFLOW_QUEUE_RUNNER_BATCH_SIZE",
        ),
        medusaHasSentrySampleRate: medusaDesiredEnvKeys.has(
          "SENTRY_TRACES_SAMPLE_RATE",
        ),
        n1,
        n1CleanupIncludesProviderKeys: [
          "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
          "NEXT_PUBLIC_MEILISEARCH_API_KEY",
        ].every((key) => n1CleanupEnvKeys.has(key)),
        n1HasMedusaKey: n1DesiredEnvKeys.has(
          "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
        ),
        n1HasMeiliKey: n1DesiredEnvKeys.has("NEXT_PUBLIC_MEILISEARCH_API_KEY"),
      }).toMatchObject({
        herbatika: {
          desired_env: { NEXT_PUBLIC_PPL_WIDGET_API_KEY: "" },
        },
        herbatikaCleanupIncludesMeiliKeys: true,
        herbatikaHasMedusaKey: false,
        herbatikaHasMeiliHost: false,
        herbatikaHasMeiliSearchKey: false,
        medusa: {
          desired_env: {
            ADMIN_CORS: `http://localhost:5173,${medusaBePublicOrigin}`,
            AUTH_CORS: `http://127.0.0.1:3001,${medusaBePublicOrigin}`,
            FEATURE_PAYMENT_QR_ENABLED: "1",
            GOPAY_WEBHOOK_URL: `${medusaBePublicOrigin}/hooks/payment/paykit_gopay`,
            HERBATICA_REVIEWS_XML_PATH:
              "https://assets.example.test/reviews.xml",
            RESEND_FROM_EMAIL: "noreply@example.test",
            STOREFRONT_URL: "https://storefront.example.test",
            STORE_CORS: `http://localhost:3001,https://storefront.example.test,${herbatikaPublicOrigin}`,
            STORE_NAME: "Herbatika",
          },
        },
        medusaHasMeiliKey: false,
        medusaHasQueueBatchSize: true,
        medusaHasSentrySampleRate: true,
        n1: {
          dockerfile_path: "./docker/development/n1/Dockerfile",
          service_slug: "n1",
        },
        n1CleanupIncludesProviderKeys: false,
        n1HasMedusaKey: false,
        n1HasMeiliKey: false,
      })

      const compose = composeSchema.parse(
        parse(
          await readFile(
            nodePath.join(repoRoot, "docker-compose.yaml"),
            "utf-8",
          ),
          { merge: true },
        ),
      )
      const composeMedusaEnv = compose.services["medusa-be"]?.environment
      const composeHerbatikaEnv = compose.services.herbatika?.environment
      const missingMedusaEnvKeys = Object.keys(composeMedusaEnv).filter(
        (key) =>
          !(
            ["NODE_ENV", "LEGACY_DATABASE_URL", "MEILISEARCH_API_KEY"].includes(
              key,
            ) || key in (medusa?.desired_env ?? {})
          ),
      )
      const missingHerbatikaEnvKeys = Object.keys(composeHerbatikaEnv).filter(
        (key) =>
          !(
            ["NODE_ENV", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"].includes(key) ||
            key in (herbatika?.desired_env ?? {})
          ),
      )

      expect({ missingHerbatikaEnvKeys, missingMedusaEnvKeys }).toStrictEqual({
        missingHerbatikaEnvKeys: [],
        missingMedusaEnvKeys: [],
      })
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true })
    }
  })
})
