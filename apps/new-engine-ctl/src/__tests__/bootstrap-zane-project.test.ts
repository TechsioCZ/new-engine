import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, expect, test, vi } from "vitest"
import { parse } from "yaml"
import {
  executeBootstrapZaneProjectPlan,
  resolveTurnstileDeploymentConfig,
} from "../orchestration/bootstrap/zane-project.js"

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
const minioPublicOrigin = `https://${projectSlug}-medusa-minio${publicUrlAffix}.${publicDomain}`
const herbatikaPreviewDomains = [
  "test-engine-herbatika-zane.web-revolution.cz",
  "test-engine-herbatika-sk-zane.web-revolution.cz",
  "test-engine-herbatika-ro-zane.web-revolution.cz",
  "test-engine-herbatika-cz-zane.web-revolution.cz",
  "test-engine-herbatika-hu-zane.web-revolution.cz",
]
const herbatikaPreviewOrigins = herbatikaPreviewDomains.map(
  (domain) => `https://${domain}`
)
const marketAcceptedHostnames = {
  CZ: "herbatica.cz,www.herbatica.cz,test-engine-herbatika-cz-zane.web-revolution.cz",
  HU: "herbatica.hu,www.herbatica.hu,test-engine-herbatika-hu-zane.web-revolution.cz",
  RO: "herbatica.ro,www.herbatica.ro,test-engine-herbatika-ro-zane.web-revolution.cz",
  SK: "herbatica.sk,www.herbatica.sk,test-engine-herbatika-zane.web-revolution.cz,test-engine-herbatika-sk-zane.web-revolution.cz",
} as const
const turnstileAllowedHostnames = [
  marketAcceptedHostnames.SK,
  marketAcceptedHostnames.CZ,
  marketAcceptedHostnames.HU,
  marketAcceptedHostnames.RO,
].join(",")
const turnstileAuthorityMismatchPattern = /single backend\/frontend authority/
const herbatikaAdditionalUrls = herbatikaPreviewDomains.map((domain) => ({
  associated_port: 3000,
  base_path: "/",
  domain,
  strip_prefix: true,
}))
const marketValuePrefixes = [
  "MARKET_PUBLISHABLE_KEY",
  "MARKET_PUBLISHABLE_KEY_ID",
  "MARKET_REGION",
  "MARKET_SALES_CHANNEL",
] as const

function stubFourMarketDeploymentConfig() {
  vi.stubEnv("DC_HERBATIKA_ALLOWED_MARKETS", "sk,cz,hu,ro")
  for (const [market, hostnames] of Object.entries(marketAcceptedHostnames)) {
    vi.stubEnv(`DC_HERBATIKA_MARKET_ACCEPTED_HOSTS_${market}`, hostnames)
    for (const prefix of marketValuePrefixes) {
      vi.stubEnv(
        `DC_HERBATIKA_${prefix}_${market}`,
        `${prefix.toLowerCase()}-${market.toLowerCase()}`
      )
    }
  }
}

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

test("Turnstile deployment config rejects frontend/backend enablement drift", () => {
  expect(() =>
    resolveTurnstileDeploymentConfig({
      DC_CLOUDFLARE_TURNSTILE_ENABLED: "1",
      DC_HERBATIKA_NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_ENABLED: "0",
    })
  ).toThrow(turnstileAuthorityMismatchPattern)
})

test("Turnstile derives its authority from enabled market host bindings", () => {
  expect(
    resolveTurnstileDeploymentConfig({
      DC_CLOUDFLARE_TURNSTILE_ENABLED: "1",
      DC_HERBATIKA_ALLOWED_MARKETS: "sk,ro",
      DC_HERBATIKA_MARKET_ACCEPTED_HOSTS_RO: marketAcceptedHostnames.RO,
      DC_HERBATIKA_MARKET_ACCEPTED_HOSTS_SK: marketAcceptedHostnames.SK,
    })
  ).toEqual({
    allowedHostnames: [
      marketAcceptedHostnames.SK,
      marketAcceptedHostnames.RO,
    ].join(","),
    enabled: "1",
  })
})

