import { delimiter, join, resolve } from "node:path"

import { expect, test } from "vitest"

import {
  getDeployableService,
  getZaneService,
  listLaneServiceIds,
  stackManifestSchema,
} from "../contracts/stack-manifest.js"
import { loadDeployContracts } from "../orchestration/deploy-inputs.js"
import { executePlan } from "../orchestration/plan.js"
import { collectConfiguredRuntimeProviderNeeds } from "../orchestration/runtime-provider-orchestration.js"
import { executeScope } from "../orchestration/scope.js"
import { withWorkspaceBinPath } from "../orchestration/workspace-bin-path.js"

const repoRoot = resolve(import.meta.dirname, "../../../..")
const stackManifestPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-manifest.yaml",
)
const stackInputsPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-inputs.yaml",
)
const explicitPreviewRejectPattern =
  /Explicit services are not deployable on lane preview: medusa-db/
const cloneToPreviewRejectPattern = /clone_to_preview is false/
const workspaceBinPath = join(process.cwd(), "node_modules", ".bin")

test("scope preserves existing Path casing when prefixing workspace bin", () => {
  const env = withWorkspaceBinPath({
    OTHER_VALUE: "kept",
    Path: "C:\\Windows\\System32",
  })

  expect(env.Path).toBe(
    [workspaceBinPath, "C:\\Windows\\System32"].join(delimiter),
  )
  expect(Object.hasOwn(env, "PATH")).toBeFalsy()
  expect(env.OTHER_VALUE).toBe("kept")
})

test("scope removes duplicate path casing when prefixing workspace bin", () => {
  const env = withWorkspaceBinPath({
    PATH: "/usr/bin",
    Path: "C:\\Windows\\System32",
  })

  expect(env.PATH).toBe([workspaceBinPath, "/usr/bin"].join(delimiter))
  expect(Object.hasOwn(env, "Path")).toBeFalsy()
})

test("Zane service lookup preserves its less restrictive deployability guard", () => {
  const manifest = stackManifestSchema.parse({
    services: [
      {
        ci: {
          deployable: false,
          zane: {
            deploy_lanes: ["main"],
            service_slug: "optional",
          },
        },
        id: "optional",
      },
    ],
  })

  expect(getZaneService(manifest, "optional").serviceSlug).toBe("optional")
  expect(() => getDeployableService(manifest, "optional")).toThrow(
    "Service is not deployable or missing Zane metadata: optional",
  )
})

test("preview scope prepares DB credentials for first baseline replay", async () => {
  const result = await executeScope({
    headSha: "HEAD",
    lane: "preview",
    nxIsolatePlugins: true,
    previewBaselineComplete: false,
    servicesCsv: "herbatika",
    stackInputsPath,
    stackManifestPath,
  })

  expect(result.services_csv).toBe("herbatika")
  expect(result.should_prepare).toBeTruthy()
  expect(result.requires_preview_db).toBeTruthy()
  expect(result.preview_db_service_ids).toBe("medusa-be,payload")
})

test("preview scope skips prepare for non-DB services after baseline is complete", async () => {
  const result = await executeScope({
    headSha: "HEAD",
    lane: "preview",
    nxIsolatePlugins: true,
    previewBaselineComplete: true,
    servicesCsv: "herbatika",
    stackInputsPath,
    stackManifestPath,
  })

  expect(result.services_csv).toBe("herbatika")
  expect(result.should_prepare).toBeFalsy()
  expect(result.requires_preview_db).toBeFalsy()
  expect(result.preview_db_service_ids).toBe("")

  const plan = await executePlan({
    lane: "preview",
    outputJson: undefined,
    prNumber: 123,
    previewEnvPrefix: "pr-",
    servicesCsv: result.services_csv,
    stackManifestPath,
  })
  expect(plan.preview_cloned_service_ids_csv.split(",")).not.toContain("n1")
})

test("N1 is explicitly selectable but excluded from default CI scope", async () => {
  const contracts = await loadDeployContracts(
    stackManifestPath,
    stackInputsPath,
  )

  expect(listLaneServiceIds(contracts.manifest, "main")).toContain("n1")
  expect(listLaneServiceIds(contracts.manifest, "main", true)).not.toContain(
    "n1",
  )

  const result = await executeScope({
    headSha: "HEAD",
    lane: "main",
    nxIsolatePlugins: true,
    previewBaselineComplete: true,
    servicesCsv: "n1",
    stackInputsPath,
    stackManifestPath,
  })

  expect(result.services_csv).toBe("n1")
})

test("explicit N1 preview selection includes N1 and its provider outputs", async () => {
  const contracts = await loadDeployContracts(
    stackManifestPath,
    stackInputsPath,
  )
  const plan = await executePlan({
    lane: "preview",
    outputJson: undefined,
    prNumber: 123,
    previewEnvPrefix: "pr-",
    servicesCsv: "n1",
    stackManifestPath,
  })
  const needs = collectConfiguredRuntimeProviderNeeds({
    lane: "preview",
    manifest: contracts.manifest,
    meiliApiCredentialsProviderId: "meili_api_credentials",
    services: plan.deploy_services,
    stackInputs: contracts.stackInputs,
  })

  expect(plan.deploy_services_csv).toBe("n1")
  expect(plan.preview_cloned_service_ids_csv.split(",")).toContain("n1")
  expect(needs).toStrictEqual(
    expect.arrayContaining([
      expect.objectContaining({
        outputConsumerIds: { frontend_key: ["n1"] },
        providerId: "meili_api_credentials",
      }),
      expect.objectContaining({
        outputConsumerIds: { frontend_key: ["n1"] },
        providerId: "medusa_publishable_key",
      }),
    ]),
  )
})

test("preview scope rejects explicit services excluded from preview cloning", async () => {
  await expect(
    executeScope({
      headSha: "HEAD",
      lane: "preview",
      nxIsolatePlugins: true,
      previewBaselineComplete: true,
      servicesCsv: "medusa-db",
      stackInputsPath,
      stackManifestPath,
    }),
  ).rejects.toThrow(explicitPreviewRejectPattern)
})

test("preview plan rejects services marked clone_to_preview false", async () => {
  await expect(
    executePlan({
      lane: "preview",
      outputJson: undefined,
      prNumber: 123,
      previewEnvPrefix: "pr-",
      servicesCsv: "medusa-db",
      stackManifestPath,
    }),
  ).rejects.toThrow(cloneToPreviewRejectPattern)
})
