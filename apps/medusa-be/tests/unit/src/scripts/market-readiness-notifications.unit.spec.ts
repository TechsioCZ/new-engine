import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { canonicalJsonWithLf } from "../../../../src/scripts/market-readiness/canonical"
import {
  collectFourMarketNotificationReadiness,
  FOUR_MARKET_NOTIFICATION_BINDINGS,
  NOTIFICATION_CRITICAL_TEMPLATES,
  type NotificationTemplateRenderRequest,
  parseNotificationReadinessArtifact,
  writeNotificationReadinessArtifact,
} from "../../../../src/scripts/market-readiness/notifications"

const temporaryDirectories: string[] = []
const SHA256 = /^[a-f0-9]{64}$/u

const templateMappings = (market: string) =>
  Object.fromEntries(
    NOTIFICATION_CRITICAL_TEMPLATES.map((template) => [
      template,
      `tmpl_${market}_${template}`,
    ])
  )

const marketConfiguration = (market: "cz" | "hu" | "ro" | "sk") => {
  const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
  return {
    from: `Herbatica <notifications@${binding.senderDomain}>`,
    locale: binding.locale,
    replyTo: `support@${binding.senderDomain}`,
    senderDomain: binding.senderDomain,
    templateMappings: templateMappings(market),
  }
}

const fourMarketInput = () => ({
  expectedMarkets: {
    cz: marketConfiguration("cz"),
    hu: marketConfiguration("hu"),
    ro: marketConfiguration("ro"),
    sk: marketConfiguration("sk"),
  },
  observedMarkets: {
    cz: marketConfiguration("cz"),
    hu: marketConfiguration("hu"),
    ro: marketConfiguration("ro"),
    sk: marketConfiguration("sk"),
  },
})

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

