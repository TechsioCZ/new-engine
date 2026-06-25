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
