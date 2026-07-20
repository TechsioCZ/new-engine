import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { DATABASE_MODULE } from "../modules/database"
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

type PaymentProviderConfig = {
  id: string
  options?: Record<string, unknown>
  resolve: string
}

function buildPaymentProviders(env: MedusaConfigEnv): PaymentProviderConfig[] {
  const providers: PaymentProviderConfig[] = []

  if (env.featurePaymentQrEnabled) {
    providers.push({
      resolve: "./src/modules/payment-qr/services/manual",
      id: QR_PAYMENT_PROVIDER_ID,
      options: {},
    })
  }

  providers.push(...buildPaykitPaymentProviders())

  return providers
}

function buildPaymentDependencies(env: MedusaConfigEnv): string[] {
  const dependencies: string[] = []

  if (env.featurePaymentQrEnabled) {
    dependencies.push(QR_PAYMENT_MODULE)
  }

  return dependencies
}

function buildPaymentModule(env: MedusaConfigEnv): MedusaModuleConfig {
  return {
    resolve: "@medusajs/medusa/payment",
    dependencies: buildPaymentDependencies(env),
    options: {
      providers: buildPaymentProviders(env),
    },
  }
}

function buildPaymentQrModules(env: MedusaConfigEnv): MedusaModuleConfig[] {
  const modules: MedusaModuleConfig[] = []

  if (env.featurePaymentQrEnabled) {
    modules.push({
      resolve: "./src/modules/payment-qr",
    })
  }

  return modules
}

function buildFulfillmentClientModules(
  env: MedusaConfigEnv
): MedusaModuleConfig[] {
  const modules: MedusaModuleConfig[] = []

  if (env.featurePplEnabled) {
    modules.push({
      resolve: "./src/modules/ppl-client",
      dependencies: [Modules.LOCKING],
      options: {
        environment: env.pplEnvironment,
      },
    })
  }

  if (env.featurePacketaEnabled) {
    modules.push({
      resolve: "./src/modules/packeta-client",
      dependencies: [Modules.LOCKING],
      options: {
        environment: env.packetaEnvironment,
      },
    })
  }

  return modules
}

function buildFulfillmentDependencies(env: MedusaConfigEnv): string[] {
  const dependencies: string[] = []

  if (env.featurePplEnabled) {
    dependencies.push("ppl_client")
  }

  if (env.featurePacketaEnabled) {
    dependencies.push(
      "packeta_client",
      Modules.FILE,
      ContainerRegistrationKeys.QUERY
    )
  }

  return dependencies
}

function buildFulfillmentProviders(
  env: MedusaConfigEnv
): PaymentProviderConfig[] {
  const providers: PaymentProviderConfig[] = [
    {
      resolve: "@medusajs/medusa/fulfillment-manual",
      id: "manual",
    },
  ]

  if (env.featurePplEnabled) {
    providers.push({
      resolve: "./src/modules/fulfillment-ppl",
      id: "ppl",
    })
  }

  if (env.featurePacketaEnabled) {
    providers.push({
      resolve: "./src/modules/fulfillment-packeta",
      id: "packeta",
    })
  }

  return providers
}

function buildFulfillmentModules(env: MedusaConfigEnv): MedusaModuleConfig[] {
  const modules: MedusaModuleConfig[] = []

  if (!(env.featurePplEnabled || env.featurePacketaEnabled)) {
    return modules
  }

  modules.push({
    resolve: "@medusajs/medusa/fulfillment",
    dependencies: buildFulfillmentDependencies(env),
    options: {
      providers: buildFulfillmentProviders(env),
    },
  })

  return modules
}

function buildPayloadModules(env: MedusaConfigEnv): MedusaModuleConfig[] {
  const modules: MedusaModuleConfig[] = []

  if (env.featurePayloadEnabled) {
    modules.push({
      resolve: "./src/modules/payload",
      options: {
        serverUrl: env.payloadBaseUrl,
        apiKey: env.payloadApiKey,
        contentCacheTtl: env.payloadContentCacheTtl,
        listCacheTtl: env.payloadListCacheTtl,
      },
    })
  }

  return modules
}

export function buildModules(env: MedusaConfigEnv): MedusaModulesConfig {
  return [
    {
      resolve: "@medusajs/medusa/translation",
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: buildNotificationProviders(env),
      },
    },
    buildCachingModule(env),
    {
      resolve: "./src/modules/producer",
    },
    {
      resolve: "./src/modules/measurement-unit",
    },
    {
      resolve: "./src/modules/product-list",
    },
    {
      resolve: "./src/modules/product-review",
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
      resolve: "./src/modules/order-note",
      dependencies: [DATABASE_MODULE],
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
}
