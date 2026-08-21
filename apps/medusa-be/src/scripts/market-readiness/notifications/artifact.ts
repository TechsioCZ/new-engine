import { createHash, randomUUID } from "node:crypto"
import { link, lstat, open, realpath, unlink } from "node:fs/promises"
import { basename, dirname, isAbsolute, resolve } from "node:path"
import { canonicalJsonWithLf, parseCanonicalJsonWithLf } from "../canonical"
import {
  FOUR_MARKET_NOTIFICATION_BINDINGS,
  type FourMarketNotificationReadinessArtifact,
  NOTIFICATION_CRITICAL_TEMPLATES,
  NOTIFICATION_READINESS_MARKETS,
  type NotificationCriticalTemplate,
  type NotificationMarketReadiness,
  type NotificationReadinessIssue,
  type NotificationReadinessMarket,
  type NotificationTemplateReadiness,
} from "./contracts"

const SHA256 = /^[a-f0-9]{64}$/u
const ISSUE_CODES = new Set([
  "LOCALIZED_SUBJECT_MISSING",
  "MARKET_CONFIGURATION_MISSING",
  "RENDER_FAILED",
  "RENDERED_SUBJECT_MISMATCH",
  "REMOTE_INSPECTION_FAILED",
  "SENDER_TUPLE_MISMATCH",
  "TEMPLATE_MAPPING_MISMATCH",
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[]
): boolean =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())

const invalid = (): never => {
  throw new Error("Four-market notification readiness artifact is invalid")
}

const assertStableOutputParent = async (
  parentPath: string,
  expected: Readonly<{ dev: number; ino: number }>
) => {
  const [parent, physicalParentPath] = await Promise.all([
    lstat(parentPath),
    realpath(parentPath),
  ])
  if (
    parent.isSymbolicLink() ||
    !parent.isDirectory() ||
    physicalParentPath !== parentPath ||
    parent.dev !== expected.dev ||
    parent.ino !== expected.ino
  ) {
    throw new Error(
      "Notification readiness output parent changed during artifact publication"
    )
  }
}

const assertSameRegularFile = (
  expected: Readonly<{ dev: number; ino: number }>,
  actual: Awaited<ReturnType<typeof lstat>>,
  label: string
) => {
  if (
    actual.isSymbolicLink() ||
    !actual.isFile() ||
    actual.dev !== expected.dev ||
    actual.ino !== expected.ino
  ) {
    throw new Error(`${label} changed during artifact publication`)
  }
}

const isNotificationReadinessMarket = (
  value: unknown
): value is NotificationReadinessMarket =>
  typeof value === "string" &&
  NOTIFICATION_READINESS_MARKETS.some((market) => market === value)

const isNotificationCriticalTemplate = (
  value: unknown
): value is NotificationCriticalTemplate =>
  typeof value === "string" &&
  NOTIFICATION_CRITICAL_TEMPLATES.some((template) => template === value)

const isIssueCode = (
  value: unknown
): value is NotificationReadinessIssue["code"] =>
  typeof value === "string" && ISSUE_CODES.has(value)

const isIssue = (value: unknown): value is NotificationReadinessIssue => {
  if (!isRecord(value)) {
    return false
  }
  const hasTemplate = "template" in value
  return (
    hasExactKeys(
      value,
      hasTemplate ? ["code", "market", "template"] : ["code", "market"]
    ) &&
    isIssueCode(value.code) &&
    isNotificationReadinessMarket(value.market) &&
    (!hasTemplate || isNotificationCriticalTemplate(value.template))
  )
}

type ParsedHeader = Readonly<{
  issues: readonly NotificationReadinessIssue[]
  marketResults: Record<string, unknown>
  ready: boolean
  summary: Record<string, unknown>
}>

const parseHeader = (value: unknown): ParsedHeader => {
  if (
    !(
      isRecord(value) &&
      hasExactKeys(value, [
        "issues",
        "marketResults",
        "markets",
        "ready",
        "schemaVersion",
        "scope",
        "summary",
      ])
    ) ||
    value.schemaVersion !== 1 ||
    value.scope !== "four-market-notification-readiness" ||
    JSON.stringify(value.markets) !==
      JSON.stringify(NOTIFICATION_READINESS_MARKETS) ||
    typeof value.ready !== "boolean" ||
    !Array.isArray(value.issues) ||
    !value.issues.every(isIssue) ||
    !isRecord(value.marketResults) ||
    !hasExactKeys(value.marketResults, NOTIFICATION_READINESS_MARKETS) ||
    !isRecord(value.summary)
  ) {
    return invalid()
  }
  return {
    issues: value.issues,
    marketResults: value.marketResults,
    ready: value.ready,
    summary: value.summary,
  }
}

