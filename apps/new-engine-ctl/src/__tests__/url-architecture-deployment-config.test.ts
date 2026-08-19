import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"
import {
  getBootstrapZaneProjectSharedEnvDefinitions,
  getPreviewServiceEnvDefinitions,
} from "../contracts/stack-inputs.js"
import { loadDeployContracts } from "../orchestration/deploy-inputs.js"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const stackManifestPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-manifest.yaml"
)
const stackInputsPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-inputs.yaml"
)
const dockerEnvPath = join(repoRoot, ".env.docker")
const dockerCaddyfilePath = join(
  repoRoot,
  "apps/herbatika/tests/wire/m00/Caddyfile"
)
const dockerCaddyImagePath = join(
  repoRoot,
  "docker/development/caddy/Dockerfile"
)
const herbatikaDockerImagePath = join(
  repoRoot,
  "docker/development/herbatika/Dockerfile"
)
const herbatikaPackagePath = join(repoRoot, "apps/herbatika/package.json")
const populationRunbookPath = join(
  repoRoot,
  "docs/url-registry-initial-population.md"
)
const environmentLineBreakPattern = /\r?\n/u
const environmentAssignmentPattern = /^[A-Z0-9_]+=/u
const pinnedCaddyImagePattern =
  /^ARG CADDY_IMAGE=caddy:\d+\.\d+\.\d+-alpine@sha256:[a-f0-9]{64}$/mu

async function loadUrlArchitectureDefinitions() {
  const { stackInputs } = await loadDeployContracts(
    stackManifestPath,
    stackInputsPath
  )
  const definitions = getBootstrapZaneProjectSharedEnvDefinitions(stackInputs)

  return {
    byKey: new Map(
      definitions.map((definition) => [definition.key, definition])
    ),
    definitions,
    previewServiceEnv: getPreviewServiceEnvDefinitions(stackInputs),
  }
}

test("URL architecture cutover gates bootstrap disabled in promotion order", async () => {
  const { byKey, definitions } = await loadUrlArchitectureDefinitions()
  expect(byKey.size).toBe(definitions.length)
  const expectedTargets = new Map([
    ["URL_REGISTRY_ENABLED", ["herbatika.URL_REGISTRY_ENABLED"]],
    [
      "URL_REGISTRY_COMMANDS_ENABLED",
      ["herbatika.URL_REGISTRY_COMMANDS_ENABLED"],
    ],
    [
      "URL_REGISTRY_INVALIDATION_ENABLED",
      ["herbatika.URL_REGISTRY_INVALIDATION_ENABLED"],
    ],
    [
      "URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED",
      ["herbatika.URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED"],
    ],
    [
      "URL_REGISTRY_CONTENT_PROJECTION_ENABLED",
      [
        "medusa-be.URL_REGISTRY_CONTENT_PROJECTION_ENABLED",
        "herbatika.URL_REGISTRY_CONTENT_PROJECTION_ENABLED",
      ],
    ],
    [
      "URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED",
      [
        "medusa-be.URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED",
        "herbatika.URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED",
      ],
    ],
    [
      "URL_PRODUCT_RESOLVER_ENABLED",
      ["herbatika.URL_PRODUCT_RESOLVER_ENABLED"],
    ],
    [
      "URL_ARCHITECTURE_M00_ENABLED",
      ["herbatika.URL_ARCHITECTURE_M00_ENABLED"],
    ],
    ["URL_ARCHITECTURE_ENABLED", ["herbatika.URL_ARCHITECTURE_ENABLED"]],
  ])

  for (const [key, targets] of expectedTargets) {
    const definition = byKey.get(key)
    expect(definition?.source).toMatchObject({
      kind: "local_env",
      default_value: "0",
    })
    expect(
      definition?.service_targets.map(
        (target) => `${target.service_id}.${target.env_var}`
      )
    ).toEqual(targets)
  }
})

