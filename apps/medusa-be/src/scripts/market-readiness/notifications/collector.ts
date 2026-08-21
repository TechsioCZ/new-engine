import { createHash } from "node:crypto"
import {
  getResendTemplateDefinition,
  getResendTemplateSubject,
} from "../../../modules/resend/templates"
import {
  FOUR_MARKET_NOTIFICATION_BINDINGS,
  type FourMarketNotificationReadinessArtifact,
  type FourMarketNotificationReadinessInput,
  NOTIFICATION_CRITICAL_TEMPLATES,
  NOTIFICATION_READINESS_MARKETS,
  type NotificationCriticalTemplate,
  type NotificationMarketConfiguration,
  type NotificationMarketReadiness,
  type NotificationReadinessIssue,
  type NotificationReadinessMarket,
  type NotificationTemplateReadiness,
} from "./contracts"

const MAILBOX = /^(?:[^<>]*<)?([^<>\s@]+)@([^<>\s@]+)>?$/u
const HTML_TAG = /<\/?([A-Za-z][\w:-]*)([^>]*)>/gu
const HTML_ATTRIBUTE = /\s([A-Za-z_:][\w:.-]*)(?:\s*=|\s|$)/gu
const URL = /https?:\/\/\S+/giu
const EMAIL = /\b[^\s@]+@[^\s@]+\b/gu
const NUMBER = /\d+/gu
const WORD = /[\p{L}\p{M}]+/gu

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex")

const mailboxDomain = (value: string): string | undefined =>
  MAILBOX.exec(value.trim())?.[2]?.toLowerCase()

const htmlStructure = (html: string): string => {
  const tokens: string[] = []
  let cursor = 0
  for (const match of html.matchAll(HTML_TAG)) {
    const index = match.index ?? 0
    if (html.slice(cursor, index).trim()) {
      tokens.push("#text")
    }
    const fullTag = match[0]
    const name = match[1]?.toLowerCase() ?? "unknown"
    const closing = fullTag.startsWith("</")
    const attributes = closing
      ? []
      : [...(match[2] ?? "").matchAll(HTML_ATTRIBUTE)]
          .map((attribute) => attribute[1]?.toLowerCase())
          .filter((attribute): attribute is string => Boolean(attribute))
          .sort()
    tokens.push(
      closing
        ? `/${name}`
        : `${name}${attributes.length ? `[${attributes.join(",")}]` : ""}`
    )
    cursor = index + fullTag.length
  }
  if (html.slice(cursor).trim()) {
    tokens.push("#text")
  }
  return tokens.join("|")
}

const textStructure = (text: string): string =>
  text
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => {
      const scrubbed = line
        .replace(URL, " URL ")
        .replace(EMAIL, " EMAIL ")
        .replace(NUMBER, " NUMBER ")
      const words = scrubbed.match(WORD)?.length ?? 0
      return line.trim() ? `line:${words}` : "blank"
    })
    .join("|")

const buildSafeVariables = (
  template: NotificationCriticalTemplate,
  locale: string
): Readonly<Record<string, unknown>> => {
  const definition = getResendTemplateDefinition(template)
  const variables: Record<string, unknown> = {}
  for (const variable of [
    ...definition.requiredVariables,
    ...definition.optionalVariables,
  ]) {
    if (variable === "locale") {
      variables[variable] = locale
    } else if (variable === "items" || variable === "products") {
      variables[variable] = [{ quantity: 1, title: "SAMPLE" }]
    } else if (variable === "expires_in_minutes") {
      variables[variable] = 15
    } else {
      variables[variable] = `SAMPLE_${variable.toUpperCase()}`
    }
  }
  return variables
}

const configurationMatches = (
  expected: NotificationMarketConfiguration,
  observed: NotificationMarketConfiguration,
  market: NotificationReadinessMarket
): boolean => {
  const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
  return (
    expected.locale === binding.locale &&
    observed.locale === expected.locale &&
    expected.senderDomain === binding.senderDomain &&
    observed.senderDomain === expected.senderDomain &&
    observed.from === expected.from &&
    observed.replyTo === expected.replyTo &&
    mailboxDomain(expected.from) === binding.senderDomain &&
    mailboxDomain(expected.replyTo) === binding.senderDomain &&
    mailboxDomain(observed.from) === binding.senderDomain &&
    mailboxDomain(observed.replyTo) === binding.senderDomain
  )
}

