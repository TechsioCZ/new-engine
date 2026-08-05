import { expect, test } from "vitest"

import { stackInputsSchema } from "../contracts/stack-inputs.js"
import { stackManifestSchema } from "../contracts/stack-manifest.js"
import {
  buildPreviewSharedEnvSyncVariables,
  buildServiceReconciliationSpecs,
} from "../orchestration/preview-runtime-reconciliation.js"

const manifest = stackManifestSchema.parse({
  ci: {
    global_runtime_rules: [],
    ignore_path_globs: [],
  },
  services: [
    {
      ci: {
        deployable: true,
        zane: {
          deploy_lanes: ["preview", "main"],
          service_slug: "medusa-be",
        },
      },
      id: "medusa-be",
    },
    {
      ci: {
        affected_path_globs: [
          "apps/payload/**",
          "docker/development/payload/**",
        ],
        deployable: false,
      },
      id: "payload",
    },
  ],
})

const stackInputs = stackInputsSchema.parse({})

test("preview service reconciliation pins git source to the PR branch", () => {
  const specs = buildServiceReconciliationSpecs({
    lane: "preview",
    manifest,
    previewGitBranch: "ci/pipeline-smoke-20260428",
    serviceIds: ["medusa-be"],
    stackInputs,
  })

  expect(specs[0]?.git_source?.branch_name).toBe("ci/pipeline-smoke-20260428")
})

test("main service reconciliation does not override source branch", () => {
  const specs = buildServiceReconciliationSpecs({
    lane: "main",
    manifest,
    previewGitBranch: "ci/pipeline-smoke-20260428",
    serviceIds: ["medusa-be"],
    stackInputs,
  })

  expect(specs[0]?.git_source?.branch_name).toBeUndefined()
})

test("service reconciliation rejects local-only payload service", () => {
  expect(() =>
    buildServiceReconciliationSpecs({
      lane: "preview",
      manifest,
      previewGitBranch: "ci/pipeline-smoke-20260428",
      serviceIds: ["payload"],
      stackInputs,
    }),
  ).toThrow("Service is not deployable or missing Zane metadata: payload")
})

test("preview shared env sync rejects empty literal values before operator calls", () => {
  const inputs = stackInputsSchema.parse({
    preview_runtime_reconciliation: {
      shared_env: [
        {
          consumed_by_service_ids: ["medusa-be"],
          key: "MEDUSA_APP_DB_PASSWORD",
          source: {
            kind: "prepare_preview_db_password",
          },
        },
      ],
    },
  })

  expect(() =>
    buildPreviewSharedEnvSyncVariables({
      context: {
        previewDbName: "medusa_pr_387",
        previewDbPassword: "",
        previewDbUser: "medusa_pr_app_387",
        sourceEnvironmentName: "production",
      },
      deployServiceIds: ["medusa-be"],
      manifest,
      stackInputs: inputs,
    }),
  ).toThrow("preview shared env MEDUSA_APP_DB_PASSWORD")
})

test("preview shared env sync carries prepared DB credentials", () => {
  const inputs = stackInputsSchema.parse({
    preview_runtime_reconciliation: {
      shared_env: [
        {
          consumed_by_service_ids: ["medusa-be"],
          key: "MEDUSA_APP_DB_PASSWORD",
          source: {
            kind: "prepare_preview_db_password",
          },
        },
      ],
    },
  })

  const variables = buildPreviewSharedEnvSyncVariables({
    context: {
      previewDbName: "medusa_pr_387",
      previewDbPassword: "secret-password",
      previewDbUser: "medusa_pr_app_387",
      sourceEnvironmentName: "production",
    },
    deployServiceIds: ["medusa-be"],
    manifest,
    stackInputs: inputs,
  })

  expect(variables).toStrictEqual([
    {
      key: "MEDUSA_APP_DB_PASSWORD",
      source: {
        kind: "literal",
        value: "secret-password",
      },
    },
  ])
})
