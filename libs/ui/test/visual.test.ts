import { readFileSync } from "node:fs"
import path from "node:path"

import {
  expect as playwrightExpect,
  test as playwrightBase,
} from "@playwright/test"
import type { Locator, Page } from "@playwright/test"
import { getRecordValue, isRecord, omitUndefined } from "@techsio/std/object"

interface StorybookEntry {
  id: string
  name: string
  title: string
  type: string
}

const isStorybookEntry = (value: unknown): value is StorybookEntry => {
  if (!isRecord(value)) {
    return false
  }
  const id = getRecordValue(value, "id")
  const name = getRecordValue(value, "name")
  const title = getRecordValue(value, "title")
  const type = getRecordValue(value, "type")
  return [id, name, title, type].every((field) => typeof field === "string")
}

const parseStorybookEntries = (raw: string): StorybookEntry[] => {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) {
    throw new Error("Storybook index.json has an invalid entries object.")
  }
  const entriesValue = getRecordValue(parsed, "entries")
  if (!isRecord(entriesValue)) {
    throw new Error("Storybook index.json has an invalid entries object.")
  }
  const entries = Object.values(entriesValue)
  if (!entries.every(isStorybookEntry)) {
    throw new Error("Storybook index.json contains an invalid story entry.")
  }
  return entries
}

const moduleDir = import.meta.dirname
const indexPath = path.resolve(moduleDir, "../storybook-static/index.json")
const galleryDir = path.resolve(moduleDir, "../assets/gallery")

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
  readFileSync(path.join(galleryDir, file)),
)

// Neutral stand-in for non-product remote images (logos, badges) whose
// natural size must stay small so substitution does not distort layout.
const placeholderPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAAKklEQVR4nO3MQREAAAwCIPunM5Ih9ttBANKjCAQCgUAgEAgEAoFAIPgeDED6AMS2vrHWAAAAAElFTkSuQmCC",
  "base64",
)

const stableGalleryBuffer = (url: string): Buffer => {
  let hash = 0
  for (let i = 0; i < url.length; i += 1) {
    const codePoint = url.codePointAt(i)
    if (codePoint !== undefined) {
      hash = (hash * 31 + codePoint) % 4_294_967_296
    }
  }
  const buffer = galleryBuffers.at(hash % galleryBuffers.length)
  if (!buffer) {
    throw new Error("No local gallery image is available.")
  }
  return buffer
}

// Chromium's expectScreenshot capture loop deterministically breaks on these
// stories ("read requests waitng on finished stream") and leaves the browser
// unable to take further screenshots, while a single element screenshot works.
// Capture them with the plain screenshot + toMatchSnapshot path instead.
const rawCaptureStories = new Set([
  "molecules-productcard--stock-states:desktop",
  "molecules-steps--variants:mobile",
])

const { TEST_BASE_URL: testBaseUrl } = process.env
const storybookHostname = new URL(testBaseUrl ?? "http://127.0.0.1:6006")
  .hostname

const installHermeticImageRoutes = async (page: Page): Promise<void> => {
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
            : { body: placeholderPng, contentType: "image/png" },
        )
        return
      }
      await route.abort()
    },
  )
}
const { PLAYWRIGHT_PAGE_RESET: playwrightPageReset } = process.env
const resetEnv = (playwrightPageReset ?? "").toLowerCase()
const shouldResetBetweenTests =
  resetEnv === ""
    ? true
    : resetEnv === "1" || resetEnv === "true" || resetEnv === "yes"

let stories: StorybookEntry[]

