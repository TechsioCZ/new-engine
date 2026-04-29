import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"
import { executePlan } from "../orchestration/plan.js"
import { executeScope } from "../orchestration/scope.js"

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

test("preview scope prepares DB credentials for first baseline replay", async () => {
  const result = await executeScope({
    lane: "preview",
    servicesCsv: "n1",
    headSha: "HEAD",
    previewBaselineComplete: false,
    stackManifestPath,
    stackInputsPath,
    nxIsolatePlugins: true,
  })

  expect(result.services_csv).toBe("n1")
  expect(result.should_prepare).toBe(true)
  expect(result.requires_preview_db).toBe(true)
  expect(result.preview_db_service_ids).toBe("medusa-be")
})

test("preview scope skips prepare for non-DB services after baseline is complete", async () => {
  const result = await executeScope({
    lane: "preview",
    servicesCsv: "n1",
    headSha: "HEAD",
    previewBaselineComplete: true,
    stackManifestPath,
    stackInputsPath,
    nxIsolatePlugins: true,
  })

  expect(result.services_csv).toBe("n1")
  expect(result.should_prepare).toBe(false)
  expect(result.requires_preview_db).toBe(false)
  expect(result.preview_db_service_ids).toBe("")
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