const isNullableSha256 = (value: unknown): value is string | null =>
  value === null || (typeof value === "string" && SHA256.test(value))

const isInspection = (
  value: unknown
): value is NotificationTemplateReadiness["inspection"] =>
  value === "failed" || value === "notRequested" || value === "passed"

const parseTemplateProof = (
  value: unknown,
  locale: NotificationTemplateReadiness["locale"]
): NotificationTemplateReadiness => {
  if (
    !(
      isRecord(value) &&
      hasExactKeys(value, [
        "configuredTemplateMatched",
        "htmlStructureSha256",
        "inspection",
        "locale",
        "ready",
        "rendered",
        "subjectSha256",
        "textStructureSha256",
      ])
    ) ||
    value.locale !== locale ||
    typeof value.configuredTemplateMatched !== "boolean" ||
    typeof value.ready !== "boolean" ||
    typeof value.rendered !== "boolean" ||
    !isInspection(value.inspection)
  ) {
    return invalid()
  }
  const htmlStructureSha256 = value.htmlStructureSha256
  const subjectSha256 = value.subjectSha256
  const textStructureSha256 = value.textStructureSha256
  if (
    !(
      isNullableSha256(htmlStructureSha256) &&
      isNullableSha256(subjectSha256) &&
      isNullableSha256(textStructureSha256)
    )
  ) {
    return invalid()
  }
  const hashes = [htmlStructureSha256, subjectSha256, textStructureSha256]
  const hasAllHashes = hashes.every(
    (hash) => typeof hash === "string" && SHA256.test(hash)
  )
  const hasNoHashes = hashes.every((hash) => hash === null)
  if (
    value.rendered !== hasAllHashes ||
    !(hasAllHashes || hasNoHashes) ||
    (value.ready &&
      (!(value.configuredTemplateMatched && value.rendered) ||
        value.inspection === "failed"))
  ) {
    return invalid()
  }
  return {
    configuredTemplateMatched: value.configuredTemplateMatched,
    htmlStructureSha256,
    inspection: value.inspection,
    locale,
    ready: value.ready,
    rendered: value.rendered,
    subjectSha256,
    textStructureSha256,
  }
}

const parseTemplates = (
  value: unknown,
  locale: NotificationTemplateReadiness["locale"]
): Readonly<
  Record<NotificationCriticalTemplate, NotificationTemplateReadiness>
> => {
  if (
    !(isRecord(value) && hasExactKeys(value, NOTIFICATION_CRITICAL_TEMPLATES))
  ) {
    return invalid()
  }
  const templates = NOTIFICATION_CRITICAL_TEMPLATES.map((template) => [
    template,
    parseTemplateProof(value[template], locale),
  ])
  return Object.fromEntries(templates)
}

const parseMarketResult = (
  value: unknown,
  market: NotificationReadinessMarket
): Readonly<{
  result: NotificationMarketReadiness
  templatesReady: number
}> => {
  const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
  if (
    !(
      isRecord(value) &&
      hasExactKeys(value, [
        "locale",
        "market",
        "ready",
        "senderDomain",
        "senderTupleMatched",
        "templates",
      ])
    ) ||
    value.market !== market ||
    value.locale !== binding.locale ||
    value.senderDomain !== binding.senderDomain ||
    typeof value.ready !== "boolean" ||
    typeof value.senderTupleMatched !== "boolean"
  ) {
    return invalid()
  }
  const templates = parseTemplates(value.templates, binding.locale)
  const templatesReady = NOTIFICATION_CRITICAL_TEMPLATES.filter(
    (template) => templates[template].ready
  ).length
  if (
    value.ready !==
    (value.senderTupleMatched &&
      templatesReady === NOTIFICATION_CRITICAL_TEMPLATES.length)
  ) {
    return invalid()
  }
  return {
    result: {
      locale: binding.locale,
      market,
      ready: value.ready,
      senderDomain: binding.senderDomain,
      senderTupleMatched: value.senderTupleMatched,
      templates,
    },
    templatesReady,
  }
}