const test = playwrightBase.extend<Record<never, never>, { workerPage: Page }>({
  workerPage: [
    async ({ browser }, use, testInfo) => {
      const context = await browser.newContext(
        omitUndefined(testInfo.project.use),
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
  stories = parseStorybookEntries(raw).filter((entry) => entry.type === "story")
} catch (error) {
  if (isRecord(error)) {
    const code = getRecordValue(error, "code")
    if (code === "ENOENT") {
      throw new Error(
        "Storybook index.json not found. Run 'pnpm build:storybook' first.",
        { cause: error },
      )
    }
  }
  throw error
}

const { TEST_STORIES: testStories } = process.env
const storyFilter = (testStories ?? "")
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

const isRecoverableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }
  const recoverableMessages = [
    "Target page, context or browser has been closed",
    "Page crashed",
    "net::ERR_ABORTED",
    "frame was detached",
    "hermetic images failed to settle",
    "read requests waitng on finished stream",
    "read requests waiting on finished stream",
  ]
  return recoverableMessages.some((message) => error.message.includes(message))
}

const waitForDocumentFonts = async (): Promise<void> => {
  if (!("fonts" in document)) {
    return
  }
  const { promise, resolve } = Promise.withResolvers<null>()
  setTimeout(() => {
    resolve(null)
  }, 2000)
  try {
    await Promise.race([document.fonts.ready, promise])
  } catch {
    // Font readiness is best-effort in browser engines without a stable FontFaceSet.
  }
}

const prepareCarouselScroll = (): void => {
  const groups = document.querySelectorAll<HTMLElement>(
    '[data-scope="carousel"][data-part="item-group"]',
  )
  for (const group of groups) {
    group.style.scrollBehavior = "auto"
    delete group.dataset["visualScrollPosition"]
    delete group.dataset["visualStableFrames"]
  }
}

const carouselScrollIsStable = (): boolean => {
  const groups = document.querySelectorAll<HTMLElement>(
    '[data-scope="carousel"][data-part="item-group"]',
  )
  let allStable = true
  for (const group of groups) {
    const current = group.scrollLeft + group.scrollTop
    const previous = Number(group.dataset["visualScrollPosition"])
    const previousStableFrames = Number(
      group.dataset["visualStableFrames"] ?? "0",
    )
    const stableFrames =
      Number.isFinite(previous) && Math.abs(current - previous) < 1
        ? previousStableFrames + 1
        : 0
    group.dataset["visualScrollPosition"] = String(current)
    group.dataset["visualStableFrames"] = String(stableFrames)
    if (stableFrames < 2) {
      allStable = false
    }
  }
  return allStable
}

const waitForTwoAnimationFrames = async (): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<null>()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resolve(null)
    })
  })
  await promise
}

const storyRootHasContent = (): boolean => {
  const root = document.querySelector("#storybook-root")
  return root !== null && root.children.length > 0
}

const stylesheetsAreLoaded = (): boolean =>
  [
    ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ].every((link) => link.sheet !== null)

const prepareStoryImages = async (): Promise<void> => {
  const root = document.querySelector("#storybook-root")
  if (root === null) {
    return
  }
  const images = [...root.querySelectorAll("img")]
  await Promise.all(
    images.map(async (image) => {
      if (image.src.length === 0) {
        return
      }
      if (image.loading === "lazy") {
        image.loading = "eager"
      }
      try {
        await image.decode()
      } catch {
        // Decode failures fall through to the completeness wait.
      }
    }),
  )
}

const storyImagesAreComplete = (): boolean => {
  const root = document.querySelector("#storybook-root")
  if (root === null) {
    return false
  }
  const images = [...root.querySelectorAll("img")]
  return images.every(
    (image) =>
      image.src.length === 0 || (image.complete && image.naturalWidth > 0),
  )
}

const prepareHeadlessRichCombobox = async (
  page: Page,
  storyId: string,
): Promise<void> => {
  if (
    storyId !==
    "molecules-combobox-headless-rich-links--grouped-linked-suggestions"
  ) {
    return
  }
  const input = page.getByRole("combobox", {
    name: "Search documentation",
  })
  await input.focus()
  await input.press("ArrowDown")
  await page
    .locator('[data-scope="combobox"][data-part="item"][data-highlighted]')
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
}