const addIssue = (
  issues: NotificationReadinessIssue[],
  issue: NotificationReadinessIssue
): void => {
  issues.push(issue)
}

const sortIssues = (
  issues: readonly NotificationReadinessIssue[]
): readonly NotificationReadinessIssue[] => {
  const marketOrder = new Map(
    NOTIFICATION_READINESS_MARKETS.map((market, index) => [market, index])
  )
  const templateOrder = new Map(
    NOTIFICATION_CRITICAL_TEMPLATES.map((template, index) => [template, index])
  )
  return [...issues].sort(
    (left, right) =>
      (marketOrder.get(left.market) ?? -1) -
        (marketOrder.get(right.market) ?? -1) ||
      (templateOrder.get(left.template as NotificationCriticalTemplate) ?? -1) -
        (templateOrder.get(right.template as NotificationCriticalTemplate) ??
          -1) ||
      left.code.localeCompare(right.code)
  )
}

const failedTemplate = (
  locale: (typeof FOUR_MARKET_NOTIFICATION_BINDINGS)[NotificationReadinessMarket]["locale"],
  configuredTemplateMatched: boolean,
  inspection: NotificationTemplateReadiness["inspection"]
): NotificationTemplateReadiness => ({
  configuredTemplateMatched,
  htmlStructureSha256: null,
  inspection,
  locale,
  ready: false,
  rendered: false,
  subjectSha256: null,
  textStructureSha256: null,
})

type TemplateCollectionContext = Readonly<{
  baseTupleMatched: boolean
  expected: NotificationMarketConfiguration
  input: FourMarketNotificationReadinessInput
  issues: NotificationReadinessIssue[]
  market: NotificationReadinessMarket
  observed: NotificationMarketConfiguration
  template: NotificationCriticalTemplate
}>

const inspectTemplate = async (
  context: TemplateCollectionContext,
  templateId: string
): Promise<NotificationTemplateReadiness["inspection"]> => {
  if (!context.input.inspector) {
    return "notRequested"
  }
  try {
    const inspected = await context.input.inspector.inspect({
      template: context.template,
      templateId,
    })
    if (inspected.published) {
      return "passed"
    }
    addIssue(context.issues, {
      code: "REMOTE_INSPECTION_FAILED",
      market: context.market,
      template: context.template,
    })
  } catch {
    addIssue(context.issues, {
      code: "REMOTE_INSPECTION_FAILED",
      market: context.market,
      template: context.template,
    })
  }
  return "failed"
}

const renderTemplate = async (
  context: TemplateCollectionContext,
  templateId: string,
  inspection: NotificationTemplateReadiness["inspection"],
  expectedSubject: string
): Promise<NotificationTemplateReadiness> => {
  const locale = FOUR_MARKET_NOTIFICATION_BINDINGS[context.market].locale
  try {
    const rendered = await context.input.renderer.render({
      locale,
      market: context.market,
      template: context.template,
      templateId,
      variables: buildSafeVariables(context.template, locale),
    })
    const hasBodies = Boolean(rendered.html.trim() && rendered.text.trim())
    const subjectMatched = rendered.subject === expectedSubject
    if (!(hasBodies && subjectMatched)) {
      addIssue(context.issues, {
        code: subjectMatched ? "RENDER_FAILED" : "RENDERED_SUBJECT_MISMATCH",
        market: context.market,
        template: context.template,
      })
      return failedTemplate(locale, true, inspection)
    }
    return {
      configuredTemplateMatched: true,
      htmlStructureSha256: sha256(htmlStructure(rendered.html)),
      inspection,
      locale,
      ready: context.baseTupleMatched && inspection !== "failed",
      rendered: true,
      subjectSha256: sha256(rendered.subject),
      textStructureSha256: sha256(textStructure(rendered.text)),
    }
  } catch {
    addIssue(context.issues, {
      code: "RENDER_FAILED",
      market: context.market,
      template: context.template,
    })
    return failedTemplate(locale, true, inspection)
  }
}

