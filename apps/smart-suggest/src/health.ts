import type { SmartSuggestConfig } from "./config"

export type SmartSuggestHealthPayload = {
  readonly service: "smart-suggest"
  readonly version: string
  readonly buildId: string
  readonly environment: SmartSuggestConfig["environment"]
  readonly timestamp: string
  readonly bindings: {
    readonly d1: "configured" | "missing"
    readonly configKv: "configured" | "missing"
    readonly cacheKv: "configured" | "missing"
    readonly providerCacheKv: "configured" | "missing"
  }
}

export function createHealthPayload(
  config: SmartSuggestConfig,
  now: Date = new Date()
): SmartSuggestHealthPayload {
  return {
    service: config.serviceName,
    version: config.version,
    buildId: config.buildId,
    environment: config.environment,
    timestamp: now.toISOString(),
    bindings: {
      d1: toBindingStatus(config.bindings.d1),
      configKv: toBindingStatus(config.bindings.configKv),
      cacheKv: toBindingStatus(config.bindings.cacheKv),
      providerCacheKv: toBindingStatus(config.bindings.providerCacheKv),
    },
  }
}

function toBindingStatus(value: boolean): "configured" | "missing" {
  return value ? "configured" : "missing"
}