describe("four-market notification readiness collector", () => {
  it("validates and safely fingerprints every critical template without sending", async () => {
    const render = vi.fn(
      async ({ locale, template }: NotificationTemplateRenderRequest) => ({
        html: `<html><body><main data-market="${locale}"><h1>Private Customer</h1><a href="https://private.example.test/token">Open</a></main></body></html>`,
        subject: `subject:${template}:${locale}`,
        text: `Private Customer\nhttps://private.example.test/token\n${template}`,
      })
    )
    const inspect = vi.fn(async () => ({ published: true }))

    const report = await collectFourMarketNotificationReadiness({
      ...fourMarketInput(),
      inspector: { inspect },
      renderer: { render },
      subjectResolver: (template, locale) => `subject:${template}:${locale}`,
    })
    const serialized = JSON.stringify(report)

    expect(report).toMatchObject({
      markets: ["sk", "cz", "hu", "ro"],
      ready: true,
      schemaVersion: 1,
      scope: "four-market-notification-readiness",
      summary: {
        errors: 0,
        marketsReady: 4,
        templatesReady: NOTIFICATION_CRITICAL_TEMPLATES.length * 4,
        templatesTotal: NOTIFICATION_CRITICAL_TEMPLATES.length * 4,
      },
    })
    expect(render).toHaveBeenCalledTimes(
      NOTIFICATION_CRITICAL_TEMPLATES.length * 4
    )
    expect(inspect).toHaveBeenCalledTimes(
      NOTIFICATION_CRITICAL_TEMPLATES.length * 4
    )
    expect(report.marketResults.cz.templates["order-placed"]).toMatchObject({
      configuredTemplateMatched: true,
      inspection: "passed",
      locale: "cs-CZ",
      ready: true,
      rendered: true,
    })
    expect(
      report.marketResults.cz.templates["order-placed"].subjectSha256
    ).toMatch(SHA256)
    expect(serialized).not.toContain("Private Customer")
    expect(serialized).not.toContain("private.example.test")
    expect(serialized).not.toContain("notifications@")
    expect(serialized).not.toContain("support@")
    expect(serialized).not.toContain("tmpl_cz_")
  })

  it("fails closed on an exact tuple mismatch without leaking configuration", async () => {
    const input = fourMarketInput()
    input.observedMarkets.hu = {
      ...input.observedMarkets.hu,
      replyTo: "private.person@example.test",
    }
    const report = await collectFourMarketNotificationReadiness({
      ...input,
      renderer: {
        render: vi.fn(async ({ locale, template }) => ({
          html: "<html><body><p>safe</p></body></html>",
          subject: `subject:${template}:${locale}`,
          text: "safe",
        })),
      },
      subjectResolver: (template, locale) => `subject:${template}:${locale}`,
    })
    const serialized = JSON.stringify(report)

    expect(report.ready).toBe(false)
    expect(report.marketResults.hu.senderTupleMatched).toBe(false)
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SENDER_TUPLE_MISMATCH",
          market: "hu",
        }),
      ])
    )
    expect(serialized).not.toContain("private.person@example.test")
  })

  it("writes canonical JSON with one LF and refuses to clobber", async () => {
    const report = await collectFourMarketNotificationReadiness({
      ...fourMarketInput(),
      renderer: {
        render: vi.fn(async ({ locale, template }) => ({
          html: "<html><body><p>safe</p></body></html>",
          subject: `subject:${template}:${locale}`,
          text: "safe",
        })),
      },
      subjectResolver: (template, locale) => `subject:${template}:${locale}`,
    })
    const directory = await mkdtemp(
      join(tmpdir(), "notification-readiness-test-")
    )
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "notifications.json")

    const artifact = await writeNotificationReadinessArtifact(
      outputPath,
      report
    )
    const serialized = await readFile(outputPath, "utf8")

    expect(artifact.sha256).toMatch(SHA256)
    expect(serialized.endsWith("\n")).toBe(true)
    expect(serialized.endsWith("\n\n")).toBe(false)
    expect(serialized).not.toContain("\r")
    expect(parseNotificationReadinessArtifact(serialized)).toEqual(report)
    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).rejects.toMatchObject({ code: "EEXIST" })
  })

  it("rejects artifacts without exact four-market coverage or with unbounded issue data", async () => {
    const report = await collectFourMarketNotificationReadiness({
      ...fourMarketInput(),
      renderer: {
        render: vi.fn(async ({ locale, template }) => ({
          html: "<html><body><p>safe</p></body></html>",
          subject: `subject:${template}:${locale}`,
          text: "safe",
        })),
      },
      subjectResolver: (template, locale) => `subject:${template}:${locale}`,
    })
    const { ro: _omittedRo, ...withoutRo } = report.marketResults
    const missingMarket = { ...report, marketResults: withoutRo }
    const leakingIssue = {
      ...report,
      issues: [
        {
          code: "SENDER_TUPLE_MISMATCH",
          market: "sk",
          message: "private.person@example.test",
        },
      ],
      ready: false,
      summary: { ...report.summary, errors: 1 },
    }
    const malformedTemplate = {
      ...report,
      marketResults: {
        ...report.marketResults,
        sk: {
          ...report.marketResults.sk,
          templates: {
            ...report.marketResults.sk.templates,
            "order-placed": {
              ...report.marketResults.sk.templates["order-placed"],
              ready: "yes",
            },
          },
        },
      },
    }
    const malformedSummary = {
      ...report,
      summary: { ...report.summary, templatesReady: "all" },
    }

    expect(() =>
      parseNotificationReadinessArtifact(canonicalJsonWithLf(missingMarket))
    ).toThrow("artifact is invalid")
    expect(() =>
      parseNotificationReadinessArtifact(canonicalJsonWithLf(leakingIssue))
    ).toThrow("artifact is invalid")
    expect(() =>
      parseNotificationReadinessArtifact(canonicalJsonWithLf(malformedTemplate))
    ).toThrow("artifact is invalid")
    expect(() =>
      parseNotificationReadinessArtifact(canonicalJsonWithLf(malformedSummary))
    ).toThrow("artifact is invalid")
  })
})