const collectTemplate = async (
  context: TemplateCollectionContext
): Promise<NotificationTemplateReadiness> => {
  const locale = FOUR_MARKET_NOTIFICATION_BINDINGS[context.market].locale
  const expectedTemplateId = context.expected.templateMappings[context.template]
  const observedTemplateId = context.observed.templateMappings[context.template]
  const configuredTemplateMatched = Boolean(
    expectedTemplateId && observedTemplateId === expectedTemplateId
  )
  if (!configuredTemplateMatched) {
    addIssue(context.issues, {
      code: "TEMPLATE_MAPPING_MISMATCH",
      market: context.market,
      template: context.template,
    })
    return failedTemplate(
      locale,
      false,
      context.input.inspector ? "failed" : "notRequested"
    )
  }

  const inspection = await inspectTemplate(context, observedTemplateId)
  const subjectResolver =
    context.input.subjectResolver ?? getResendTemplateSubject
  const expectedSubject = subjectResolver(context.template, locale)
  if (!expectedSubject) {
    addIssue(context.issues, {
      code: "LOCALIZED_SUBJECT_MISSING",
      market: context.market,
      template: context.template,
    })
    return failedTemplate(locale, true, inspection)
  }
  return renderTemplate(
    context,
    observedTemplateId,
    inspection,
    expectedSubject
  )
}

const collectMarket = async (
  input: FourMarketNotificationReadinessInput,
  market: NotificationReadinessMarket,
  issues: NotificationReadinessIssue[]
): Promise<NotificationMarketReadiness> => {
  const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
  const expected = input.expectedMarkets[market]
  const observed = input.observedMarkets[market]
  if (!(expected && observed)) {
    addIssue(issues, {
      code: "MARKET_CONFIGURATION_MISSING",
      market,
    })
    const templates = Object.fromEntries(
      NOTIFICATION_CRITICAL_TEMPLATES.map((template) => [
        template,
        failedTemplate(
          binding.locale,
          false,
          input.inspector ? "failed" : "notRequested"
        ),
      ])
    ) as Record<NotificationCriticalTemplate, NotificationTemplateReadiness>
    return {
      locale: binding.locale,
      market,
      ready: false,
      senderDomain: binding.senderDomain,
      senderTupleMatched: false,
      templates,
    }
  }

  const senderTupleMatched = configurationMatches(expected, observed, market)
  if (!senderTupleMatched) {
    addIssue(issues, {
      code: "SENDER_TUPLE_MISMATCH",
      market,
    })
  }
  const entries = await Promise.all(
    NOTIFICATION_CRITICAL_TEMPLATES.map(
      async (template) =>
        [
          template,
          await collectTemplate({
            baseTupleMatched: senderTupleMatched,
            expected,
            input,
            issues,
            market,
            observed,
            template,
          }),
        ] as const
    )
  )
  const templates = Object.fromEntries(entries) as Record<
    NotificationCriticalTemplate,
    NotificationTemplateReadiness
  >
  return {
    locale: binding.locale,
    market,
    ready:
      senderTupleMatched &&
      Object.values(templates).every(({ ready }) => ready),
    senderDomain: binding.senderDomain,
    senderTupleMatched,
    templates,
  }
}

export const collectFourMarketNotificationReadiness = async (
  input: FourMarketNotificationReadinessInput
): Promise<FourMarketNotificationReadinessArtifact> => {
  const issues: NotificationReadinessIssue[] = []
  const results = await Promise.all(
    NOTIFICATION_READINESS_MARKETS.map(
      async (market) =>
        [market, await collectMarket(input, market, issues)] as const
    )
  )
  const marketResults = Object.fromEntries(results) as Record<
    NotificationReadinessMarket,
    NotificationMarketReadiness
  >
  const templates = Object.values(marketResults).flatMap((market) =>
    Object.values(market.templates)
  )
  const marketsReady = Object.values(marketResults).filter(
    ({ ready }) => ready
  ).length
  const templatesReady = templates.filter(({ ready }) => ready).length
  const sortedIssues = sortIssues(issues)

  return {
    issues: sortedIssues,
    marketResults,
    markets: NOTIFICATION_READINESS_MARKETS,
    ready:
      sortedIssues.length === 0 &&
      marketsReady === NOTIFICATION_READINESS_MARKETS.length,
    schemaVersion: 1,
    scope: "four-market-notification-readiness",
    summary: {
      errors: sortedIssues.length,
      marketsReady,
      templatesReady,
      templatesTotal: templates.length,
    },
  }
}
