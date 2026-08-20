import { beforeEach, describe, expect, test, vi } from "vitest"

import type { PlanResponse } from "../contracts/plan.js"
import { stackInputsSchema } from "../contracts/stack-inputs.js"
import { stackManifestSchema } from "../contracts/stack-manifest.js"

const executeResolveTargetsPayload = vi.hoisted(() => vi.fn())

vi.mock("../orchestration/resolve-targets.js", () => ({
  executeResolveTargetsPayload,
}))

import { expandPlanForRuntimeProviderPrerequisites } from "../orchestration/runtime-provider-prerequisites.js"

const manifest = stackManifestSchema.parse({
  services: [
    {
      id: "storefront",
      ci: {
        deployable: true,
        zane: {
          service_slug: "storefront",
          deploy_lanes: ["main"],
          service_dependencies: ["persistent-db"],
        },
      },
    },
    {
      id: "persistent-db",
      ci: {
        deployable: true,
        zane: {
          service_slug: "persistent-db",
          deploy_lanes: ["main"],
          downtime_risk: true,
        },
      },
    },
    {
      id: "meilisearch",
      ci: {
        deployable: true,
        zane: {
          service_slug: "meilisearch",
          deploy_lanes: ["main"],
        },
      },
    },
  ],
})

const stackInputs = stackInputsSchema.parse({
  runtime_providers: {
    providers: [
      {
        provider_id: "meili_api_credentials",
        source_service_id: "meilisearch",
        outputs: [],
      },
    ],
  },
})

const storefrontService: PlanResponse["deploy_services"][number] = {
  id: "storefront",
  service_slug: "storefront",
  clone_to_preview: true,
  deploy_lanes: ["main"],
  deploy_stage: 100,
  downtime_risk: false,
  service_dependencies: ["persistent-db"],
}

const plan: PlanResponse = {
  lane: "main",
  source_services_csv: "storefront",
  requested_services_csv: "storefront",
  deploy_services_csv: "storefront",
  preview_environment_name: "",
  preview_cloned_service_ids_csv: "",
  preview_excluded_service_ids_csv: "",
  pr_number: null,
  requested_services: [storefrontService],
  deploy_services: [storefrontService],
  preview_cloned_services: [],
  preview_excluded_services: [],
}

function expandPrerequisites() {
  return expandPlanForRuntimeProviderPrerequisites({
    lane: "main",
    plan,
    manifest,
    stackInputs,
    projectSlug: "test-engine",
    environmentName: "production",
    baseUrl: "https://operator.invalid",
    apiToken: "test-token",
    dryRun: false,
    meiliApiCredentialsProviderId: "meili_api_credentials",
  })
}

beforeEach(() => {
  executeResolveTargetsPayload.mockReset()
})

describe("runtime-provider prerequisite target resolution", () => {
  test("fails closed when dependency health cannot be resolved", async () => {
    executeResolveTargetsPayload.mockRejectedValue(
      new Error("operator request timed out")
    )

    await expect(expandPrerequisites()).rejects.toThrow(
      "Failed to resolve deployment targets for runtime-provider prerequisites (persistent-db): operator request timed out. Dependency health is unknown; verify the Zane operator connection and retry."
    )
  })

  test("still expands a dependency whose resolved deployment is unhealthy", async () => {
    executeResolveTargetsPayload.mockResolvedValue({
      project_slug: "test-engine",
      environment_name: "production",
      services: [
        {
          service_id: "persistent-db",
          service_slug: "persistent-db",
          current_production_deployment: {
            deployment_hash: "dpl_unhealthy",
            status: "FAILED",
          },
        },
      ],
    })

    const result = await expandPrerequisites()

    expect(result.plan.deploy_services_csv).toBe("storefront,persistent-db")
    expect(result.transientServiceIds).toEqual(["persistent-db"])
    expect(result.transientDowntimeServiceIds).toEqual(["persistent-db"])
  })
})
