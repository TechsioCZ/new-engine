import type { SmartSuggestWorkerHandler } from "./cloudflare-runtime"
import {
  loadSmartSuggestConfig,
  type SmartSuggestConfig,
  type SmartSuggestConfigResult,
  type SmartSuggestEnv,
} from "./config"
import { createHealthPayload } from "./health"
import { emptyCorsResponse, jsonResponse } from "./http"

const healthPath = "/api/v1/health"
const sdkPathPrefix = "/sdk/"
const configResultsByEnv = new WeakMap<
  SmartSuggestEnv,
  SmartSuggestConfigResult
>()

const worker = {
  fetch(request: Request, env: SmartSuggestEnv): Response {
    return handleRequest(request, env)
  },
} satisfies SmartSuggestWorkerHandler<SmartSuggestEnv>

export default worker

export function handleRequest(
  request: Request,
  env: SmartSuggestEnv
): Response {
  const configResult = loadConfigResult(env)

  if (!configResult.ok) {
    return new Response(
      JSON.stringify({
        error: {
          code: "invalid_runtime_config",
          issues: configResult.issues,
        },
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      }
    )
  }

  const config = configResult.config

  if (request.method === "OPTIONS") {
    return emptyCorsResponse(request, config)
  }

  const url = new URL(request.url)

  if (url.pathname === healthPath) {
    return handleHealth(request, config)
  }

  if (url.pathname.startsWith(sdkPathPrefix)) {
    return jsonResponse(
      request,
      config,
      {
        error: {
          code: "sdk_surface_reserved",
          message:
            "The old-core global vanilla SDK surface is reserved for a later issue.",
        },
      },
      {
        status: 501,
      }
    )
  }

  return jsonResponse(
    request,
    config,
    {
      error: {
        code: "not_found",
      },
    },
    {
      status: 404,
    }
  )
}

function handleHealth(request: Request, config: SmartSuggestConfig): Response {
  if (request.method !== "GET") {
    return jsonResponse(
      request,
      config,
      {
        error: {
          code: "method_not_allowed",
        },
      },
      {
        status: 405,
        headers: {
          allow: "GET, OPTIONS",
        },
      }
    )
  }

  return jsonResponse(request, config, createHealthPayload(config))
}

function loadConfigResult(env: SmartSuggestEnv): SmartSuggestConfigResult {
  const cachedConfigResult = configResultsByEnv.get(env)

  if (cachedConfigResult) {
    return cachedConfigResult
  }

  const configResult = loadSmartSuggestConfig(env)
  configResultsByEnv.set(env, configResult)

  return configResult
}
