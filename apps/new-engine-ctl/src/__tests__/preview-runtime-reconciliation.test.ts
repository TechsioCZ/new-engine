import { expect, test } from "vitest"

import { stackInputsSchema } from "../contracts/stack-inputs.js"
import { stackManifestSchema } from "../contracts/stack-manifest.js"
import { buildServiceReconciliationSpecs } from "../orchestration/preview-runtime-reconciliation.js"

const manifest = stackManifestSchema.parse({
  ci: {
    ignore_path_globs: [],
    global_runtime_rules: [],
  },
  services: [
    {
      id: "medusa-be",
      ci: {
        deployable: true,
        zane: {
          service_slug: "medusa-be",
          deploy_lanes: ["preview", "main"],
        },
      },
    },
  ],
})

const stackInputs = stackInputsSchema.parse({})

test("preview service reconciliation pins git source to the PR branch", () => {
  const specs = buildServiceReconciliationSpecs({
    stackInputs,
    manifest,
    lane: "preview",
    serviceIds: ["medusa-be"],
    previewGitBranch: "ci/pipeline-smoke-20260428",
  })

  expect(specs[0]?.git_source?.branch_name).toBe("ci/pipeline-smoke-20260428")
})

test("main service reconciliation does not override source branch", () => {
  const specs = buildServiceReconciliationSpecs({
    stackInputs,
    manifest,
    lane: "main",
    serviceIds: ["medusa-be"],
    previewGitBranch: "ci/pipeline-smoke-20260428",
  })

  expect(specs[0]?.git_source?.branch_name).toBeUndefined()
})
