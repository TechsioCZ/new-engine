import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { equalLowercaseSha256, parseCanonicalJsonWithLf } from "../canonical"
import {
  FOUR_MARKET_NOTIFICATION_BINDINGS,
  NOTIFICATION_CRITICAL_TEMPLATES,
  NOTIFICATION_READINESS_MARKETS,
  type NotificationCriticalTemplate,
  type NotificationMarketConfiguration,
  type NotificationReadinessMarket,
  type NotificationTemplateBodyProof,
} from "./contracts"

const SHA256 = /^[a-f0-9]{64}$/u
const MAILBOX = /^(?:[^<>]*<)?([^<>\s@]+)@([^<>\s@]+)>?$/u

export type FourMarketNotificationReadinessAuthority = Readonly<{
  expectedBodyProofs: Readonly<
    Record<
      NotificationReadinessMarket,
      Readonly<
        Record<NotificationCriticalTemplate, NotificationTemplateBodyProof>
      >
    >
  >
  expectedMarkets: Readonly<
    Record<NotificationReadinessMarket, NotificationMarketConfiguration>
  >
  markets: typeof NOTIFICATION_READINESS_MARKETS
  schemaVersion: 1
  scope: "four-market-notification-readiness-authority"
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[]
): boolean =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())

const invalidAuthority = (): never => {
  throw new Error("Four-market notification readiness authority is invalid")
}

const mailboxDomain = (value: string): string | undefined =>
  MAILBOX.exec(value.trim())?.[2]?.toLowerCase()

const parseTemplateMappings = (
  value: unknown
): Readonly<Record<NotificationCriticalTemplate, string>> => {
  if (
    !(isRecord(value) && hasExactKeys(value, NOTIFICATION_CRITICAL_TEMPLATES))
  ) {
    return invalidAuthority()
  }
  const entries = NOTIFICATION_CRITICAL_TEMPLATES.map((template) => {
    const templateId = value[template]
    if (typeof templateId !== "string" || !templateId.trim()) {
      return invalidAuthority()
    }
    return [template, templateId.trim()] as const
  })
  return Object.fromEntries(entries) as Record<
    NotificationCriticalTemplate,
    string
  >
}

const parseMarketConfiguration = (
  value: unknown,
  market: NotificationReadinessMarket
): NotificationMarketConfiguration => {
  const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
  if (
    !(
      isRecord(value) &&
      hasExactKeys(value, [
        "from",
        "locale",
        "replyTo",
        "senderDomain",
        "templateMappings",
      ])
    ) ||
    typeof value.from !== "string" ||
    typeof value.replyTo !== "string" ||
    value.locale !== binding.locale ||
    value.senderDomain !== binding.senderDomain ||
    mailboxDomain(value.from) !== binding.senderDomain ||
    mailboxDomain(value.replyTo) !== binding.senderDomain
  ) {
    return invalidAuthority()
  }
  return {
    from: value.from,
    locale: binding.locale,
    replyTo: value.replyTo,
    senderDomain: binding.senderDomain,
    templateMappings: parseTemplateMappings(value.templateMappings),
  }
}

const parseBodyProofs = (
  value: unknown
): Readonly<
  Record<NotificationCriticalTemplate, NotificationTemplateBodyProof>
> => {
  if (
    !(isRecord(value) && hasExactKeys(value, NOTIFICATION_CRITICAL_TEMPLATES))
  ) {
    return invalidAuthority()
  }
  const entries = NOTIFICATION_CRITICAL_TEMPLATES.map((template) => {
    const proof = value[template]
    if (
      !(isRecord(proof) && hasExactKeys(proof, ["htmlSha256", "textSha256"])) ||
      typeof proof.htmlSha256 !== "string" ||
      !SHA256.test(proof.htmlSha256) ||
      typeof proof.textSha256 !== "string" ||
      !SHA256.test(proof.textSha256)
    ) {
      return invalidAuthority()
    }
    return [
      template,
      { htmlSha256: proof.htmlSha256, textSha256: proof.textSha256 },
    ] as const
  })
  return Object.fromEntries(entries) as Record<
    NotificationCriticalTemplate,
    NotificationTemplateBodyProof
  >
}

const parseMarketRecord = <Value>(
  value: unknown,
  parse: (entry: unknown, market: NotificationReadinessMarket) => Value
): Readonly<Record<NotificationReadinessMarket, Value>> => {
  if (
    !(isRecord(value) && hasExactKeys(value, NOTIFICATION_READINESS_MARKETS))
  ) {
    return invalidAuthority()
  }
  return Object.fromEntries(
    NOTIFICATION_READINESS_MARKETS.map((market) => [
      market,
      parse(value[market], market),
    ])
  ) as Record<NotificationReadinessMarket, Value>
}

export const parseNotificationReadinessAuthority = (
  serialized: string
): FourMarketNotificationReadinessAuthority => {
  const value = parseCanonicalJsonWithLf(serialized)
  if (
    !(
      isRecord(value) &&
      hasExactKeys(value, [
        "expectedBodyProofs",
        "expectedMarkets",
        "markets",
        "schemaVersion",
        "scope",
      ])
    ) ||
    value.schemaVersion !== 1 ||
    value.scope !== "four-market-notification-readiness-authority" ||
    JSON.stringify(value.markets) !==
      JSON.stringify(NOTIFICATION_READINESS_MARKETS)
  ) {
    return invalidAuthority()
  }
  return {
    expectedBodyProofs: parseMarketRecord(
      value.expectedBodyProofs,
      parseBodyProofs
    ),
    expectedMarkets: parseMarketRecord(
      value.expectedMarkets,
      parseMarketConfiguration
    ),
    markets: NOTIFICATION_READINESS_MARKETS,
    schemaVersion: 1,
    scope: "four-market-notification-readiness-authority",
  }
}

export const loadNotificationReadinessAuthority = async (
  path: string,
  expectedSha256: string
): Promise<FourMarketNotificationReadinessAuthority> => {
  const serialized = await readFile(path, "utf8")
  const actualSha256 = createHash("sha256")
    .update(serialized, "utf8")
    .digest("hex")
  if (!equalLowercaseSha256(actualSha256, expectedSha256)) {
    throw new Error(
      "Notification readiness authority does not match the externally reviewed SHA-256"
    )
  }
  return parseNotificationReadinessAuthority(serialized)
}
