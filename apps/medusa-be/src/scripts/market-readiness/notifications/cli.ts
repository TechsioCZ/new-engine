import { isAbsolute, resolve } from "node:path"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  DEFAULT_RESEND_API_URL,
  RESEND_CONFIG_MODULE,
  type ResendConfigModuleService,
  type ResendRuntimeConfig,
} from "../../../modules/resend-config"
import { writeNotificationReadinessArtifact } from "./artifact"
import {
  type FourMarketNotificationReadinessAuthority,
  loadNotificationReadinessAuthority,
} from "./authority"
import { collectFourMarketNotificationReadiness } from "./collector"
import {
  FOUR_MARKET_NOTIFICATION_BINDINGS,
  type FourMarketNotificationReadinessArtifact,
  NOTIFICATION_READINESS_MARKETS,
  type NotificationMarketConfiguration,
  type NotificationReadinessMarket,
} from "./contracts"
import {
  createResendTemplateInspectionAdapter,
  type ResendTemplateInspectionOptions,
} from "./resend-inspection"

const SHA256 = /^[a-f0-9]{64}$/u

export type NotificationReadinessCliOptions = Readonly<{
  authorityPath: string
  expectedAuthoritySha256: string
  outputPath: string
}>

const valueAfter = (args: readonly string[], flag: string): string => {
  const positions = args.flatMap((argument, index) =>
    argument === flag ? [index] : []
  )
  if (positions.length !== 1) {
    throw new Error(`${flag} must be provided exactly once`)
  }
  const value = args[(positions[0] as number) + 1]
  if (!(value && !value.startsWith("--"))) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

const canonicalAbsolutePath = (value: string, flag: string): string => {
  if (!isAbsolute(value) || resolve(value) !== value) {
    throw new Error(`${flag} must be a canonical absolute path`)
  }
  return value
}

export const parseNotificationReadinessCliOptions = (
  args: readonly string[]
): NotificationReadinessCliOptions => {
  const flags = [
    "--authority",
    "--expected-authority-sha256",
    "--output",
  ] as const
  if (args.length !== flags.length * 2) {
    throw new Error(
      "notification readiness collection requires exactly three flag/value pairs"
    )
  }
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    if (!(flag && flags.includes(flag as (typeof flags)[number]))) {
      throw new Error(
        `unknown notification readiness collection option ${flag ?? "<missing>"}`
      )
    }
  }
  const authorityPath = canonicalAbsolutePath(
    valueAfter(args, "--authority"),
    "--authority"
  )
  const outputPath = canonicalAbsolutePath(
    valueAfter(args, "--output"),
    "--output"
  )
  if (authorityPath === outputPath) {
    throw new Error("notification authority and output paths must be distinct")
  }
  const expectedAuthoritySha256 = valueAfter(
    args,
    "--expected-authority-sha256"
  )
  if (!SHA256.test(expectedAuthoritySha256)) {
    throw new Error("--expected-authority-sha256 must be a lowercase SHA-256")
  }
  return { authorityPath, expectedAuthoritySha256, outputPath }
}

const assertExactRuntimeMarkets = (runtime: ResendRuntimeConfig): void => {
  const actualMarkets = Object.keys(runtime.market_configurations).sort()
  const expectedMarkets = [...NOTIFICATION_READINESS_MARKETS].sort()
  if (JSON.stringify(actualMarkets) !== JSON.stringify(expectedMarkets)) {
    throw new Error(
      "Resend runtime configuration must contain exactly SK, CZ, HU, and RO market tuples"
    )
  }
}

export const buildObservedNotificationMarkets = (
  runtime: ResendRuntimeConfig
): Readonly<
  Record<NotificationReadinessMarket, NotificationMarketConfiguration>
> => {
  assertExactRuntimeMarkets(runtime)
  return Object.fromEntries(
    NOTIFICATION_READINESS_MARKETS.map((market) => {
      const configuration = runtime.market_configurations[market]
      if (!configuration) {
        throw new Error(
          "Resend runtime configuration is missing a required market tuple"
        )
      }
      const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
      return [
        market,
        {
          from: configuration.from_email,
          locale: binding.locale,
          replyTo: configuration.reply_to,
          senderDomain: binding.senderDomain,
          templateMappings: configuration.template_mappings,
        },
      ] as const
    })
  ) as Record<NotificationReadinessMarket, NotificationMarketConfiguration>
}

export type NotificationReadinessCliDependencies = Readonly<{
  collect: typeof collectFourMarketNotificationReadiness
  createInspectionAdapter: (
    options: ResendTemplateInspectionOptions
  ) => ReturnType<typeof createResendTemplateInspectionAdapter>
  loadAuthority: (
    path: string,
    expectedSha256: string
  ) => Promise<FourMarketNotificationReadinessAuthority>
  loadRuntimeConfig: () => Promise<ResendRuntimeConfig>
  writeArtifact: (
    outputPath: string,
    artifact: FourMarketNotificationReadinessArtifact
  ) => Promise<Readonly<{ path: string; sha256: string }>>
}>

export const runNotificationReadinessCli = async (
  options: NotificationReadinessCliOptions,
  dependencies: NotificationReadinessCliDependencies
): Promise<
  Readonly<{
    artifact: Readonly<{ path: string; sha256: string }>
    report: FourMarketNotificationReadinessArtifact
  }>
> => {
  const [authority, runtime] = await Promise.all([
    dependencies.loadAuthority(
      options.authorityPath,
      options.expectedAuthoritySha256
    ),
    dependencies.loadRuntimeConfig(),
  ])
  if (runtime.api_url !== DEFAULT_RESEND_API_URL) {
    throw new Error(
      "Notification readiness inspection requires the trusted Resend API origin"
    )
  }
  const observedMarkets = buildObservedNotificationMarkets(runtime)
  const inspection = dependencies.createInspectionAdapter({
    apiKey: runtime.api_key,
    apiUrl: runtime.api_url,
    requestTimeoutMs: runtime.request_timeout_ms,
  })
  const report = await dependencies.collect({
    expectedBodyProofs: authority.expectedBodyProofs,
    expectedMarkets: authority.expectedMarkets,
    inspector: inspection.inspector,
    observedMarkets,
    renderer: inspection.renderer,
  })
  const artifact = await dependencies.writeArtifact(options.outputPath, report)
  return { artifact, report }
}

export default async function collectNotificationReadiness({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const service =
    container.resolve<ResendConfigModuleService>(RESEND_CONFIG_MODULE)
  const options = parseNotificationReadinessCliOptions(args)
  logger.info("[four-market notifications] starting read-only inspection")
  const result = await runNotificationReadinessCli(options, {
    collect: collectFourMarketNotificationReadiness,
    createInspectionAdapter: createResendTemplateInspectionAdapter,
    loadAuthority: loadNotificationReadinessAuthority,
    loadRuntimeConfig: () => service.getRuntimeConfig(),
    writeArtifact: writeNotificationReadinessArtifact,
  })
  if (!result.report.ready) {
    throw new Error(
      `FOUR_MARKET_NOTIFICATIONS_NOT_READY: errors=${result.report.summary.errors}`
    )
  }
  logger.info(
    `[four-market notifications] READY artifact=${result.artifact.path} sha256=${result.artifact.sha256}`
  )
  return result
}
