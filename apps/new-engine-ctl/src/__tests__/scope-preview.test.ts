import assert from "node:assert/strict"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

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

  assert.equal(result.services_csv, "n1")
  assert.equal(result.should_prepare, true)
  assert.equal(result.requires_preview_db, true)
  assert.equal(result.preview_db_service_ids, "medusa-be")
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

  assert.equal(result.services_csv, "n1")
  assert.equal(result.should_prepare, false)
  assert.equal(result.requires_preview_db, false)
  assert.equal(result.preview_db_service_ids, "")
})

test("preview scope rejects explicit services excluded from preview cloning", async () => {
  await assert.rejects(
    executeScope({
      lane: "preview",
      servicesCsv: "medusa-db",
      headSha: "HEAD",
      previewBaselineComplete: true,
      stackManifestPath,
      stackInputsPath,
      nxIsolatePlugins: true,
    }),
    explicitPreviewRejectPattern
  )
})

test("preview plan rejects services marked clone_to_preview false", async () => {
  await assert.rejects(
    executePlan({
      lane: "preview",
      servicesCsv: "medusa-db",
      prNumber: 123,
      outputJson: undefined,
      stackManifestPath,
      previewEnvPrefix: "pr-",
    }),
    cloneToPreviewRejectPattern
  )
})