test("project sync manages Herbatika and current Medusa runtime envs", async () => {
  stubFourMarketDeploymentConfig()
  vi.stubEnv("DC_ZANE_OPERATOR_ZANE_USERNAME", "admin")
  vi.stubEnv("DC_ZANE_OPERATOR_ZANE_PASSWORD", "password")
  vi.stubEnv("DC_ZANE_OPERATOR_API_AUTH_TOKEN", "operator-token")
  vi.stubEnv("DC_ZANE_OPERATOR_PGPASSWORD", "operator-db-password")
  vi.stubEnv(
    "DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET",
    "preview-password-secret"
  )
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
  vi.stubEnv("DC_CLOUDFLARE_TURNSTILE_ENABLED", "1")
  vi.stubEnv(
    "DC_HERBATIKA_NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY",
    "turnstile-site-key"
  )
  vi.stubEnv("DC_HERBATIKA_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "")

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
    expect(plan.shared_env_cleanup_keys).toEqual(
      expect.arrayContaining([
        "URL_PRODUCT_RESOLVER_ENABLED",
        "URL_ARCHITECTURE_M00_ENABLED",
      ])
    )
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
    expect(n1?.desired_env).not.toHaveProperty("RESEND_API_KEY")
    expect(n1?.desired_env).not.toHaveProperty("CONTACT_EMAIL")
    expect(n1?.desired_env).not.toHaveProperty("RESEND_FROM_EMAIL")
    expect(n1?.cleanup_env_keys).toEqual(
      expect.arrayContaining([
        "RESEND_API_KEY",
        "CONTACT_EMAIL",
        "RESEND_FROM_EMAIL",
      ])
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
      CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES: turnstileAllowedHostnames,
      CLOUDFLARE_TURNSTILE_ENABLED: "1",
      ADMIN_CORS: `http://localhost:5173,${medusaBePublicOrigin}`,
      FEATURE_PAYMENT_QR_ENABLED: "1",
      GOPAY_WEBHOOK_URL: `${medusaBePublicOrigin}/hooks/payment/paykit_gopay`,
      HERBATICA_REVIEWS_XML_PATH: "https://assets.example.test/reviews.xml",
      MINIO_FILE_URL: `${minioPublicOrigin}/{{env.MEDUSA_MINIO_BUCKET}}`,
      URL_REGISTRY_CONTENT_PROJECTION_ENABLED:
        "{{env.URL_REGISTRY_CONTENT_PROJECTION_ENABLED}}",
      URL_REGISTRY_CONTENT_PROJECTION_TOKEN:
        "{{env.URL_REGISTRY_CONTENT_PROJECTION_TOKEN}}",
      URL_REGISTRY_CONTENT_PROJECTION_URL:
        "{{env.URL_REGISTRY_CONTENT_PROJECTION_URL}}",
      URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN:
        "{{env.URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN}}",
      URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE:
        "{{env.URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE}}",
      URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED:
        "{{env.URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED}}",
      URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN:
        "{{env.URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN}}",
    })
    const expectedMarketOrigins = turnstileAllowedHostnames
      .split(",")
      .map((hostname) => `https://${hostname}`)
    expect(new Set(medusa?.desired_env.STORE_CORS?.split(","))).toEqual(
      new Set([
        "http://localhost:3001",
        "https://storefront.example.test",
        herbatikaPublicOrigin,
        ...herbatikaPreviewOrigins,
        ...expectedMarketOrigins,
      ])
    )
    expect(new Set(medusa?.desired_env.AUTH_CORS?.split(","))).toEqual(
      new Set([
        "http://127.0.0.1:3001",
        medusaBePublicOrigin,
        ...herbatikaPreviewOrigins,
        ...expectedMarketOrigins,
      ])
    )
    expect(medusa?.desired_env).toHaveProperty(
      "WORKFLOW_QUEUE_RUNNER_BATCH_SIZE"
    )
    expect(medusa?.desired_env).toHaveProperty("SENTRY_TRACES_SAMPLE_RATE")
    expect(medusa?.desired_env).not.toHaveProperty("MEILISEARCH_API_KEY")
    expect(medusa?.desired_env).not.toHaveProperty("RESEND_API_KEY")
    expect(medusa?.desired_env).not.toHaveProperty("RESEND_FROM_EMAIL")
    expect(medusa?.desired_env).not.toHaveProperty("RESEND_WEBHOOK_SECRET")
    expect(medusa?.desired_env).not.toHaveProperty("STOREFRONT_URL")
    expect(medusa?.desired_env).not.toHaveProperty("STORE_NAME")
    expect(medusa?.desired_env).not.toHaveProperty(
      "PRODUCT_REVIEW_REQUEST_MESSAGE"
    )
    expect(medusa?.cleanup_env_keys).toEqual(
      expect.arrayContaining([
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "RESEND_WEBHOOK_SECRET",
        "DC_STOREFRONT_URL",
        "DC_STORE_NAME",
        "DC_PRODUCT_REVIEW_REQUEST_MESSAGE",
      ])
    )

    const minio = plan.services.find(
      (service) => service.service_id === "medusa-minio"
    )
    expect(minio?.desired_urls).toEqual([
      {
        associated_port: 9004,
        base_path: "/",
        domain: `${projectSlug}-medusa-minio${publicUrlAffix}.${publicDomain}`,
        strip_prefix: true,
      },
    ])

    const payload = plan.services.find(
      (service) => service.service_id === "payload"
    )
    expect(payload?.desired_env).toMatchObject({
      PAYLOAD_LOCALES: "cs,sk,hu,ro",
    })

    const herbatika = plan.services.find(
      (service) => service.service_id === "herbatika"
    )
    expect(herbatika?.desired_urls).toEqual(
      expect.arrayContaining([
        {
          associated_port: 3000,
          base_path: "/",
          domain: `${projectSlug}-herbatika${publicUrlAffix}.${publicDomain}`,
          strip_prefix: true,
        },
        ...herbatikaAdditionalUrls,
      ])
    )
    expect(new Set(herbatika?.desired_urls.map((url) => url.domain))).toEqual(
      new Set([
        `${projectSlug}-herbatika${publicUrlAffix}.${publicDomain}`,
        ...turnstileAllowedHostnames.split(","),
      ])
    )
    expect(new Set(herbatika?.desired_urls.map((url) => url.domain)).size).toBe(
      herbatika?.desired_urls.length
    )
    expect(herbatika?.desired_healthcheck).toEqual({
      type: "COMMAND",
      value: `curl -fsS -H 'Host: ${projectSlug}-herbatika${publicUrlAffix}.${publicDomain}' http://127.0.0.1:3000/api/healthz`,
      timeout_seconds: 120,
      interval_seconds: 30,
    })
    expect(herbatika?.desired_env).not.toHaveProperty(
      "NEXT_PUBLIC_PPL_WIDGET_API_KEY"
    )
    expect(herbatika?.desired_env).not.toHaveProperty(
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
    )
    expect(herbatika?.desired_env).toMatchObject({
      ALLOWED_MARKETS: "{{env.ALLOWED_MARKETS}}",
      HERBATIKA_CMS_STATIC_PAGE_IDS: "{{env.HERBATIKA_CMS_STATIC_PAGE_IDS}}",
      MARKET_ACCEPTED_HOSTS_SK: "{{env.MARKET_ACCEPTED_HOSTS_SK}}",
      MARKET_ACCEPTED_HOSTS_CZ: "{{env.MARKET_ACCEPTED_HOSTS_CZ}}",
      MARKET_ACCEPTED_HOSTS_HU: "{{env.MARKET_ACCEPTED_HOSTS_HU}}",
      MARKET_ACCEPTED_HOSTS_RO: "{{env.MARKET_ACCEPTED_HOSTS_RO}}",
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_ENABLED: "1",
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: "turnstile-site-key",
      NEXT_PUBLIC_MINIO_FILE_URL: minioPublicOrigin,
      URL_ARCHITECTURE_ENABLED: "{{env.URL_ARCHITECTURE_ENABLED}}",
      URL_REGISTRY_COMMANDS_ENABLED: "{{env.URL_REGISTRY_COMMANDS_ENABLED}}",
      URL_REGISTRY_CONTENT_PROJECTION_ENABLED:
        "{{env.URL_REGISTRY_CONTENT_PROJECTION_ENABLED}}",
      URL_REGISTRY_CONTENT_PROJECTION_TOKEN:
        "{{env.URL_REGISTRY_CONTENT_PROJECTION_TOKEN}}",
      URL_REGISTRY_DATABASE_URL: "{{env.URL_REGISTRY_DATABASE_URL}}",
      URL_REGISTRY_ENABLED: "{{env.URL_REGISTRY_ENABLED}}",
      URL_REGISTRY_INVALIDATION_ENABLED:
        "{{env.URL_REGISTRY_INVALIDATION_ENABLED}}",
      URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED:
        "{{env.URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED}}",
      URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN:
        "{{env.URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN}}",
      URL_REGISTRY_INVALIDATION_TOKEN:
        "{{env.URL_REGISTRY_INVALIDATION_TOKEN}}",
      URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED:
        "{{env.URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED}}",
      URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN:
        "{{env.URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN}}",
    })
    expect(herbatika?.desired_env).not.toHaveProperty(
      "URL_PRODUCT_RESOLVER_ENABLED"
    )
    expect(herbatika?.desired_env).not.toHaveProperty(
      "URL_ARCHITECTURE_M00_ENABLED"
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
        "URL_PRODUCT_RESOLVER_ENABLED",
        "URL_ARCHITECTURE_M00_ENABLED",
        "HERBATIKA_ACCEPTED_HOSTS_SK",
        "HERBATIKA_ACCEPTED_HOSTS_CZ",
        "HERBATIKA_ACCEPTED_HOSTS_HU",
        "HERBATIKA_ACCEPTED_HOSTS_RO",
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

    expect(composeHerbatikaEnv).not.toHaveProperty(
      "URL_PRODUCT_RESOLVER_ENABLED"
    )
    expect(composeHerbatikaEnv).not.toHaveProperty(
      "URL_ARCHITECTURE_M00_ENABLED"
    )

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

    const productionCompose = await readFile(
      join(repoRoot, "docker-compose.prod.yaml"),
      "utf8"
    )
    expect(productionCompose).toContain(
      "NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: $" +
        "{DC_HERBATIKA_NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY:-}"
    )
    expect(productionCompose).toContain(
      'curl -fsS -H "Host: $$host" http://127.0.0.1:3000/api/healthz'
    )
    for (const market of ["SK", "CZ", "HU", "RO"]) {
      expect(productionCompose).toContain(
        `host=$${"${"}MARKET_ACCEPTED_HOSTS_${market}%%,*}`
      )
    }

    const missingMarketVariables = [
      "DC_HERBATIKA_MARKET_ACCEPTED_HOSTS_SK",
      "DC_HERBATIKA_MARKET_PUBLISHABLE_KEY_CZ",
      "DC_HERBATIKA_MARKET_PUBLISHABLE_KEY_ID_HU",
      "DC_HERBATIKA_MARKET_REGION_RO",
      "DC_HERBATIKA_MARKET_SALES_CHANNEL_SK",
    ]
    for (const environmentVariable of missingMarketVariables) {
      vi.stubEnv(environmentVariable, "")
    }
    const blockedPlan = await executeBootstrapZaneProjectPlan({
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
    expect(blockedPlan.status).toBe("blocked")
    expect(blockedPlan.blocking_reasons).toEqual(
      expect.arrayContaining(
        missingMarketVariables.map(
          (environmentVariable) =>
            `${environmentVariable} could not be resolved for bootstrap.`
        )
      )
    )
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})

test("Herbatika healthcheck fails closed without a public runtime domain", async () => {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "new-engine-zane-project-no-domain-")
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
        root_domain: null,
        app_domain: null,
      },
      shared_variables: [],
      services: serviceSlugs.map((serviceSlug) => ({
        service_slug: serviceSlug,
        exists: true,
        details: {
          id: serviceSlug,
          slug: serviceSlug,
          type: "git",
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
      publicUrlAffix,
      stackManifestPath,
      stackInputsPath,
      phase: "services",
    })
    const herbatika = plan.services.find(
      (service) => service.service_id === "herbatika"
    )

    expect(plan.status).toBe("blocked")
    expect(plan.blocking_reasons).toContain(
      "Public domain could not be derived from input or Zane settings."
    )
    expect(herbatika?.desired_urls).toEqual(herbatikaAdditionalUrls)
    expect(herbatika?.desired_healthcheck).toEqual({
      type: "COMMAND",
      value: "sh -lc 'exit 1'",
      timeout_seconds: 120,
      interval_seconds: 30,
    })
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})

test("Herbatika healthcheck rejects an unsafe derived Host header", async () => {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "new-engine-zane-project-invalid-domain-")
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
        root_domain: null,
        app_domain: null,
      },
      shared_variables: [],
      services: serviceSlugs.map((serviceSlug) => ({
        service_slug: serviceSlug,
        exists: true,
        details: {
          id: serviceSlug,
          slug: serviceSlug,
          type: "git",
        },
      })),
    }),
    "utf8"
  )

  try {
    await expect(
      executeBootstrapZaneProjectPlan({
        projectSlug,
        projectDescription: "Test project",
        environmentName: "production",
        inspectJsonPath,
        repositoryUrl: "https://github.com/example/new-engine.git",
        branchName: "main",
        publicDomain: "example.test'; exit 0; #",
        publicUrlAffix,
        stackManifestPath,
        stackInputsPath,
        phase: "services",
      })
    ).rejects.toThrow(
      'Derived Herbatika public service domain is not a valid DNS hostname: "example-project-herbatika-deploy.example.test\'; exit 0; #".'
    )
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
