import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { API_STORE_MODULE } from "../modules/api-store"
import { DATABASE_MODULE } from "../modules/database"
import { GLS_CLIENT_MODULE } from "../modules/gls-client/constants"
import { buildPaykitPaymentProviders } from "../modules/payment-paykit/medusa-config"
import {
  QR_PAYMENT_MODULE,
  QR_PAYMENT_PROVIDER_ID,
} from "../modules/payment-qr/constants"
import type { MedusaConfigEnv } from "./env"
import {
  buildCachingModule,
  buildEventBusModule,
  buildFileModule,
  buildLockingModule,
  buildNotificationProviders,
  buildWorkflowEngineModule,
} from "./providers"
import type { MedusaModuleConfig, MedusaModulesConfig } from "./types"

interface PaymentProviderConfig {
  id: string
  options?: object
  resolve: string
}

const buildPaymentProviders = (
  env: MedusaConfigEnv,
): PaymentProviderConfig[] => {
  const providers: PaymentProviderConfig[] = []

  if (env.featurePaymentQrEnabled) {
    providers.push({
      id: QR_PAYMENT_PROVIDER_ID,
      options: {},
      resolve: "./src/modules/payment-qr/services/manual",
    })
  }

  providers.push(...buildPaykitPaymentProviders())

  return providers
}

const buildPaymentDependencies = (env: MedusaConfigEnv): string[] => {
  const dependencies: string[] = [API_STORE_MODULE]

  if (env.featurePaymentQrEnabled) {
    dependencies.push(QR_PAYMENT_MODULE)
  }

  return [...new Set(dependencies)]
}

const buildPaymentModule = (env: MedusaConfigEnv): MedusaModuleConfig => ({
  dependencies: buildPaymentDependencies(env),
  options: {
    providers: buildPaymentProviders(env),
  },
  resolve: "@medusajs/medusa/payment",
})

const buildPaymentQrModules = (env: MedusaConfigEnv): MedusaModuleConfig[] => {
  const modules: MedusaModuleConfig[] = []

  if (env.featurePaymentQrEnabled) {
    modules.push({
      resolve: "./src/modules/payment-qr",
    })
  }

  return modules
}

const buildFulfillmentClientModules = (
  env: MedusaConfigEnv,
): MedusaModuleConfig[] => {
  const modules: MedusaModuleConfig[] = []

  if (env.featurePplEnabled) {
    modules.push({
      dependencies: [Modules.LOCKING],
      options: {
        environment: env.pplEnvironment,
      },
      resolve: "./src/modules/ppl-client",
    })
  }

  if (env.featurePacketaEnabled) {
    modules.push({
      dependencies: [Modules.LOCKING, API_STORE_MODULE],
      options: {
        environment: env.packetaEnvironment,
      },
      resolve: "./src/modules/packeta-client",
    })
  }

  if (env.featureGlsEnabled) {
    modules.push({
      dependencies: [Modules.LOCKING],
      options: {
        environment: env.glsEnvironment,
      },
      resolve: "./src/modules/gls-client",
    })
  }

  return modules
}

const buildFulfillmentDependencies = (env: MedusaConfigEnv): string[] => {
  const dependencies: string[] = []

  if (env.featurePplEnabled) {
    dependencies.push("ppl_client")
  }

  if (env.featurePacketaEnabled) {
    dependencies.push(
      "packeta_client",
      Modules.FILE,
      ContainerRegistrationKeys.QUERY,
    )
  }

  if (env.featureGlsEnabled) {
    dependencies.push(
      GLS_CLIENT_MODULE,
      Modules.FILE,
      ContainerRegistrationKeys.QUERY,
    )
  }

  return [...new Set(dependencies)]
}

const buildFulfillmentProviders = (
  env: MedusaConfigEnv,
): PaymentProviderConfig[] => {
  const providers: PaymentProviderConfig[] = [
    {
      id: "manual",
      resolve: "@medusajs/medusa/fulfillment-manual",
    },
  ]

  if (env.featurePplEnabled) {
    providers.push({
      id: "ppl",
      resolve: "./src/modules/fulfillment-ppl",
    })
  }

  if (env.featurePacketaEnabled) {
    providers.push({
      id: "packeta",
      resolve: "./src/modules/fulfillment-packeta",
    })
  }

  if (env.featureGlsEnabled) {
    providers.push({
      id: "gls",
      resolve: "./src/modules/fulfillment-gls",
    })
  }

  return providers
}

const buildFulfillmentModules = (
  env: MedusaConfigEnv,
): MedusaModuleConfig[] => {
  const modules: MedusaModuleConfig[] = []

  if (
    !(
      env.featurePplEnabled ||
      env.featurePacketaEnabled ||
      env.featureGlsEnabled
    )
  ) {
    return modules
  }

  modules.push({
    dependencies: buildFulfillmentDependencies(env),
    options: {
      providers: buildFulfillmentProviders(env),
    },
    resolve: "@medusajs/medusa/fulfillment",
  })

  return modules
}

const buildPayloadModules = (env: MedusaConfigEnv): MedusaModuleConfig[] => {
  const modules: MedusaModuleConfig[] = []

  if (env.featurePayloadEnabled) {
    modules.push({
      options: {
        apiKey: env.payloadApiKey,
        contentCacheTtl: env.payloadContentCacheTtl,
        listCacheTtl: env.payloadListCacheTtl,
        serverUrl: env.payloadBaseUrl,
      },
      resolve: "./src/modules/payload",
    })
  }

  return modules
}

export const buildModules = (env: MedusaConfigEnv): MedusaModulesConfig => [
  {
    resolve: "@medusajs/medusa/translation",
  },
  {
    dependencies: [API_STORE_MODULE],
    options: {
      providers: buildNotificationProviders(env),
    },
    resolve: "@medusajs/medusa/notification",
  },
  buildCachingModule(env),
  {
    resolve: "./src/modules/brand",
  },
  {
    resolve: "./src/modules/measurement-unit",
  },
  {
    resolve: "./src/modules/product-attribute",
  },
  {
    resolve: "./src/modules/api-store",
  },
  {
    dependencies: [API_STORE_MODULE],
    resolve: "./src/modules/shop-review",
  },
  {
    resolve: "./src/modules/product-list",
  },
  {
    resolve: "./src/modules/product-review",
  },
  {
    dependencies: [Modules.CACHING],
    resolve: "./src/modules/search-profile",
  },
  {
    resolve: "./src/modules/storefront-text",
  },
  {
    resolve: "./src/modules/company",
  },
  {
    resolve: "./src/modules/quote",
  },
  {
    resolve: "./src/modules/database",
  },
  {
    dependencies: [DATABASE_MODULE],
    resolve: "./src/modules/order-note",
  },
  {
    resolve: "./src/modules/approval",
  },
  {
    resolve: "./src/modules/email-log",
  },
  {
    resolve: "./src/modules/order-receipt",
  },
  {
    resolve: "./src/modules/workflow-queue",
  },
  ...buildPaymentQrModules(env),
  buildEventBusModule(env),
  buildWorkflowEngineModule(env),
  buildLockingModule(env),
  buildFileModule(env),
  {
    resolve: "@medusajs/index",
  },
  buildPaymentModule(env),
  ...buildFulfillmentClientModules(env),
  ...buildFulfillmentModules(env),
  ...buildPayloadModules(env),
]
