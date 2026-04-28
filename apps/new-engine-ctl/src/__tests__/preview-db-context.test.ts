import assert from "node:assert/strict"
import { test } from "node:test"

import { stackManifestSchema } from "../contracts/stack-manifest.js"
import { resolvePreviewDbContext } from "../orchestration/preview-db-context.js"
import type { ZaneOperatorClient } from "../zane-operator-client/client.js"

const manifest = stackManifestSchema.parse({
  ci: {
    ignore_path_globs: [],
    global_runtime_rules: [],
  },
  services: [
    {
      id: "medusa-be",
      ci: {
        prepare: {
          preview_db: true,
        },
      },
    },
    {
      id: "n1",
      ci: {
        prepare: {
          preview_db: false,
        },
      },
    },
  ],
})

test("preview DB context is not resolved for services that do not require it", async () => {
  let ensureCalls = 0
  const zaneOperatorClient = {
    ensurePreviewDb() {
      ensureCalls += 1
      return Promise.reject(new Error("unexpected preview DB ensure"))
    },
  } as unknown as ZaneOperatorClient

  const context = await resolvePreviewDbContext({
    prNumber: 374,
    deployServiceIds: ["n1"],
    manifest,
    previewDbName: "",
    previewDbUser: "",
    previewDbPassword: "",
    dryRun: false,
    zaneOperatorClient,
  })

  assert.equal(context.required, false)
  assert.equal(context.password, "")
  assert.equal(ensureCalls, 0)
})

test("preview DB context resolves password inside deploy job when output is empty", async () => {
  let ensureCalls = 0
  const zaneOperatorClient = {
    ensurePreviewDb(prNumber: number) {
      ensureCalls += 1

      return Promise.resolve({
        httpCode: 200,
        body: {
          db_name: `medusa_pr_${prNumber}`,
          created: false,
          app_user: `medusa_pr_app_${prNumber}`,
          app_password: "resolved-password",
        },
      })
    },
  } as unknown as ZaneOperatorClient

  const context = await resolvePreviewDbContext({
    prNumber: 374,
    deployServiceIds: ["medusa-be"],
    manifest,
    previewDbName: "medusa_pr_374",
    previewDbUser: "medusa_pr_app_374",
    previewDbPassword: "",
    dryRun: false,
    zaneOperatorClient,
  })

  assert.deepEqual(context, {
    required: true,
    name: "medusa_pr_374",
    user: "medusa_pr_app_374",
    password: "resolved-password",
  })
  assert.equal(ensureCalls, 1)
})