test("tracked Docker defaults cannot accidentally enable a URL cutover", async () => {
  const environment = new Map(
    (await readFile(dockerEnvPath, "utf8"))
      .split(environmentLineBreakPattern)
      .filter((line) => environmentAssignmentPattern.test(line))
      .map((line) => {
        const separator = line.indexOf("=")
        return [line.slice(0, separator), line.slice(separator + 1)] as const
      })
  )

  for (const key of [
    "DC_HERBATIKA_URL_REGISTRY_ENABLED",
    "DC_HERBATIKA_URL_REGISTRY_COMMANDS_ENABLED",
    "DC_HERBATIKA_URL_REGISTRY_INVALIDATION_ENABLED",
    "DC_HERBATIKA_URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED",
    "DC_URL_REGISTRY_CONTENT_PROJECTION_ENABLED",
    "DC_URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED",
    "DC_HERBATIKA_URL_PRODUCT_RESOLVER_ENABLED",
    "DC_HERBATIKA_URL_ARCHITECTURE_M00_ENABLED",
    "DC_HERBATIKA_URL_ARCHITECTURE_ENABLED",
  ]) {
    expect(environment.get(key), key).toBe("0")
  }

  expect(environment.has("DC_HERBATIKA_URL_REGISTRY_DATABASE_URL")).toBe(true)
  expect(environment.has("URL_REGISTRY_MIGRATION_DATABASE_URL")).toBe(false)

  for (const market of ["SK", "CZ", "HU", "RO"] as const) {
    for (const prefix of [
      "MARKET_PUBLISHABLE_KEY",
      "MARKET_PUBLISHABLE_KEY_ID",
      "MARKET_REGION",
      "MARKET_SALES_CHANNEL",
    ]) {
      expect(environment.has(`DC_HERBATIKA_${prefix}_${market}`)).toBe(true)
    }
  }
})

test("production image ships private-network migration and population tools", async () => {
  const [dockerfile, packageJson, runbook] = await Promise.all([
    readFile(herbatikaDockerImagePath, "utf8"),
    readFile(herbatikaPackagePath, "utf8").then((source) => JSON.parse(source)),
    readFile(populationRunbookPath, "utf8"),
  ])

  expect(packageJson.scripts.build).toContain("build:url-registry-tools")
  expect(packageJson.scripts["build:url-registry-tools"]).toContain(
    "scripts/url-registry/populate.mjs"
  )
  expect(dockerfile).toContain("scripts/url-registry/migrate.mjs")
  expect(dockerfile).toContain("scripts/url-registry/populate.mjs")
  expect(dockerfile).toContain("0004_add_invalidation_delivery_diagnostics.sql")
  expect(runbook).toContain("node scripts/url-registry/migrate.mjs")
  expect(runbook).toContain("populate.mjs --manifest -")
  expect(runbook).toContain("URL_ARCHITECTURE_ENABLED=0")
})

test("URL registry runtime receives only runtime credentials and a shared lifecycle token", async () => {
  const { byKey, previewServiceEnv } = await loadUrlArchitectureDefinitions()

  expect(byKey.get("URL_REGISTRY_DATABASE_URL")).toMatchObject({
    source: {
      kind: "local_env",
      env_var: "DC_HERBATIKA_URL_REGISTRY_DATABASE_URL",
      default_value: "",
    },
    service_targets: [
      { service_id: "herbatika", env_var: "URL_REGISTRY_DATABASE_URL" },
    ],
  })
  expect(byKey.has("URL_REGISTRY_MIGRATION_DATABASE_URL")).toBe(false)
  expect(byKey.get("URL_REGISTRY_ADMIN_TOKEN")).toMatchObject({
    source: {
      kind: "local_env",
      env_var: "DC_HERBATIKA_URL_REGISTRY_ADMIN_TOKEN",
      default_value: "",
    },
    service_targets: [
      { service_id: "herbatika", env_var: "URL_REGISTRY_ADMIN_TOKEN" },
    ],
  })
  expect(byKey.get("URL_REGISTRY_INVALIDATION_TOKEN")).toMatchObject({
    source: {
      kind: "local_env",
      env_var: "DC_HERBATIKA_URL_REGISTRY_INVALIDATION_TOKEN",
      default_value: "",
    },
    service_targets: [
      {
        service_id: "herbatika",
        env_var: "URL_REGISTRY_INVALIDATION_TOKEN",
      },
    ],
  })
  expect(byKey.get("URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN")).toMatchObject({
    source: {
      kind: "local_env",
      env_var: "DC_HERBATIKA_URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN",
      default_value: "",
    },
    service_targets: [
      {
        service_id: "herbatika",
        env_var: "URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN",
      },
    ],
  })
  expect(byKey.get("URL_REGISTRY_CONTENT_PROJECTION_URL")).toMatchObject({
    source: {
      kind: "local_env",
      env_var: "DC_URL_REGISTRY_CONTENT_PROJECTION_URL",
      default_value:
        "http://{{env.HERBATIKA_NETWORK_HOST}}:3000/api/internal/url-registry/content-projections",
    },
    service_targets: [
      {
        service_id: "medusa-be",
        env_var: "URL_REGISTRY_CONTENT_PROJECTION_URL",
      },
    ],
  })
  expect(byKey.get("URL_REGISTRY_CONTENT_PROJECTION_TOKEN")).toMatchObject({
    source: {
      kind: "local_env",
      env_var: "DC_URL_REGISTRY_CONTENT_PROJECTION_TOKEN",
      default_value: "",
    },
    service_targets: [
      {
        service_id: "medusa-be",
        env_var: "URL_REGISTRY_CONTENT_PROJECTION_TOKEN",
      },
      {
        service_id: "herbatika",
        env_var: "URL_REGISTRY_CONTENT_PROJECTION_TOKEN",
      },
    ],
  })

  expect(byKey.get("URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN")).toMatchObject({
    source: {
      kind: "local_env",
      env_var: "DC_URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN",
      default_value: "",
    },
    service_targets: [
      {
        service_id: "medusa-be",
        env_var: "URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN",
      },
      {
        service_id: "herbatika",
        env_var: "URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN",
      },
    ],
  })

  expect(byKey.get("URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN")).toMatchObject({
    source: {
      kind: "local_env",
      default_value: "http://{{env.HERBATIKA_NETWORK_HOST}}:3000",
    },
    service_targets: [
      {
        service_id: "medusa-be",
        env_var: "URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN",
      },
    ],
  })
  expect(previewServiceEnv).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        service_id: "medusa-be",
        env_var: "URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN",
        source: expect.objectContaining({
          kind: "service_internal_origin",
          service_id: "herbatika",
          port: 3000,
        }),
      }),
    ])
  )
})

