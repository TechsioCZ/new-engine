import assert from "node:assert/strict"
import { test } from "node:test"

import { filterHealthyBaselineDependencies } from "../orchestration/deploy-shared.js"

test("baseline retry reuses healthy unrequested dependency services", () => {
  const result = filterHealthyBaselineDependencies({
    requestedServiceIds: ["medusa-be"],
    envOverrides: [
      {
        service_id: "medusa-valkey",
        service_slug: "medusa-valkey",
        env: {
          VALKEY_PASSWORD: "secret",
        },
      },
    ],
    targets: [
      {
        service_id: "medusa-valkey",
        service_slug: "medusa-valkey",
        service_type: "git",
        current_production_deployment: {
          deployment_hash: "dpl_dependency",
          status: "HEALTHY",
          commit_sha: "old-sha",
          env: {
            VALKEY_PASSWORD: "secret",
          },
        },
      },
      {
        service_id: "medusa-be",
        service_slug: "medusa-be",
        service_type: "git",
        current_production_deployment: {
          deployment_hash: "dpl_backend",
          status: "HEALTHY",
          commit_sha: "old-sha",
          env: {},
        },
      },
    ],
  })

  assert.deepEqual(
    result.skippedServices.map((service) => ({
      service_id: service.service_id,
      reason: service.reason,
      deployment_hash: service.deployment_hash,
    })),
    [
      {
        service_id: "medusa-valkey",
        reason: "healthy_baseline_dependency",
        deployment_hash: "dpl_dependency",
      },
    ]
  )
  assert.deepEqual(
    result.services.map((service) => service.service_id),
    ["medusa-be"]
  )
  assert.equal(result.filteredEnvOverrides.length, 0)
})

test("baseline retry redeploys unrequested dependency when env drift exists", () => {
  const result = filterHealthyBaselineDependencies({
    requestedServiceIds: ["medusa-be"],
    envOverrides: [
      {
        service_id: "medusa-valkey",
        service_slug: "medusa-valkey",
        env: {
          VALKEY_PASSWORD: "new-secret",
        },
      },
    ],
    targets: [
      {
        service_id: "medusa-valkey",
        service_slug: "medusa-valkey",
        service_type: "git",
        current_production_deployment: {
          deployment_hash: "dpl_dependency",
          status: "HEALTHY",
          commit_sha: "old-sha",
          env: {
            VALKEY_PASSWORD: "old-secret",
          },
        },
      },
    ],
  })

  assert.equal(result.skippedServices.length, 0)
  assert.deepEqual(
    result.services.map((service) => service.service_id),
    ["medusa-valkey"]
  )
  assert.deepEqual(
    result.filteredEnvOverrides.map((service) => service.service_id),
    ["medusa-valkey"]
  )
})
