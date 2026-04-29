import { expect, test } from "vitest"

import { BadRequestError } from "./db"
import { parseResolveEnvironmentInput } from "./zane-inputs"

const resolveEnvironmentPayload = {
  lane: "preview",
  project_slug: "storefront",
  environment_name: "pr-123",
  source_environment_name: "production",
  expected_preview_service_slugs: [],
  excluded_preview_service_slugs: [],
  targets: [],
  env_overrides: [],
}

test("normalizes service reconciliation specs", () => {
  const parsed = parseResolveEnvironmentInput({
    ...resolveEnvironmentPayload,
    service_specs: [
      {
        service_id: " medusa-be ",
        service_slug: " api ",
        git_source: {
          sync_from_source: true,
          branch_name: null,
        },
        builder: {
          sync_from_source: true,
          build_stage_target: null,
        },
        healthcheck: {
          sync_from_source: true,
        },
        resource_limits: null,
        ignored: "value",
      },
    ],
  })

  expect(parsed.serviceSpecs).toEqual([
    {
      service_id: "medusa-be",
      service_slug: "api",
      git_source: {
        sync_from_source: true,
        commit_sha: "HEAD",
      },
      builder: {
        sync_from_source: true,
        build_stage_target: null,
      },
      healthcheck: {
        sync_from_source: true,
      },
    },
  ])
})

test("rejects malformed service reconciliation sync flags", () => {
  expect(() =>
    parseResolveEnvironmentInput({
      ...resolveEnvironmentPayload,
      service_specs: [
        {
          service_id: "medusa-be",
          service_slug: "api",
          builder: {
            sync_from_source: "true",
          },
        },
      ],
    })
  ).toThrow(BadRequestError)
})

test("defaults missing service reconciliation specs to an empty list", () => {
  expect(
    parseResolveEnvironmentInput(resolveEnvironmentPayload).serviceSpecs
  ).toEqual([])
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
    })
  ).toThrow(BadRequestError)
})
