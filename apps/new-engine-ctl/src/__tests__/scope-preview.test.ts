import { delimiter, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"
import { listLaneServiceIds } from "../contracts/stack-manifest.js"
import { loadDeployContracts } from "../orchestration/deploy-inputs.js"
import { executePlan } from "../orchestration/plan.js"
import { collectConfiguredRuntimeProviderNeeds } from "../orchestration/runtime-provider-orchestration.js"
import { executeScope, withWorkspaceBinPath } from "../orchestration/scope.js"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const stackManifestPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-manifest.yaml"
)
const stackInputsPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-inputs.yaml"
)
const explicitPreviewRejectPattern =
  /Explicit services are not deployable on lane preview: medusa-db/
const cloneToPreviewRejectPattern = /clone_to_preview is false/
const workspaceBinPath = join(process.cwd(), "node_modules", ".bin")

test("scope preserves existing Path casing when prefixing workspace bin", () => {
  const env = withWorkspaceBinPath({
    Path: "C:\\Windows\\System32",
    OTHER_VALUE: "kept",
  })

  expect(env.Path).toBe(
    [workspaceBinPath, "C:\\Windows\\System32"].join(delimiter)
  )
  expect(Object.hasOwn(env, "PATH")).toBe(false)
  expect(env.OTHER_VALUE).toBe("kept")
})

test("scope removes duplicate path casing when prefixing workspace bin", () => {
  const env = withWorkspaceBinPath({
    PATH: "/usr/bin",
    Path: "C:\\Windows\\System32",
  })

  expect(env.PATH).toBe([workspaceBinPath, "/usr/bin"].join(delimiter))
  expect(Object.hasOwn(env, "Path")).toBe(false)
})

test("preview scope prepares DB credentials for first baseline replay", async () => {
  const result = await executeScope({
    lane: "preview",
    servicesCsv: "herbatika",
    headSha: "HEAD",
    previewBaselineComplete: false,
    stackManifestPath,
    stackInputsPath,
    nxIsolatePlugins: true,
  })

  expect(result.services_csv).toBe("herbatika")
  expect(result.should_prepare).toBe(true)
  expect(result.requires_preview_db).toBe(true)
  expect(result.preview_db_service_ids).toBe("medusa-be,payload")
})

test("preview scope skips prepare for non-DB services after baseline is complete", async () => {
  const result = await executeScope({
    lane: "preview",
    servicesCsv: "herbatika",
    headSha: "HEAD",
    previewBaselineComplete: true,
    stackManifestPath,
    stackInputsPath,
    nxIsolatePlugins: true,
  })

  expect(result.services_csv).toBe("herbatika")
  expect(result.should_prepare).toBe(false)
  expect(result.requires_preview_db).toBe(false)
  expect(result.preview_db_service_ids).toBe("")

  const plan = await executePlan({
    lane: "preview",
    servicesCsv: result.services_csv,
    prNumber: 123,
    outputJson: undefined,
    stackManifestPath,
    previewEnvPrefix: "pr-",
  })
  expect(plan.preview_cloned_service_ids_csv.split(",")).not.toContain("n1")
})

test("N1 is explicitly selectable but excluded from default CI scope", async () => {
  const contracts = await loadDeployContracts(
    stackManifestPath,
    stackInputsPath
  )

  expect(listLaneServiceIds(contracts.manifest, "main")).toContain("n1")
  expect(listLaneServiceIds(contracts.manifest, "main", true)).not.toContain(
    "n1"
  )

  const result = await executeScope({
    lane: "main",
    servicesCsv: "n1",
    headSha: "HEAD",
    previewBaselineComplete: true,
    stackManifestPath,
    stackInputsPath,
    nxIsolatePlugins: true,
  })

  expect(result.services_csv).toBe("n1")
})

test("explicit N1 preview selection includes N1 and its provider outputs", async () => {
  const contracts = await loadDeployContracts(
    stackManifestPath,
    stackInputsPath
  )
  const plan = await executePlan({
    lane: "preview",
    servicesCsv: "n1",
    prNumber: 123,
    outputJson: undefined,
    stackManifestPath,
    previewEnvPrefix: "pr-",
  })
  const needs = collectConfiguredRuntimeProviderNeeds({
    lane: "preview",
    manifest: contracts.manifest,
    stackInputs: contracts.stackInputs,
    services: plan.deploy_services,
    meiliApiCredentialsProviderId: "meili_api_credentials",
  })

  expect(plan.deploy_services_csv).toBe("n1")
  expect(plan.preview_cloned_service_ids_csv.split(",")).toContain("n1")
  expect(needs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        providerId: "meili_api_credentials",
        outputConsumerIds: { frontend_key: ["n1"] },
      }),
      expect.objectContaining({
        providerId: "medusa_publishable_key",
        outputConsumerIds: { frontend_key: ["n1"] },
      }),
    ])
  )
})

test("preview scope rejects explicit services excluded from preview cloning", async () => {
  await expect(
    executeScope({
      lane: "preview",
      servicesCsv: "medusa-db",
      headSha: "HEAD",
      previewBaselineComplete: true,
      stackManifestPath,
      stackInputsPath,
      nxIsolatePlugins: true,
    })
  ).rejects.toThrow(explicitPreviewRejectPattern)
})

test("preview plan rejects services marked clone_to_preview false", async () => {
  await expect(
    executePlan({
      lane: "preview",
      servicesCsv: "medusa-db",
      prNumber: 123,
      outputJson: undefined,
      stackManifestPath,
      previewEnvPrefix: "pr-",
    })
  ).rejects.toThrow(cloneToPreviewRejectPattern)
})
