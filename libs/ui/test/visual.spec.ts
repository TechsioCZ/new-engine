import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  type BrowserContextOptions,
  expect,
  test as base,
  type Locator,
  type Page,
} from "@playwright/test"

type StorybookEntry = {
  id: string
  name: string
  title: string
  type: string
}

type StorybookIndex = {
  entries: Record<string, StorybookEntry>
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexPath = path.resolve(__dirname, "../storybook-static/index.json")
const galleryDir = path.resolve(__dirname, "../assets/gallery")

// Remote image hosts are non-deterministic (network, CDN re-encodes). Serve a
// stable local asset per URL instead so screenshots are hermetic.
const galleryFiles = [
  "shoes-1.jpg",
  "shoes-2.jpg",
  "shoes-3.jpg",
  "shoes-4.jpg",
  "watch-1.jpg",
  "watch-2.jpg",
  "watch-3.jpg",
  "watch-4.jpg",
]
const galleryBuffers = galleryFiles.map((file) =>
  readFileSync(path.join(galleryDir, file))
)

// Neutral stand-in for non-product remote images (logos, badges) whose
// natural size must stay small so substitution does not distort layout.
const placeholderPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAAKklEQVR4nO3MQREAAAwCIPunM5Ih9ttBANKjCAQCgUAgEAgEAoFAIPgeDED6AMS2vrHWAAAAAElFTkSuQmCC",
  "base64"
)

function stableGalleryBuffer(url: string): Buffer {
  let hash = 0
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0
  }
  return galleryBuffers[hash % galleryBuffers.length] as Buffer
}

// Chromium's expectScreenshot capture loop deterministically breaks on these
// stories ("read requests waitng on finished stream") and leaves the browser
// unable to take further screenshots, while a single element screenshot works.
// Capture them with the plain screenshot + toMatchSnapshot path instead.
const rawCaptureStories = new Set([
  "molecules-productcard--stock-states:desktop",
  "molecules-steps--variants:mobile",
])

const storybookHostname = new URL(
  process.env["TEST_BASE_URL"] ?? "http://127.0.0.1:6006"
).hostname

async function installHermeticImageRoutes(page: Page): Promise<void> {
  await page.route(
    (url) =>
      url.hostname !== storybookHostname &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1",
    async (route) => {
      const request = route.request()
      if (request.resourceType() === "image") {
        const url = new URL(request.url())
        const isProductPhoto = url.hostname === "images.unsplash.com"
        await route.fulfill(
          isProductPhoto
            ? {
                body: stableGalleryBuffer(request.url()),
                contentType: "image/jpeg",
              }
            : { body: placeholderPng, contentType: "image/png" }
        )
        return
      }
      await route.abort()
    }
  )
}
const resetEnv = (process.env["PLAYWRIGHT_PAGE_RESET"] ?? "").toLowerCase()
const shouldResetBetweenTests =
  resetEnv === ""
    ? true
    : resetEnv === "1" || resetEnv === "true" || resetEnv === "yes"

let storybookIndex: StorybookIndex

function definedContextOptions(
  options: Record<string, unknown>
): BrowserContextOptions {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as BrowserContextOptions
}

const test = base.extend<{}, { workerPage: Page }>({
  workerPage: [
    async ({ browser }, use, testInfo) => {
      const context = await browser.newContext(
        definedContextOptions(testInfo.project.use)
      )
      const page = await context.newPage()
      await installHermeticImageRoutes(page)
      await use(page)
      await context.close()
    },
    { scope: "worker" },
  ],
})

try {
  const raw = readFileSync(indexPath, "utf-8")
  storybookIndex = JSON.parse(raw) as StorybookIndex
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") {
    throw new Error(
      "Storybook index.json not found. Run 'pnpm build:storybook' first."
    )
  }
  throw error
}

const stories = Object.values(storybookIndex.entries).filter(
  (entry) => entry.type === "story"
)

const storyFilter = (process.env["TEST_STORIES"] ?? "")
  .split(",")
  .map((storyId) => storyId.trim())
  .filter(Boolean)

const selectedStories =
  storyFilter.length > 0
    ? stories.filter((story) => storyFilter.includes(story.id))
    : stories

if (storyFilter.length > 0 && selectedStories.length === 0) {
  throw new Error(`No stories matched TEST_STORIES=${storyFilter.join(",")}`)
}

