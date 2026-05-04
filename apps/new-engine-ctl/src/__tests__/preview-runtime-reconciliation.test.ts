import { expect, test } from "vitest"

import { stackInputsSchema } from "../contracts/stack-inputs.js"
import { stackManifestSchema } from "../contracts/stack-manifest.js"
import {
  buildPreviewSharedEnvSyncVariables,
  buildServiceReconciliationSpecs,
} from "../orchestration/preview-runtime-reconciliation.js"

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

test("preview shared env sync rejects empty literal values before operator calls", () => {
  const inputs = stackInputsSchema.parse({
    preview_runtime_reconciliation: {
      shared_env: [
        {
          key: "MEDUSA_APP_DB_PASSWORD",
          consumed_by_service_ids: ["medusa-be"],
          source: {
            kind: "prepare_preview_db_password",
          },
        },
      ],
    },
  })

  expect(() =>
    buildPreviewSharedEnvSyncVariables({
      stackInputs: inputs,
      manifest,
      deployServiceIds: ["medusa-be"],
      context: {
        sourceEnvironmentName: "production",
        previewDbName: "medusa_pr_387",
        previewDbUser: "medusa_pr_app_387",
        previewDbPassword: "",
      },
    })
  ).toThrow("preview shared env MEDUSA_APP_DB_PASSWORD")
})

test("preview shared env sync carries prepared DB credentials", () => {
  const inputs = stackInputsSchema.parse({
    preview_runtime_reconciliation: {
      shared_env: [
        {
          key: "MEDUSA_APP_DB_PASSWORD",
          consumed_by_service_ids: ["medusa-be"],
          source: {
            kind: "prepare_preview_db_password",
          },
        },
      ],
    },
  })

  const variables = buildPreviewSharedEnvSyncVariables({
    stackInputs: inputs,
    manifest,
    deployServiceIds: ["medusa-be"],
    context: {
      sourceEnvironmentName: "production",
      previewDbName: "medusa_pr_387",
      previewDbUser: "medusa_pr_app_387",
      previewDbPassword: "secret-password",
    },
  })

  expect(variables).toEqual([
    {
      key: "MEDUSA_APP_DB_PASSWORD",
      source: {
        kind: "literal",
        value: "secret-password",
      },
    },
  ])
})