test.describe.parallel("storybook visual", () => {
  selectedStories.map((story) => {
    test(`${story.title} ${story.name} should not have visual regressions`, async ({
      workerPage,
      browser,
    }, testInfo) => {
      let page = workerPage
      const ownedContext: {
        current: {
          close: () => Promise<void>
          newPage: () => Promise<Page>
        } | null
      } = { current: null }

      const createIsolatedPage = async () => {
        if (ownedContext.current) {
          await ownedContext.current.close()
        }
        ownedContext.current = await browser.newContext(
          omitUndefined(testInfo.project.use),
        )
        page = await ownedContext.current.newPage()
        await installHermeticImageRoutes(page)
      }

      const defaultCaptureMode: "expect" | "raw" = rawCaptureStories.has(
        `${story.id}:${testInfo.project.name}`,
      )
        ? "raw"
        : "expect"

      const run = async (
        captureMode: "expect" | "raw" = defaultCaptureMode,
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
        await page.waitForFunction(storyRootHasContent, undefined, {
          timeout: 30_000,
        })
        // Story CSS is injected as stylesheet links by dynamically imported
        // chunks; capturing before every sheet applies yields unstyled layout.
        await page.waitForFunction(stylesheetsAreLoaded, undefined, {
          timeout: 30_000,
        })
        await page.evaluate(waitForDocumentFonts)

        // Force lazy images to load eagerly so layout is deterministic, then
        // wait for every sourced image to finish loading and decoding. Images
        // are hermetic (local assets or fulfilled routes), so this must
        // succeed; failing loudly beats capturing a pre-load layout.
        await page.evaluate(prepareStoryImages)
        try {
          await page.waitForFunction(storyImagesAreComplete, undefined, {
            timeout: 30_000,
          })
        } catch {
          throw new Error("hermetic images failed to settle")
        }
        // WebKit can keep fit-content layout computed before image decode;
        // force a relayout so every capture sees the post-load geometry.
        await page.evaluate(() => {
          const root = document.querySelector("#storybook-root")
          if (!(root instanceof HTMLElement)) {
            return
          }
          root.style.display = "none"
          void root.offsetHeight
          root.style.display = ""
          void root.offsetHeight
        })

        const isCarouselStory =
          story.id.startsWith("molecules-carousel--") ||
          story.id.startsWith("templates-carouseltemplate--")
        if (isCarouselStory) {
          await page.evaluate(prepareCarouselScroll)
          const firstIndicators = page.locator(
            '[data-scope="carousel"][data-part="indicator"][data-index="0"]',
          )
          const indicatorCount = await firstIndicators.count()
          await Promise.all(
            Array.from({ length: indicatorCount }, async (_, index) => {
              await firstIndicators.nth(index).click()
            }),
          )
          await page.waitForFunction(carouselScrollIsStable, undefined, {
            timeout: 30_000,
          })
        }

        await prepareHeadlessRichCombobox(page, story.id)

        if (story.id.includes("carousel--autoplay")) {
          const autoplayTrigger = page.locator(
            '[data-scope="carousel"][data-part="autoplay-trigger"]',
          )
          if ((await autoplayTrigger.count()) > 0) {
            const label = await autoplayTrigger.getAttribute("aria-label")
            if (label?.toLowerCase().includes("stop") === true) {
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
            for (const tree of trees) {
              const statefulElements = tree.querySelectorAll<HTMLElement>(
                "[data-selected], [data-highlighted], [data-focused]",
              )
              for (const element of statefulElements) {
                Reflect.deleteProperty(element.dataset, "selected")
                Reflect.deleteProperty(element.dataset, "highlighted")
                Reflect.deleteProperty(element.dataset, "focused")
              }
              const selectedElements = tree.querySelectorAll(
                "[aria-selected], [aria-current]",
              )
              for (const element of selectedElements) {
                element.removeAttribute("aria-selected")
                element.removeAttribute("aria-current")
              }
            }
            document.body.tabIndex = -1
            document.body.focus({ preventScroll: true })
            document.body.removeAttribute("tabindex")
          })
        }

        await page.evaluate(waitForTwoAnimationFrames)

        if (story.id === "atoms-button--states") {
          mask.push(page.locator(".icon-\\[svg-spinners--ring-resize\\]"))
        }

        // Park the mouse on a transparent overlay so hover styles don't leak into screenshots.
        await page.evaluate(() => {
          const id = "__playwright_hover_shield__"
          if (document.querySelector(`#${id}`)) {
            return
          }
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
          document.body.append(shield)
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
            quality: 100,
            scale: "css",
            type: "jpeg",
            ...(mask.length > 0 ? { mask } : {}),
          })
          playwrightExpect(capture).toMatchSnapshot(`${story.id}.jpg`)
          return
        }
        await playwrightExpect(root).toHaveScreenshot(`${story.id}.png`, {
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
        await ownedContext.current?.close()
      }
    })
    return story.id
  })
})
