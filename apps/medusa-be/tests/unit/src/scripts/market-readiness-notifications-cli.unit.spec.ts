import { createHash } from "node:crypto"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { getResendTemplateSubject } from "../../../../src/modules/resend/templates"
import type { ResendRuntimeConfig } from "../../../../src/modules/resend-config"
import { canonicalJsonWithLf } from "../../../../src/scripts/market-readiness/canonical"
import {
  type FourMarketNotificationReadinessAuthority,
  loadNotificationReadinessAuthority,
  parseNotificationReadinessAuthority,
} from "../../../../src/scripts/market-readiness/notifications/authority"
import {
  buildObservedNotificationMarkets,
  parseNotificationReadinessCliOptions,
  runNotificationReadinessCli,
} from "../../../../src/scripts/market-readiness/notifications/cli"
import { collectFourMarketNotificationReadiness } from "../../../../src/scripts/market-readiness/notifications/collector"
import {
  FOUR_MARKET_NOTIFICATION_BINDINGS,
  NOTIFICATION_CRITICAL_TEMPLATES,
  NOTIFICATION_READINESS_MARKETS,
  type NotificationCriticalTemplate,
  type NotificationReadinessMarket,
} from "../../../../src/scripts/market-readiness/notifications/contracts"
import { createResendTemplateInspectionAdapter } from "../../../../src/scripts/market-readiness/notifications/resend-inspection"

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex")

const templateId = (
  market: NotificationReadinessMarket,
  template: NotificationCriticalTemplate
) => `tmpl_${market}_${template}`

const templateMappings = (market: NotificationReadinessMarket) =>
  Object.fromEntries(
    NOTIFICATION_CRITICAL_TEMPLATES.map((template) => [
      template,
      templateId(market, template),
    ])
  ) as Record<NotificationCriticalTemplate, string>

const templateBody = (
  market: NotificationReadinessMarket,
  template: NotificationCriticalTemplate
) => ({
  html: `<html><body><p>BODY_${market}_${template}</p></body></html>`,
  text: `BODY_${market}_${template}`,
})

const authority = (): FourMarketNotificationReadinessAuthority => ({
  expectedBodyProofs: Object.fromEntries(
    NOTIFICATION_READINESS_MARKETS.map((market) => [
      market,
      Object.fromEntries(
        NOTIFICATION_CRITICAL_TEMPLATES.map((template) => {
          const body = templateBody(market, template)
          return [
            template,
            { htmlSha256: sha256(body.html), textSha256: sha256(body.text) },
          ]
        })
      ),
    ])
  ) as FourMarketNotificationReadinessAuthority["expectedBodyProofs"],
  expectedMarkets: Object.fromEntries(
    NOTIFICATION_READINESS_MARKETS.map((market) => {
      const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
      return [
        market,
        {
          from: `Herbatica <notifications@${binding.senderDomain}>`,
          locale: binding.locale,
          replyTo: `support@${binding.senderDomain}`,
          senderDomain: binding.senderDomain,
          templateMappings: templateMappings(market),
        },
      ]
    })
  ) as FourMarketNotificationReadinessAuthority["expectedMarkets"],
  markets: NOTIFICATION_READINESS_MARKETS,
  schemaVersion: 1,
  scope: "four-market-notification-readiness-authority",
})

const runtimeConfig = (): ResendRuntimeConfig => ({
  api_key: "re_private_runtime_secret",
  api_store_id: "api-store-private",
  api_url: "https://api.resend.com",
  from_email: "",
  market_configurations: Object.fromEntries(
    NOTIFICATION_READINESS_MARKETS.map((market) => {
      const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
      return [
        market,
        {
          from_email: `Herbatica <notifications@${binding.senderDomain}>`,
          reply_to: `support@${binding.senderDomain}`,
          template_mappings: templateMappings(market),
        },
      ]
    })
  ),
  product_review_request_delay_minutes: 10_080,
  request_timeout_ms: 10_000,
  template_mappings: templateMappings("sk"),
  webhook_secret: null,
})

