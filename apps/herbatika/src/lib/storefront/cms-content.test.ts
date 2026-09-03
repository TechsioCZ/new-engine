import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const BASE = "https://cms.example.com"

const loadModule = async () => {
  vi.resetModules()
  vi.doMock("./runtime-env", () => ({
    resolvePublicPayloadBaseUrl: () => BASE,
  }))
  return await import("./cms-content")
}

describe("cms-content media url rebasing", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock("./runtime-env")
  })

  it("rebases a relative Payload media path onto the public base", async () => {
    const { resolveCmsMediaUrl } = await loadModule()
    expect(resolveCmsMediaUrl("/api/media/file/hero.avif")).toBe(
      `${BASE}/api/media/file/hero.avif`
    )
  })

  it("rebases an absolute Payload media url baked in at import time", async () => {
    const { resolveCmsMediaUrl } = await loadModule()
    expect(
      resolveCmsMediaUrl("http://localhost:8083/api/media/file/imported.png")
    ).toBe(`${BASE}/api/media/file/imported.png`)
  })

  it("preserves query strings when rebasing", async () => {
    const { resolveCmsMediaUrl } = await loadModule()
    expect(
      resolveCmsMediaUrl("http://localhost:8083/api/media/file/x.png?v=2")
    ).toBe(`${BASE}/api/media/file/x.png?v=2`)
  })

  it("leaves a foreign CDN url untouched", async () => {
    const { resolveCmsMediaUrl } = await loadModule()
    expect(resolveCmsMediaUrl("https://cdn.myshoptet.com/a/b.jpg")).toBe(
      "https://cdn.myshoptet.com/a/b.jpg"
    )
  })

  it("accepts a CmsMedia object with a url field", async () => {
    const { resolveCmsMediaUrl } = await loadModule()
    expect(
      resolveCmsMediaUrl({
        url: "http://localhost:8083/api/media/file/obj.png",
      } as never)
    ).toBe(`${BASE}/api/media/file/obj.png`)
  })

  it("rewrites both relative and absolute media urls inside html", async () => {
    const { rewriteCmsHtmlMediaUrls } = await loadModule()
    const html =
      '<img src="/api/media/file/a.png"/>' +
      '<img src="http://localhost:8083/api/media/file/b.png"/>' +
      '<img src="https://cdn.myshoptet.com/c.png"/>'
    const out = rewriteCmsHtmlMediaUrls(html)
    expect(out).toContain(`src="${BASE}/api/media/file/a.png"`)
    expect(out).toContain(`src="${BASE}/api/media/file/b.png"`)
    expect(out).toContain('src="https://cdn.myshoptet.com/c.png"')
  })
})
