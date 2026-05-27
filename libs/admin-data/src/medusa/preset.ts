import {
  type ActionRequiredHooks,
  createActionRequiredHooks,
} from "../action-required/hooks"
import { createMedusaActionRequiredService } from "../action-required/medusa-service"
import { createActionRequiredQueryKeys } from "../action-required/query-keys"
import type {
  ActionRequiredHooksConfig,
  ActionRequiredQueryKeys,
  ActionRequiredService,
} from "../action-required/types"
import {
  createOrderExpeditionHooks,
  type OrderExpeditionHooks,
} from "../order-expedition/hooks"
import { createMedusaOrderExpeditionService } from "../order-expedition/medusa-service"
import { createOrderExpeditionQueryKeys } from "../order-expedition/query-keys"
import type {
  OrderExpeditionHooksConfig,
  OrderExpeditionQueryKeys,
  OrderExpeditionService,
} from "../order-expedition/types"
import {
  type AdminDataClient,
  type AdminDataClientConfig,
  createAdminDataClient,
} from "../shared/admin-client"
import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"

type ActionRequiredPresetConfig = {
  hooks?: Omit<
    ActionRequiredHooksConfig,
    "cacheConfig" | "queryKeyNamespace" | "queryKeys" | "service"
  >
  queryKeys?: ActionRequiredQueryKeys
  service?: ActionRequiredService
}

type OrderExpeditionPresetConfig = {
  hooks?: Omit<
    OrderExpeditionHooksConfig,
    "cacheConfig" | "queryKeyNamespace" | "queryKeys" | "service"
  >
  queryKeys?: OrderExpeditionQueryKeys
  service?: OrderExpeditionService
}

type CreatePresetWithFetchClientConfig = AdminDataClientConfig & {
  client?: AdminDataClient
}

type CreatePresetWithInjectedClientConfig = Partial<AdminDataClientConfig> & {
  client: AdminDataClient
}

export type CreateMedusaAdminDataPresetConfig = (
  | CreatePresetWithFetchClientConfig
  | CreatePresetWithInjectedClientConfig
) & {
  actionRequired?: ActionRequiredPresetConfig
  cacheConfig?: CacheConfig
  orderExpedition?: OrderExpeditionPresetConfig
  queryKeyNamespace?: QueryNamespace
}

export type MedusaAdminDataPreset = {
  cacheConfig: CacheConfig
  client: AdminDataClient
  hooks: {
    actionRequired: ActionRequiredHooks
    orderExpedition: OrderExpeditionHooks
  }
  namespace: QueryNamespace
  queryKeys: {
    actionRequired: ActionRequiredQueryKeys
    orderExpedition: OrderExpeditionQueryKeys
  }
  services: {
    actionRequired: ActionRequiredService
    orderExpedition: OrderExpeditionService
  }
}

export function createMedusaAdminDataQueryKeys(namespace: QueryNamespace) {
  return {
    actionRequired: createActionRequiredQueryKeys(namespace),
    orderExpedition: createOrderExpeditionQueryKeys(namespace),
  }
}

function resolveFetchClientConfig(
  client: AdminDataClient | undefined,
  clientConfig: Partial<AdminDataClientConfig>
): AdminDataClient {
  if (client) {
    return client
  }

  if (!clientConfig.baseUrl) {
    throw new Error(
      "createMedusaAdminDataPreset requires baseUrl when client is not provided"
    )
  }

  return createAdminDataClient({
    baseUrl: clientConfig.baseUrl,
    fetch: clientConfig.fetch,
    getToken: clientConfig.getToken,
  })
}

export function createMedusaAdminDataPreset({
  actionRequired,
  cacheConfig,
  client,
  orderExpedition,
  queryKeyNamespace,
  ...clientConfig
}: CreateMedusaAdminDataPresetConfig): MedusaAdminDataPreset {
  const namespace = queryKeyNamespace ?? [
    "admin-data",
    clientConfig.baseUrl ?? "client",
  ]
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedClient = resolveFetchClientConfig(client, clientConfig)
  const queryKeys = {
    actionRequired:
      actionRequired?.queryKeys ?? createActionRequiredQueryKeys(namespace),
    orderExpedition:
      orderExpedition?.queryKeys ?? createOrderExpeditionQueryKeys(namespace),
  }
  const services = {
    actionRequired:
      actionRequired?.service ??
      createMedusaActionRequiredService(resolvedClient),
    orderExpedition:
      orderExpedition?.service ??
      createMedusaOrderExpeditionService(resolvedClient),
  }
  const hooks = {
    actionRequired: createActionRequiredHooks({
      ...(actionRequired?.hooks ?? {}),
      cacheConfig: resolvedCacheConfig,
      queryKeys: queryKeys.actionRequired,
      service: services.actionRequired,
    }),
    orderExpedition: createOrderExpeditionHooks({
      ...(orderExpedition?.hooks ?? {}),
      cacheConfig: resolvedCacheConfig,
      queryKeys: queryKeys.orderExpedition,
      service: services.orderExpedition,
    }),
  }

  return {
    cacheConfig: resolvedCacheConfig,
    client: resolvedClient,
    hooks,
    namespace,
    queryKeys,
    services,
  }
}