const parseSummary = (
  value: unknown,
  evidence: Readonly<{
    artifactReady: boolean
    issueCount: number
    marketsReady: number
    templatesReady: number
  }>
): FourMarketNotificationReadinessArtifact["summary"] => {
  if (!isRecord(value)) {
    return invalid()
  }
  const templatesTotal =
    NOTIFICATION_READINESS_MARKETS.length *
    NOTIFICATION_CRITICAL_TEMPLATES.length
  if (
    !hasExactKeys(value, [
      "errors",
      "marketsReady",
      "templatesReady",
      "templatesTotal",
    ]) ||
    value.errors !== evidence.issueCount ||
    value.marketsReady !== evidence.marketsReady ||
    value.templatesReady !== evidence.templatesReady ||
    value.templatesTotal !== templatesTotal ||
    evidence.artifactReady !==
      (evidence.issueCount === 0 &&
        evidence.marketsReady === NOTIFICATION_READINESS_MARKETS.length)
  ) {
    return invalid()
  }
  return {
    errors: evidence.issueCount,
    marketsReady: evidence.marketsReady,
    templatesReady: evidence.templatesReady,
    templatesTotal,
  }
}

export const parseNotificationReadinessArtifact = (
  serialized: string
): FourMarketNotificationReadinessArtifact => {
  const value = parseHeader(parseCanonicalJsonWithLf(serialized))
  const sk = parseMarketResult(value.marketResults.sk, "sk")
  const cz = parseMarketResult(value.marketResults.cz, "cz")
  const hu = parseMarketResult(value.marketResults.hu, "hu")
  const ro = parseMarketResult(value.marketResults.ro, "ro")
  const parsedMarkets = [sk, cz, hu, ro]
  const marketsReady = parsedMarkets.filter(({ result }) => result.ready).length
  const templatesReady = parsedMarkets.reduce(
    (total, market) => total + market.templatesReady,
    0
  )
  const summary = parseSummary(value.summary, {
    artifactReady: value.ready,
    issueCount: value.issues.length,
    marketsReady,
    templatesReady,
  })
  const marketResults = {
    cz: cz.result,
    hu: hu.result,
    ro: ro.result,
    sk: sk.result,
  }
  return {
    issues: value.issues,
    marketResults,
    markets: NOTIFICATION_READINESS_MARKETS,
    ready: value.ready,
    schemaVersion: 1,
    scope: "four-market-notification-readiness",
    summary,
  }
}

export const writeNotificationReadinessArtifact = async (
  outputPath: string,
  artifact: FourMarketNotificationReadinessArtifact
): Promise<Readonly<{ path: string; sha256: string }>> => {
  if (!isAbsolute(outputPath) || resolve(outputPath) !== outputPath) {
    throw new Error(
      "Notification readiness output path must be a canonical absolute path"
    )
  }
  const serialized = canonicalJsonWithLf(artifact)
  parseNotificationReadinessArtifact(serialized)

  const parentPath = dirname(outputPath)
  const [parent, physicalParentPath] = await Promise.all([
    lstat(parentPath),
    realpath(parentPath),
  ])
  if (
    parent.isSymbolicLink() ||
    !parent.isDirectory() ||
    physicalParentPath !== parentPath
  ) {
    throw new Error(
      "Notification readiness output parent must be a non-symlink directory"
    )
  }
  const parentIdentity = { dev: parent.dev, ino: parent.ino }
  const temporaryPath = `${parentPath}/.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(serialized, "utf8")
    await handle.sync()
    const temporaryIdentity = await handle.stat()
    await handle.close()
    handle = undefined
    assertSameRegularFile(
      temporaryIdentity,
      await lstat(temporaryPath),
      "Temporary notification readiness artifact"
    )
    await assertStableOutputParent(parentPath, parentIdentity)
    await link(temporaryPath, outputPath)
    assertSameRegularFile(
      temporaryIdentity,
      await lstat(outputPath),
      "Published notification readiness artifact"
    )
    await unlink(temporaryPath).catch(() => {
      // Publication is committed; stale temporary cleanup is best-effort.
    })
  } catch (error) {
    await handle?.close().catch(() => {
      // Preserve the original publication failure.
    })
    await unlink(temporaryPath).catch(() => {
      // Preserve the original publication failure.
    })
    throw error
  }
  return {
    path: outputPath,
    sha256: createHash("sha256").update(serialized, "utf8").digest("hex"),
  }
}
