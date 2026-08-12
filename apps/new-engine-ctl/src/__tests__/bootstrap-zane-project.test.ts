import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, expect, test, vi } from "vitest"
import { parse } from "yaml"
import { executeBootstrapZaneProjectPlan } from "../orchestration/bootstrap/zane-project.js"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const stackManifestPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-manifest.yaml"
)
const stackInputsPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-inputs.yaml"
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
    "preview-password-secret"
  )
  vi.stubEnv("DC_STOREFRONT_URL", "https://storefront.example.test")
  vi.stubEnv("DC_STORE_NAME", "Herbatika")
  vi.stubEnv(
    "DC_STORE_CORS",
    "http://localhost:3001,https://storefront.example.test/"
  )
  vi.stubEnv("DC_ADMIN_CORS", `http://localhost:5173,${medusaBePublicOrigin}/`)
  vi.stubEnv("DC_AUTH_CORS", "http://127.0.0.1:3001")
  vi.stubEnv("DC_FEATURE_PAYMENT_QR_ENABLED", "1")
  vi.stubEnv(
    "DC_GOPAY_WEBHOOK_URL",
    "http://localhost:9000/hooks/payment/paykit_gopay"
  )
  vi.stubEnv(
    "DC_HERBATICA_REVIEWS_XML_PATH",
    "https://assets.example.test/reviews.xml"
  )
  vi.stubEnv("DC_HERBATIKA_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "")
  vi.stubEnv("DC_MEDUSA_BE_RESEND_FROM_EMAIL", "")
  vi.stubEnv("DC_RESEND_FROM_EMAIL", "noreply@example.test")

  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "new-engine-zane-project-")
  )
  const inspectJsonPath = join(temporaryDirectory, "inspect.json")

  await writeFile(
    inspectJsonPath,
    JSON.stringify({
      project_slug: projectSlug,
      environment_name: "production",
      project_exists: true,
      environment_exists: true,
      settings: {
        root_domain: publicDomain,
        app_domain: `control.${publicDomain}`,
      },
      shared_variables: [],
      services: serviceSlugs.map((serviceSlug) => ({
        service_slug: serviceSlug,
        exists: true,
        details: {
          id: serviceSlug,
          slug: serviceSlug,
          type: "git",
          network_alias: `zn-${serviceSlug}`,
          global_network_alias:
            serviceSlug === "medusa-db" ? "zn-medusa-db.global" : null,
        },
      })),
    }),
    "utf8"
  )

  try {
    const plan = await executeBootstrapZaneProjectPlan({
      projectSlug,
      projectDescription: "Test project",
      environmentName: "production",
      inspectJsonPath,
      repositoryUrl: "https://github.com/example/new-engine.git",
      branchName: "main",
      publicDomain,
      publicUrlAffix,
      stackManifestPath,
      stackInputsPath,
      phase: "env",
    })

    expect(plan.status).toBe("ready")
    expect(plan.services.map((service) => service.service_id)).toEqual(
      serviceSlugs
    )
    expect(plan.services.some((service) => service.service_id === "n1")).toBe(
      false
    )

    const inspectWithN1JsonPath = join(
      temporaryDirectory,
      "inspect-with-n1.json"
    )
    const inspectWithN1 = JSON.parse(
      await readFile(inspectJsonPath, "utf8")
    ) as {
      services: Record<string, unknown>[]
    }
    inspectWithN1.services.push({
      service_slug: "n1",
      exists: true,
      details: {
        id: "n1",
        slug: "n1",
        type: "git",
        network_alias: "zn-n1",
        global_network_alias: null,
      },
    })
    await writeFile(
      inspectWithN1JsonPath,
      JSON.stringify(inspectWithN1),
      "utf8"
    )

    const planWithN1 = await executeBootstrapZaneProjectPlan({
      projectSlug,
      projectDescription: "Test project",
      environmentName: "production",
      inspectJsonPath: inspectWithN1JsonPath,
      repositoryUrl: "https://github.com/example/new-engine.git",
      branchName: "main",
      publicDomain,
      publicUrlAffix,
      stackManifestPath,
      stackInputsPath,
      phase: "env",
    })
    const n1 = planWithN1.services.find(
      (service) => service.service_id === "n1"
    )
    expect(n1).toMatchObject({
      service_slug: "n1",
      dockerfile_path: "./docker/development/n1/Dockerfile",
    })
    expect(n1?.desired_env).not.toHaveProperty(
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
    )
    expect(n1?.desired_env).not.toHaveProperty(
      "NEXT_PUBLIC_MEILISEARCH_API_KEY"
    )
    expect(n1?.cleanup_env_keys).not.toEqual(
      expect.arrayContaining([
        "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_MEILISEARCH_API_KEY",
      ])
    )

    const medusa = plan.services.find(
      (service) => service.service_id === "medusa-be"
    )
    expect(medusa?.desired_env).toMatchObject({
      STOREFRONT_URL: "https://storefront.example.test",
      STORE_NAME: "Herbatika",
      STORE_CORS: `http://localhost:3001,https://storefront.example.test,${herbatikaPublicOrigin}`,
      ADMIN_CORS: `http://localhost:5173,${medusaBePublicOrigin}`,
      AUTH_CORS: `http://127.0.0.1:3001,${medusaBePublicOrigin}`,
      FEATURE_PAYMENT_QR_ENABLED: "1",
      GOPAY_WEBHOOK_URL: `${medusaBePublicOrigin}/hooks/payment/paykit_gopay`,
      HERBATICA_REVIEWS_XML_PATH: "https://assets.example.test/reviews.xml",
      RESEND_FROM_EMAIL: "noreply@example.test",
    })
    expect(medusa?.desired_env).toHaveProperty(
      "WORKFLOW_QUEUE_RUNNER_BATCH_SIZE"
    )
    expect(medusa?.desired_env).toHaveProperty("SENTRY_TRACES_SAMPLE_RATE")
    expect(medusa?.desired_env).not.toHaveProperty("MEILISEARCH_API_KEY")

    const herbatika = plan.services.find(
      (service) => service.service_id === "herbatika"
    )
    expect(herbatika?.desired_env).toMatchObject({
      NEXT_PUBLIC_PPL_WIDGET_API_KEY: "",
    })
    expect(herbatika?.desired_env).not.toHaveProperty(
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
    )
    expect(herbatika?.desired_env).not.toHaveProperty("MEILISEARCH_HOST")
    expect(herbatika?.desired_env).not.toHaveProperty(
      "MEILISEARCH_SEARCH_API_KEY"
    )
    expect(herbatika?.cleanup_env_keys).toEqual(
      expect.arrayContaining([
        "MEILISEARCH_HOST",
        "MEILISEARCH_SEARCH_API_KEY",
        "MEILISEARCH_PRODUCTS_INDEX",
        "MEILISEARCH_CATEGORIES_INDEX",
        "MEILISEARCH_PRODUCERS_INDEX",
      ])
    )

    const compose = parse(
      await readFile(join(repoRoot, "docker-compose.yaml"), "utf8"),
      { merge: true }
    ) as {
      services: Record<string, { environment: Record<string, unknown> }>
    }
    const composeMedusaEnv = compose.services["medusa-be"]?.environment
    const composeHerbatikaEnv = compose.services.herbatika?.environment
    if (!(composeMedusaEnv && composeHerbatikaEnv)) {
      throw new Error("Compose storefront/backend environments are missing.")
    }

    const missingMedusaEnvKeys = Object.keys(composeMedusaEnv).filter(
      (key) =>
        !(
          ["NODE_ENV", "LEGACY_DATABASE_URL", "MEILISEARCH_API_KEY"].includes(
            key
          ) || key in (medusa?.desired_env ?? {})
        )
    )
    const missingHerbatikaEnvKeys = Object.keys(composeHerbatikaEnv).filter(
      (key) =>
        !(
          ["NODE_ENV", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"].includes(key) ||
          key in (herbatika?.desired_env ?? {})
        )
    )

    expect(missingMedusaEnvKeys).toEqual([])
    expect(missingHerbatikaEnvKeys).toEqual([])
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