test("all four market bindings are private, explicit, and scoped to Herbatika", async () => {
  const { byKey } = await loadUrlArchitectureDefinitions()
  expect(byKey.get("ALLOWED_MARKETS")?.source).toMatchObject({
    kind: "local_env",
    default_value: "sk,cz,hu,ro",
  })

  for (const market of ["SK", "CZ", "HU", "RO"] as const) {
    for (const prefix of [
      "MARKET_ACCEPTED_HOSTS",
      "HERBATIKA_ACCEPTED_HOSTS",
      "MARKET_PUBLISHABLE_KEY",
      "MARKET_PUBLISHABLE_KEY_ID",
      "MARKET_REGION",
      "MARKET_SALES_CHANNEL",
    ]) {
      const key = `${prefix}_${market}`
      const definition = byKey.get(key)
      const sourceEnvVar = key.startsWith("HERBATIKA_")
        ? `DC_${key}`
        : `DC_HERBATIKA_${key}`
      expect(definition?.source.kind, key).toBe("local_env")
      expect(definition?.source.env_var, key).toBe(sourceEnvVar)
      expect(definition?.service_targets, key).toEqual([
        { service_id: "herbatika", env_var: key },
      ])
      expect(key.startsWith("NEXT_PUBLIC_"), key).toBe(false)
    }
  }

  expect(byKey.get("MARKET_ACCEPTED_HOSTS_RO")?.source.default_value).toContain(
    "test-engine-herbatika-ro-zane.web-revolution.cz"
  )
  expect(
    byKey.get("HERBATIKA_ACCEPTED_HOSTS_RO")?.source.default_value
  ).toContain("test-engine-herbatika-ro-zane.web-revolution.cz")
})

test("Docker ingress pins Caddy and owns the raw URL boundary before Next", async () => {
  const [caddyfile, dockerfile] = await Promise.all([
    readFile(dockerCaddyfilePath, "utf8"),
    readFile(dockerCaddyImagePath, "utf8"),
  ])

  expect(dockerfile).toMatch(pinnedCaddyImagePattern)
  expect(caddyfile).toContain("size(bytes({http.request.orig_uri})) > 2048")
  expect(caddyfile).toContain("respond 414")
  expect(caddyfile).toContain("respond 421")
  expect(caddyfile).toContain("@malformed_percent expression")
  expect(caddyfile).toContain("@encoded_separator expression")
  expect(caddyfile).toContain("@malformed_authority expression")
  expect(caddyfile).toContain('header Cache-Control "no-store"')
  expect(caddyfile).toContain('header X-Robots-Tag "noindex, nofollow"')

  for (const header of [
    "Forwarded",
    "Next-Router-Prefetch",
    "Next-Router-Segment-Prefetch",
    "Next-Router-State-Tree",
    "Next-Url",
    "Purpose",
    "RSC",
    "Sec-Purpose",
    "X-Forwarded-Port",
    "X-Forwarded-Scheme",
    "X-Middleware-Prefetch",
    "X-Nextjs-Data",
    "X-Original-Host",
    "X-Original-URL",
    "X-Real-IP",
  ]) {
    expect(caddyfile, header).toContain(`header_up -${header}`)
  }

  expect(caddyfile).toContain(
    "Pinned Caddy replaces client-provided X-Forwarded-For/Host/Proto"
  )
  for (const trustedForwardingHeader of [
    "X-Forwarded-For",
    "X-Forwarded-Host",
    "X-Forwarded-Proto",
  ]) {
    expect(caddyfile).not.toContain(`header_up -${trustedForwardingHeader}`)
  }
})
