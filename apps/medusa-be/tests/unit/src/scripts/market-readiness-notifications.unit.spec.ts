import {
  chmod,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises"
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

const publicationFsInterceptors = vi.hoisted(
  (): {
    afterLstat: ((path: string) => Promise<void>) | null
    afterLink: ((source: string, destination: string) => Promise<void>) | null
    afterUnlink: ((path: string) => Promise<void>) | null
  } => ({
    afterLstat: null,
    afterLink: null,
    afterUnlink: null,
  })
)

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>()
  return {
    ...actual,
    lstat: async (path: string) => {
      const result = await actual.lstat(path)
      await publicationFsInterceptors.afterLstat?.(path)
      return result
    },
    link: async (source: string, destination: string) => {
      await actual.link(source, destination)
      await publicationFsInterceptors.afterLink?.(source, destination)
    },
    unlink: async (path: string) => {
      await actual.unlink(path)
      await publicationFsInterceptors.afterUnlink?.(path)
    },
  }
})

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
  publicationFsInterceptors.afterLstat = null
  publicationFsInterceptors.afterLink = null
  publicationFsInterceptors.afterUnlink = null
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
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "notification-readiness-test-"))
    )
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "notifications.json")

    const artifact = await writeNotificationReadinessArtifact(
      outputPath,
      report
    )
    const serialized = await readFile(outputPath, "utf8")

    expect(artifact.sha256).toMatch(SHA256)
    expect((await stat(outputPath)).mode % 0o1000).toBe(0o600)
    expect((await stat(outputPath)).nlink).toBe(1)
    expect(serialized.endsWith("\n")).toBe(true)
    expect(serialized.endsWith("\n\n")).toBe(false)
    expect(serialized).not.toContain("\r")
    expect(parseNotificationReadinessArtifact(serialized)).toEqual(report)
    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).rejects.toMatchObject({ code: "EEXIST" })
  })

  it.each([
    "writeFile",
    "sync",
  ] as const)("leaves no final artifact after an injected %s failure and permits retry", async (failurePoint) => {
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
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "notification-readiness-failure-test-"))
    )
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "notifications.json")
    const probePath = join(directory, "probe")
    const probeHandle = await open(probePath, "wx", 0o600)
    const handlePrototype = Object.getPrototypeOf(probeHandle) as Pick<
      typeof probeHandle,
      "sync" | "writeFile"
    >
    const failure = new Error(`injected ${failurePoint} failure`)
    const failureSpy =
      failurePoint === "writeFile"
        ? vi.spyOn(handlePrototype, "writeFile").mockRejectedValueOnce(failure)
        : vi.spyOn(handlePrototype, "sync").mockRejectedValueOnce(failure)
    await probeHandle.close()
    await unlink(probePath)

    try {
      await expect(
        writeNotificationReadinessArtifact(outputPath, report)
      ).rejects.toBe(failure)
    } finally {
      failureSpy.mockRestore()
    }

    await expect(readFile(outputPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    })
    expect(await readdir(directory)).toEqual([])

    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).resolves.toMatchObject({ path: outputPath })
    expect(
      parseNotificationReadinessArtifact(await readFile(outputPath, "utf8"))
    ).toEqual(report)
  })

  it("rejects a symlinked output parent before creating an artifact", async () => {
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
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "notification-readiness-symlink-test-"))
    )
    temporaryDirectories.push(directory)
    const physicalParent = join(directory, "physical")
    const symlinkedParent = join(directory, "symlinked")
    await mkdir(physicalParent)
    await symlink(physicalParent, symlinkedParent, "dir")

    await expect(
      writeNotificationReadinessArtifact(
        join(symlinkedParent, "notifications.json"),
        report
      )
    ).rejects.toThrow(
      "output parent must be a canonical process-owned private directory"
    )
    expect(await readdir(physicalParent)).toEqual([])
  })

  it.each([
    0o777, 0o770,
  ])("rejects an output parent with mode %o", async (mode) => {
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
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "notification-readiness-mode-test-"))
    )
    temporaryDirectories.push(directory)
    await chmod(directory, mode)

    await expect(
      writeNotificationReadinessArtifact(
        join(directory, "notifications.json"),
        report
      )
    ).rejects.toThrow(
      "output parent must be a canonical process-owned private directory"
    )
    expect(await readdir(directory)).toEqual([])
  })

  it("rejects a parent identity swap after linking the artifact", async () => {
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
    const root = await realpath(
      await mkdtemp(join(tmpdir(), "notification-readiness-parent-swap-"))
    )
    temporaryDirectories.push(root)
    const parent = join(root, "publisher")
    const movedParent = join(root, "publisher-moved")
    const outputPath = join(parent, "notifications.json")
    await mkdir(parent, { mode: 0o700 })
    publicationFsInterceptors.afterLink = async () => {
      publicationFsInterceptors.afterLink = null
      await rename(parent, movedParent)
      await mkdir(parent, { mode: 0o700 })
    }

    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).rejects.toThrow("output parent changed during artifact publication")
    await expect(readFile(outputPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    })
  })

  it("cleans an owned final link after post-link validation fails and permits retry", async () => {
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
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "notification-readiness-post-link-failure-"))
    )
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "notifications.json")
    const failure = new Error("injected post-link validation failure")
    publicationFsInterceptors.afterLink = async () => {
      publicationFsInterceptors.afterLink = null
      publicationFsInterceptors.afterLstat = async (path) => {
        if (path !== directory) {
          return
        }
        publicationFsInterceptors.afterLstat = null
        throw failure
      }
    }

    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).rejects.toBe(failure)
    expect(await readdir(directory)).toEqual([])

    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).resolves.toMatchObject({ path: outputPath })
    expect(
      parseNotificationReadinessArtifact(await readFile(outputPath, "utf8"))
    ).toEqual(report)
  })

  it("rejects an output inode swap while removing the temporary link", async () => {
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
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "notification-readiness-output-swap-"))
    )
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "notifications.json")
    publicationFsInterceptors.afterUnlink = async (path) => {
      if (!path.endsWith(".tmp")) {
        return
      }
      publicationFsInterceptors.afterUnlink = null
      await rm(outputPath)
      await writeFile(outputPath, "substituted output", { mode: 0o600 })
    }

    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).rejects.toThrow(
      "Published notification readiness artifact changed during artifact publication"
    )
    expect(await readFile(outputPath, "utf8")).toBe("substituted output")
    await expect(
      writeNotificationReadinessArtifact(outputPath, report)
    ).rejects.toMatchObject({ code: "EEXIST" })
    expect(await readFile(outputPath, "utf8")).toBe("substituted output")
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