describe("four-market notification readiness executable collector", () => {
  it("accepts only exact canonical CLI inputs", () => {
    const cwd = resolve("/tmp")
    expect(
      parseNotificationReadinessCliOptions([
        "--authority",
        `${cwd}/authority.json`,
        "--expected-authority-sha256",
        "a".repeat(64),
        "--output",
        `${cwd}/report.json`,
      ])
    ).toEqual({
      authorityPath: `${cwd}/authority.json`,
      expectedAuthoritySha256: "a".repeat(64),
      outputPath: `${cwd}/report.json`,
    })
    expect(() =>
      parseNotificationReadinessCliOptions([
        "--authority",
        "relative.json",
        "--expected-authority-sha256",
        "a".repeat(64),
        "--output",
        `${cwd}/report.json`,
      ])
    ).toThrow("canonical absolute path")
    expect(() =>
      parseNotificationReadinessCliOptions([
        "--authority",
        `${cwd}/same.json`,
        "--expected-authority-sha256",
        "a".repeat(64),
        "--output",
        `${cwd}/same.json`,
      ])
    ).toThrow("must be distinct")
  })

  it("strictly parses the externally reviewed four-market authority", () => {
    const expected = authority()
    expect(
      parseNotificationReadinessAuthority(canonicalJsonWithLf(expected))
    ).toEqual(expected)
    expect(() =>
      parseNotificationReadinessAuthority(
        canonicalJsonWithLf({ ...expected, unexpected: true })
      )
    ).toThrow("authority is invalid")
  })

  it("binds authority bytes to the externally reviewed SHA-256", async () => {
    const directory = await mkdtemp(join(tmpdir(), "notification-authority-"))
    const path = join(directory, "authority.json")
    const serialized = canonicalJsonWithLf(authority())
    await writeFile(path, serialized, { encoding: "utf8", mode: 0o600 })
    try {
      await expect(
        loadNotificationReadinessAuthority(path, sha256(serialized))
      ).resolves.toEqual(authority())
      await expect(
        loadNotificationReadinessAuthority(path, "0".repeat(64))
      ).rejects.toThrow("externally reviewed SHA-256")
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it("inspects every published template without sends or sensitive artifact data", async () => {
    const fetchImplementation = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        expect(init?.method).toBe("GET")
        expect(init?.body).toBeUndefined()
        expect(init?.headers).toEqual({
          Authorization: "Bearer re_private_runtime_secret",
        })
        const id = decodeURIComponent(String(input).split("/").at(-1) as string)
        const [market, template] = NOTIFICATION_READINESS_MARKETS.flatMap(
          (candidateMarket) =>
            NOTIFICATION_CRITICAL_TEMPLATES.map(
              (candidateTemplate) =>
                [candidateMarket, candidateTemplate] as const
            )
        ).find(
          ([candidateMarket, candidateTemplate]) =>
            templateId(candidateMarket, candidateTemplate) === id
        ) as readonly [
          NotificationReadinessMarket,
          NotificationCriticalTemplate,
        ]
        const binding = FOUR_MARKET_NOTIFICATION_BINDINGS[market]
        const body = templateBody(market, template)
        return new Response(
          JSON.stringify({
            ...body,
            id,
            object: "template",
            status: "published",
            subject: getResendTemplateSubject(template, binding.locale),
          }),
          { headers: { "content-type": "application/json" }, status: 200 }
        )
      }
    )
    const writeArtifact = vi.fn(async (path, report) => ({
      path,
      sha256: sha256(JSON.stringify(report)),
    }))

    const result = await runNotificationReadinessCli(
      {
        authorityPath: "/private/authority.json",
        expectedAuthoritySha256: "a".repeat(64),
        outputPath: "/private/report.json",
      },
      {
        collect: collectFourMarketNotificationReadiness,
        createInspectionAdapter: (options) =>
          createResendTemplateInspectionAdapter({
            ...options,
            fetchImplementation,
          }),
        loadAuthority: vi.fn(async () => authority()),
        loadRuntimeConfig: vi.fn(async () => runtimeConfig()),
        writeArtifact,
      }
    )

    expect(result.report.ready, JSON.stringify(result.report.issues)).toBe(true)
    expect(result.report.summary).toEqual({
      errors: 0,
      marketsReady: 4,
      templatesReady: NOTIFICATION_CRITICAL_TEMPLATES.length * 4,
      templatesTotal: NOTIFICATION_CRITICAL_TEMPLATES.length * 4,
    })
    expect(fetchImplementation).toHaveBeenCalledTimes(
      NOTIFICATION_CRITICAL_TEMPLATES.length * 4
    )
    expect(writeArtifact).toHaveBeenCalledOnce()
    const serialized = JSON.stringify(result.report)
    expect(serialized).not.toContain("re_private_runtime_secret")
    expect(serialized).not.toContain("api-store-private")
    expect(serialized).not.toContain("BODY_")
    expect(serialized).not.toContain("tmpl_")
    expect(serialized).not.toContain("notifications@")
    expect(serialized).not.toContain("support@")
  })

  it("requires exactly the four persisted market configurations", () => {
    const runtime = runtimeConfig()
    runtime.market_configurations = Object.fromEntries(
      Object.entries(runtime.market_configurations).filter(
        ([market]) => market !== "ro"
      )
    )
    expect(() => buildObservedNotificationMarkets(runtime)).toThrow(
      "exactly SK, CZ, HU, and RO"
    )
  })

  it("renders safe sample variables from one cached GET snapshot", async () => {
    const fetchImplementation = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            html: "<p>{{name}} {{{locale}}}</p>",
            object: "template",
            status: "published",
            subject: "Subject {{{locale}}}",
            text: "{{name}} {{{locale}}}",
          }),
          { headers: { "content-type": "application/json" }, status: 200 }
        )
    )
    const adapter = createResendTemplateInspectionAdapter({
      apiKey: "re_secret",
      apiUrl: "https://api.resend.com",
      fetchImplementation,
      requestTimeoutMs: 1000,
    })

    await expect(
      adapter.inspector.inspect({
        template: "order-placed",
        templateId: "template",
      })
    ).resolves.toEqual({ published: true })
    await expect(
      adapter.renderer.render({
        locale: "sk-SK",
        market: "sk",
        template: "order-placed",
        templateId: "template",
        variables: { locale: "sk-SK", name: "<PRIVATE>" },
      })
    ).resolves.toEqual({
      html: "<p>&lt;PRIVATE&gt; sk-SK</p>",
      subject: "Subject sk-SK",
      text: "<PRIVATE> sk-SK",
    })
    expect(fetchImplementation).toHaveBeenCalledOnce()
  })

  it("fails closed on drafts, malformed bodies, and unresolved expressions", async () => {
    const inspect = async (payload: Record<string, unknown>) => {
      const adapter = createResendTemplateInspectionAdapter({
        apiKey: "re_secret",
        apiUrl: "https://api.resend.com",
        fetchImplementation: vi.fn(
          async () =>
            new Response(JSON.stringify(payload), {
              headers: { "content-type": "application/json" },
              status: 200,
            })
        ),
        requestTimeoutMs: 1000,
      })
      return adapter.renderer.render({
        locale: "sk-SK",
        market: "sk",
        template: "order-placed",
        templateId: "template",
        variables: {},
      })
    }

    await expect(
      inspect({
        html: "<p>draft</p>",
        object: "template",
        status: "draft",
        subject: "draft",
        text: "draft",
      })
    ).rejects.toThrow("published template")
    await expect(
      inspect({
        html: "<p>{{missing}}</p>",
        object: "template",
        status: "published",
        subject: "subject",
        text: "body",
      })
    ).rejects.toThrow("unresolved template expression")
  })
})
