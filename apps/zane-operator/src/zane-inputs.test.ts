import { describe, expect, test } from "vitest"

import { BadRequestError } from "./db"
import {
  parseResolveEnvironmentInput,
  parseRuntimeProviderRunInput,
  parseWritePreviewCommitStateInput,
} from "./zane-inputs"

const resolveEnvironmentPayload = {
  env_overrides: [],
  environment_name: "pr-123",
  excluded_preview_service_slugs: [],
  expected_preview_service_slugs: [],
  lane: "preview",
  project_slug: "storefront",
  source_environment_name: "production",
  targets: [],
}

describe(parseResolveEnvironmentInput, () => {
  test("normalizes service reconciliation specs", () => {
    const parsed = parseResolveEnvironmentInput({
      ...resolveEnvironmentPayload,
      service_specs: [
        {
          builder: {
            build_stage_target: null,
            sync_from_source: true,
          },
          git_source: {
            branch_name: null,
            sync_from_source: true,
          },
          healthcheck: {
            sync_from_source: true,
          },
          ignored: "value",
          resource_limits: null,
          service_id: " medusa-be ",
          service_slug: " api ",
        },
      ],
    })

    expect(parsed.serviceSpecs).toStrictEqual([
      {
        builder: {
          build_stage_target: null,
          sync_from_source: true,
        },
        git_source: {
          commit_sha: "HEAD",
          sync_from_source: true,
        },
        healthcheck: {
          sync_from_source: true,
        },
        service_id: "medusa-be",
        service_slug: "api",
      },
    ])
  })

  test("rejects malformed service reconciliation sync flags", () => {
    expect(() =>
      parseResolveEnvironmentInput({
        ...resolveEnvironmentPayload,
        service_specs: [
          {
            builder: {
              sync_from_source: "true",
            },
            service_id: "medusa-be",
            service_slug: "api",
          },
        ],
      }),
    ).toThrow(BadRequestError)
  })

  test("defaults missing service reconciliation specs to an empty list", () => {
    expect(
      parseResolveEnvironmentInput(resolveEnvironmentPayload).serviceSpecs,
    ).toStrictEqual([])
  })

  test("rejects invalid service reconciliation specs", () => {
    expect(() =>
      parseResolveEnvironmentInput({
        ...resolveEnvironmentPayload,
        service_specs: [
          {
            service_id: "medusa-be",
            service_slug: "",
          },
        ],
      }),
    ).toThrow(BadRequestError)
  })
})

describe(parseWritePreviewCommitStateInput, () => {
  test("reports the missing update before missing environment fields", () => {
    expect(() => parseWritePreviewCommitStateInput({})).toThrow(
      new BadRequestError(
        "request body target_commit_sha, last_deployed_commit_sha, or baseline_complete is required",
      ),
    )
  })
})

describe(parseRuntimeProviderRunInput, () => {
  test("reports an invalid output policy kind before an invalid env var", () => {
    expect(() =>
      parseRuntimeProviderRunInput({
        environment_name: "pr-123",
        outputs: [
          {
            env_var: "",
            output_id: "search-key",
            policy: { kind: "invalid" },
          },
        ],
        project_slug: "storefront",
        provider_id: "meilisearch",
        readiness_path: "/health",
        service_slug: "search",
      }),
    ).toThrow(
      new BadRequestError(
        "outputs[0].policy.kind Invalid discriminator value. Expected 'meilisearch_key' | 'medusa_publishable_key'",
      ),
    )
  })
})