test.describe.parallel("storybook visual", () => {
  for (const story of selectedStories) {
    test(`${story.title} ${story.name} should not have visual regressions`, async ({
      workerPage,
      browser,
    }, testInfo) => {
      let page = workerPage
      let ownedContext: {
        close: () => Promise<void>
        newPage: () => Promise<Page>
      } | null = null

      const createIsolatedPage = async () => {
        if (ownedContext) {
          await ownedContext.close()
        }
        ownedContext = await browser.newContext(
          definedContextOptions(testInfo.project.use)
        )
        page = await ownedContext.newPage()
        await installHermeticImageRoutes(page)
      }

      const isRecoverableError = (error: unknown) => {
        if (!error || typeof error !== "object") {
          return false
        }
        const message = String((error as Error).message || "")
        return (
          message.includes("Target page, context or browser has been closed") ||
          message.includes("Page crashed") ||
          message.includes("net::ERR_ABORTED") ||
          message.includes("frame was detached") ||
          // Chromium screenshot-capture bug on oversized elements.
          message.includes("hermetic images failed to settle") ||
          message.includes("read requests waitng on finished stream") ||
          message.includes("read requests waiting on finished stream")
        )
      }

      const defaultCaptureMode = rawCaptureStories.has(
        `${story.id}:${testInfo.project.name}`
      )
        ? ("raw" as const)
        : ("expect" as const)

      const run = async (
        captureMode: "expect" | "raw" = defaultCaptureMode
      ) => {
        const params = new URLSearchParams({
          id: story.id,
          viewMode: "story",
        })
        const mask: Locator[] = []

        if (shouldResetBetweenTests) {
          try {
            await page.context().clearCookies()
            await page.goto("about:blank")
            await page.evaluate(() => {
              try {
                localStorage.clear()
                sessionStorage.clear()
              } catch {
                // storage may be unavailable in some contexts
              }
            })
          } catch {
            // reset is best-effort only
          }
        }

        const navigate = async () => {
          await page.emulateMedia({ reducedMotion: "reduce" })
          await page.goto(`/iframe.html?${params.toString()}`, {
            waitUntil: "domcontentloaded",
          })
        }

        try {
          await navigate()
        } catch (error) {
          if (!isRecoverableError(error)) {
            throw error
          }
          await createIsolatedPage()
          await navigate()
        }

        await page.waitForSelector("#storybook-root")
        await page.addStyleTag({
          content: `
              *, *::before, *::after {
                animation: none !important;
                transition: none !important;
                caret-color: transparent !important;
              }
              html {
                scroll-behavior: auto !important;
              }
            `,
        })

        // Avoid networkidle here; Storybook keeps background activity that can stall tests.
        await page.waitForFunction(
          () => {
            const root = document.querySelector("#storybook-root")
            return root && root.children.length > 0
          },
          { timeout: 30_000 }
        )
        // Story CSS is injected as stylesheet links by dynamically imported
        // chunks; capturing before every sheet applies yields unstyled layout.
        await page.waitForFunction(
          () =>
            Array.from(
              document.querySelectorAll<HTMLLinkElement>(
                'link[rel="stylesheet"]'
              )
            ).every((link) => link.sheet !== null),
          { timeout: 30_000 }
        )
        await page.evaluate(async () => {
          if (!("fonts" in document)) {
            return
          }
          try {
            await Promise.race([
              document.fonts.ready,
              new Promise((resolve) => setTimeout(resolve, 2000)),
            ])
          } catch {
            // ignore font readiness failures
          }
        })

        // Force lazy images to load eagerly so layout is deterministic, then
        // wait for every sourced image to finish loading and decoding. Images
        // are hermetic (local assets or fulfilled routes), so this must
        // succeed; failing loudly beats capturing a pre-load layout.
        await page.evaluate(async () => {
          const root = document.querySelector("#storybook-root")
          if (!root) return
          const images = Array.from(root.querySelectorAll("img"))
          await Promise.all(
            images.map(async (img) => {
              if (!img.src) return
              if (img.loading === "lazy") {
                img.loading = "eager"
              }
              try {
                await img.decode()
              } catch {
                // decode failures fall through to the completeness wait
              }
            })
          )
        })
        try {
          await page.waitForFunction(
            () => {
              const root = document.querySelector("#storybook-root")
              if (!root) return false
              const images = root.querySelectorAll("img")
              if (images.length === 0) return true
              return Array.from(images).every(
                (img) => !img.src || (img.complete && img.naturalWidth > 0)
              )
            },
            { timeout: 30_000 }
          )
        } catch {
          throw new Error("hermetic images failed to settle")
        }
        // WebKit can keep fit-content layout computed before image decode;
        // force a relayout so every capture sees the post-load geometry.
        await page.evaluate(() => {
          const root = document.querySelector("#storybook-root")
          if (!(root instanceof HTMLElement)) return
          root.style.display = "none"
          void root.offsetHeight
          root.style.display = ""
          void root.offsetHeight
        })

        const isCarouselStory =
          story.id.startsWith("molecules-carousel--") ||
          story.id.startsWith("templates-carouseltemplate--")
        if (isCarouselStory) {
          const firstIndicators = page.locator(
            '[data-scope="carousel"][data-part="indicator"][data-index="0"]'
          )
          for (
            let index = 0;
            index < (await firstIndicators.count());
            index += 1
          ) {
            await firstIndicators.nth(index).click()
          }

          await page.evaluate(async () => {
            const groups = Array.from(
              document.querySelectorAll<HTMLElement>(
                '[data-scope="carousel"][data-part="item-group"]'
              )
            )

            for (const group of groups) {
              group.style.scrollBehavior = "auto"
            }

            const waitForStableScroll = async (el: HTMLElement) => {
              let last = el.scrollLeft + el.scrollTop
              for (let i = 0; i < 10; i += 1) {
                await new Promise<void>((resolve) =>
                  requestAnimationFrame(() => resolve())
                )
                const current = el.scrollLeft + el.scrollTop
                if (Math.abs(current - last) < 1) return
                last = current
              }
            }

            await Promise.all(groups.map((group) => waitForStableScroll(group)))
          })
        }

        if (story.id.includes("carousel--autoplay")) {
          const autoplayTrigger = page.locator(
            '[data-scope="carousel"][data-part="autoplay-trigger"]'
          )
          if (await autoplayTrigger.count()) {
            const label = await autoplayTrigger.getAttribute("aria-label")
            if (label && label.toLowerCase().includes("stop")) {
              await autoplayTrigger.click()
            }
          }
        }

        if (story.id.startsWith("molecules-treeview--")) {
          await page.addStyleTag({
            content: `
                [data-scope="tree-view"][data-selected],
                [data-scope="tree-view"][data-highlighted],
                [data-scope="tree-view"][data-focused],
                [data-scope="tree-view"] [data-part][data-selected],
                [data-scope="tree-view"] [data-part][data-highlighted],
                [data-scope="tree-view"] [data-part][data-focused] {
                  background: transparent !important;
                  color: inherit !important;
                  outline: none !important;
                  box-shadow: none !important;
                }
              `,
          })
          await page.evaluate(() => {
            const trees = document.querySelectorAll('[data-scope="tree-view"]')
            trees.forEach((tree) => {
              tree
                .querySelectorAll(
                  "[data-selected], [data-highlighted], [data-focused]"
                )
                .forEach((el) => {
                  el.removeAttribute("data-selected")
                  el.removeAttribute("data-highlighted")
                  el.removeAttribute("data-focused")
                })
              tree
                .querySelectorAll("[aria-selected], [aria-current]")
                .forEach((el) => {
                  el.removeAttribute("aria-selected")
                  el.removeAttribute("aria-current")
                })
            })
            const active = document.activeElement
            if (active instanceof HTMLElement) {
              active.blur()
            }
          })
        }

        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve())
              )
            )
        )

        if (story.id === "atoms-button--states") {
          mask.push(page.locator(".icon-\\[svg-spinners--ring-resize\\]"))
        }

        // Park the mouse on a transparent overlay so hover styles don't leak into screenshots.
        await page.evaluate(() => {
          const id = "__playwright_hover_shield__"
          if (document.getElementById(id)) return
          const shield = document.createElement("div")
          shield.id = id
          shield.style.position = "fixed"
          shield.style.left = "0"
          shield.style.top = "0"
          shield.style.width = "24px"
          shield.style.height = "24px"
          shield.style.zIndex = "2147483647"
          shield.style.pointerEvents = "auto"
          shield.style.background = "transparent"
          document.body.appendChild(shield)
        })
        await page.mouse.move(12, 12)

        // Element screenshots are faster and avoid full-page rendering cost.
        const root = page.locator("#storybook-root")
        if (captureMode === "raw") {
          // Chromium's expectScreenshot capture loop fails persistently for
          // some layouts ("read requests waitng on finished stream") while a
          // plain element screenshot on a fresh page succeeds; compare that
          // capture instead.
          const capture = await root.screenshot({
            animations: "disabled",
            scale: "css",
            type: "jpeg",
            quality: 100,
            ...(mask.length > 0 ? { mask } : {}),
          })
          expect(capture).toMatchSnapshot(`${story.id}.jpg`)
          return
        }
        await expect(root).toHaveScreenshot(`${story.id}.png`, {
          animations: "disabled",
          ...(mask.length > 0 ? { mask } : {}),
        })
      }

      if (page.isClosed()) {
        await createIsolatedPage()
      }

      try {
        await run()
      } catch (error) {
        if (!isRecoverableError(error)) {
          throw error
        }
        await createIsolatedPage()
        await run()
      } finally {
        const contextToClose = ownedContext as {
          close: () => Promise<void>
        } | null
        await contextToClose?.close()
      }
    })
  }
})
