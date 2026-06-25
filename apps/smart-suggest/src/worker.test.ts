import { describe, expect, it } from "vitest"
import type { SmartSuggestEnv } from "./config"
import { handleRequest } from "./worker"

type HealthBody = {
  readonly service: string
  readonly version: string
  readonly buildId: string
  readonly environment: string
  readonly timestamp: string
}

const validEnv = {
  SMART_SUGGEST_ENV: "test",
  SMART_SUGGEST_VERSION: "0.1.0",
  SMART_SUGGEST_BUILD_ID: "test-build",
  SMART_SUGGEST_ALLOWED_ORIGINS: "https://shop.example",
  SMART_SUGGEST_DEFAULT_TENANT_ID: "demo",
  SMART_SUGGEST_TENANT_HEADER: "x-smart-suggest-tenant",
} satisfies SmartSuggestEnv

describe("smart-suggest worker", () => {
  it("returns the health payload", async () => {
    const response = handleRequest(
      new Request("https://smart-suggest.example/api/v1/health", {
        headers: {
          origin: "https://shop.example",
        },
      }),
      validEnv
    )
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://shop.example"
    )
    expect(isHealthBody(body)).toBe(true)

    if (!isHealthBody(body)) {
      return
    }

    expect(body.service).toBe("smart-suggest")
    expect(body.version).toBe("0.1.0")
    expect(body.buildId).toBe("test-build")
    expect(body.environment).toBe("test")
    expect(Date.parse(body.timestamp)).not.toBeNaN()
  })

  it("does not allow unconfigured origins", () => {
    const response = handleRequest(
      new Request("https://smart-suggest.example/api/v1/health", {
        headers: {
          origin: "https://unknown.example",
        },
      }),
      validEnv
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("access-control-allow-origin")).toBeNull()
  })

  it("allows the configured tenant header in CORS preflight", () => {
    const response = handleRequest(
      new Request("https://smart-suggest.example/api/v1/health", {
        method: "OPTIONS",
        headers: {
          origin: "https://shop.example",
        },
      }),
      validEnv
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "content-type, x-smart-suggest-tenant"
    )
  })

  it("keeps the old-core SDK path reserved but unimplemented", async () => {
    const response = handleRequest(
      new Request("https://smart-suggest.example/sdk/smart-suggest.global.js"),
      validEnv
    )
    const body: unknown = await response.json()

    expect(response.status).toBe(501)
    expect(isRecord(body)).toBe(true)
  })

  it("fails closed for invalid runtime config", async () => {
    const response = handleRequest(
      new Request("https://smart-suggest.example/api/v1/health"),
      {
        SMART_SUGGEST_ENV: "demo",
      } satisfies SmartSuggestEnv
    )
    const body: unknown = await response.json()

    expect(response.status).toBe(500)
    expect(isRecord(body)).toBe(true)
  })

  it("reports invalid origins once with offending values", async () => {
    const response = handleRequest(
      new Request("https://smart-suggest.example/api/v1/health"),
      {
        ...validEnv,
        SMART_SUGGEST_ALLOWED_ORIGINS: "not-a-url,also-bad",
      } satisfies SmartSuggestEnv
    )
    const body: unknown = await response.json()

    expect(response.status).toBe(500)
    expect(hasInvalidOriginIssue(body)).toBe(true)
  })
})

function isHealthBody(value: unknown): value is HealthBody {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.service === "string" &&
    typeof value.version === "string" &&
    typeof value.buildId === "string" &&
    typeof value.environment === "string" &&
    typeof value.timestamp === "string"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function hasInvalidOriginIssue(value: unknown): boolean {
  if (!(isRecord(value) && isRecord(value.error))) {
    return false
  }

  const issues = value.error.issues

  if (!Array.isArray(issues)) {
    return false
  }

  return issues.some((issue) => {
    if (!isRecord(issue)) {
      return false
    }

    return (
      issue.code === "invalid_origin" &&
      issue.message ===
        "SMART_SUGGEST_ALLOWED_ORIGINS must contain HTTP(S) origins or *. Invalid: not-a-url, also-bad"
    )
  })
}
