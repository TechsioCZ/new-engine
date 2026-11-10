import { readFileSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  test as base,
  expect,
  type Page,
  type TestInfo,
  type WorkerInfo,
} from "@playwright/test"
import { PNG } from "pngjs"
import { installVisualAssets } from "./visual-assets.mjs"
import { visualCaptureTiles } from "./visual-capture.mjs"
import { visualStories } from "./visual-completion.mjs"
import { assertDecodedVisualImages } from "./visual-image-readiness.mjs"
import {
  assertFloatingContainment,
  assertSubmenuCaptureReady,
  checkStoryPopupCheckpoints,
  popupCheckpointStories,
  visibleFloatingSurfaces,
} from "./visual-popup-capture.mjs"
import { resolveVisualTheme } from "./visual-projects.mjs"
import { freezeVisualSvgImages } from "./visual-svg.mjs"

type StorybookEntry = {
  id: string
  name: string
  title: string
  type: string
  tags?: string[]
}
type VisualBrand = "business" | "akros" | "n1"
type StorybookIndex = { entries: Record<string, StorybookEntry> }
type StoryReporter = { type?: string; status?: string }
type StoryCompletion = {
  storyId: string
  status?: string
  reporters?: StoryReporter[]
  requestedGlobals?: Record<string, unknown>
  declaredGlobals?: Record<string, unknown>
  userGlobals?: Record<string, unknown>
  effectiveGlobals?: Record<string, unknown>
  brandLock?: unknown
  visualTimedToasts?: unknown
}
type StorybookWindow = Window & {
  __VISUAL_RANDOM_RESET__?: () => void
  __VISUAL_SET_SEED__?: (seed: number) => void
  __STORYBOOK_ADDONS_CHANNEL__?: {
    on: (name: string, listener: (value: unknown) => void) => void
    off: (name: string, listener: (value: unknown) => void) => void
    emit: (name: string, value: unknown) => void
  }
  __STORYBOOK_PREVIEW__?: {
    ready: () => Promise<void>
    loadStory: (input: { storyId: string }) => Promise<{
      storyGlobals: Record<string, unknown>
      parameters: { brandLock?: unknown; visualTimedToasts?: unknown }
    }>
    getStoryContext: (story: { storyGlobals: Record<string, unknown> }) => {
      globals: Record<string, unknown>
      userGlobals: Record<string, unknown>
    }
  }
}
type VisualAssets = Awaited<ReturnType<typeof installVisualAssets>>
type StoryRun = {
  page: Page
  story: StorybookEntry
  testInfo: TestInfo
  origin: string
  assets: VisualAssets
  errors: string[]
  annotations: { type: string; description?: string }[]
  fast: boolean
  tokenChecks: Set<string>
}
type VisualSession = {
  context: BrowserContext
  page: Page
  origin: string
  assets: VisualAssets
  rendered: number
  lastStoryId: string | null
  dirty: boolean
  tokenChecks: Set<string>
  errors: string[]
}
type VisualSessions = {
  acquire: (storyId: string) => Promise<VisualSession>
  discard: () => Promise<void>
  close: () => Promise<void>
}

// Decoded RGBA comparison instead of Playwright's toHaveScreenshot, which
// tolerates anti-aliasing differences even with a zero threshold. Ignored:
// per-channel rounding between machines (local amd64 emulation vs native CI
// runners differ by a few levels) and a handful of anti-aliased edge pixels
// that vary between raster runs. Real regressions change far more pixels.
const channelTolerance = 8
const edgePixelAllowance = (width: number, height: number) =>
  Math.max(16, Math.round(width * height * 0.0002))

function pixelChanged(a: Buffer, e: Buffer, offset: number) {
  for (let channel = 0; channel < 4; channel += 1) {
    if (
      Math.abs(a.readUInt8(offset + channel) - e.readUInt8(offset + channel)) >
      channelTolerance
    ) {
      return true
    }
  }
  return false
}

function comparePng(actual: Buffer, expected: Buffer) {
  const a = PNG.sync.read(actual)
  const e = PNG.sync.read(expected)
  if (a.width !== e.width || a.height !== e.height) {
    return {
      equal: false,
      summary: `size ${a.width}x${a.height} differs from ${e.width}x${e.height}`,
    }
  }
  if (a.data.equals(e.data)) {
    return { equal: true }
  }
  const diff = new PNG({ width: a.width, height: a.height })
  let changedPixels = 0
  for (let offset = 0; offset < a.data.length; offset += 4) {
    const changed = pixelChanged(a.data, e.data, offset)
    changedPixels += Number(changed)
    // Changed pixels are red; unchanged pixels are a faded copy of the baseline.
    const faded = 255 - Math.round((255 - e.data.readUInt8(offset)) / 4)
    diff.data[offset] = changed ? 255 : faded
    diff.data[offset + 1] = changed ? 0 : faded
    diff.data[offset + 2] = changed ? 0 : faded
    diff.data[offset + 3] = 255
  }
  if (changedPixels <= edgePixelAllowance(a.width, a.height)) {
    return { equal: true }
  }
  return {
    equal: false,
    summary: `${changedPixels} pixels differ`,
    diff: PNG.sync.write(diff),
  }
}

// Timed toasts and smooth scrolls finish on their own; capture the settled
// frame instead of whichever moment a slower or faster machine reaches.
// Persistent toasts (duration Infinity) stay part of the frame.
async function settleTransientUi(
  page: Page,
  { waitForTimedToasts, fast }: { waitForTimedToasts: boolean; fast: boolean }
) {
  if (waitForTimedToasts) {
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              [
                ...document.querySelectorAll<HTMLElement>(
                  '[data-scope="toast"][data-part="root"]'
                ),
              ].filter((toast) =>
                Number.isFinite(
                  Number.parseFloat(
                    getComputedStyle(toast).getPropertyValue("--duration")
                  )
                )
              ).length
          ),
        { message: "Timed toasts did not dismiss", timeout: 20_000 }
      )
      .toBe(0)
  }
  if (fast) {
    await waitForFrameSettle(page)
    return
  }
  const scrollPositions = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("*")]
        .filter(
          (element) =>
            element.scrollWidth > element.clientWidth ||
            element.scrollHeight > element.clientHeight
        )
        .map((element) => `${element.scrollLeft},${element.scrollTop}`)
        .join("|")
    )
  let previous = await scrollPositions()
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(150)
        const current = await scrollPositions()
        const settled = current === previous
        previous = current
        return settled
      },
      { message: "Scroll positions did not settle", timeout: 10_000 }
    )
    .toBe(true)
}

async function attachComparison(
  testInfo: TestInfo,
  name: string,
  actual: Buffer,
  expected: Buffer | null,
  diff: Buffer | undefined
) {
  await testInfo.attach(`${name}-actual`, {
    body: actual,
    contentType: "image/png",
  })
  if (expected) {
    await testInfo.attach(`${name}-expected`, {
      body: expected,
      contentType: "image/png",
    })
  }
  if (diff) {
    await testInfo.attach(`${name}-diff`, {
      body: diff,
      contentType: "image/png",
    })
  }
}

// Fast-path scroll settle: same criterion as the polling loop, sampled per frame.
// The timer covers hidden or stalled pages where no animation frame arrives.
async function waitForFrameSettle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        let previous: string | undefined
        let frames = 0
        let done = false
        const finish = (error?: Error) => {
          done = true
          clearTimeout(timer)
          if (error) {
            reject(error)
            return
          }
          resolve()
        }
        const timer = setTimeout(
          () => finish(new Error("Scroll positions did not settle")),
          10_000
        )
        const sample = () => {
          if (done) {
            return
          }
          const current = [...document.querySelectorAll<HTMLElement>("*")]
            .filter(
              (element) =>
                element.scrollWidth > element.clientWidth ||
                element.scrollHeight > element.clientHeight
            )
            .map((element) => `${element.scrollLeft},${element.scrollTop}`)
            .join("|")
          if (current === previous) {
            finish()
            return
          }
          previous = current
          frames += 1
          if (frames > 600) {
            finish(new Error("Scroll positions did not settle"))
            return
          }
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
  )
}

async function compareSnapshotBuffer(
  actual: Buffer,
  name: string,
  testInfo: TestInfo,
  attachEvidence: boolean
) {
  const expectedPath = testInfo.snapshotPath(`${name}.png`, {
    kind: "screenshot",
  })
  const expected = await readFile(expectedPath).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  })
  const comparison = expected ? comparePng(actual, expected) : undefined
  const updateMode = testInfo.config.updateSnapshots
  if (
    updateMode === "all" ||
    (updateMode === "changed" && !comparison?.equal) ||
    (updateMode === "missing" && !expected)
  ) {
    await mkdir(path.dirname(expectedPath), { recursive: true })
    await writeFile(expectedPath, actual)
    return { passed: true, message: "" }
  }
  if (comparison?.equal) {
    return { passed: true, message: "" }
  }
  if (attachEvidence) {
    await attachComparison(testInfo, name, actual, expected, comparison?.diff)
  }
  return {
    passed: false,
    message: expected
      ? `Screenshot ${name} differs: ${comparison?.summary}`
      : `Screenshot expectation does not exist: ${expectedPath}`,
  }
}

const postCaptureBehaviorStories = new Set([
  "organisms-datatable--paginated-row-reorder",
  "molecules-steps--progress-horizontal",
  "molecules-steps--progress-vertical",
  "molecules-pagination--edge-cases",
])
const stepsReviewPanel = /Review/
const rowDropTargetClass = /border-b-2/
const stepsCompletedText =
  "All steps are complete. This content lives outside the indexed step panels."

async function assertPostCaptureBehavior(page: Page, storyId: string) {
  const canvas = page.locator("#storybook-root")
  if (storyId === "organisms-datatable--paginated-row-reorder") {
    const handle = canvas.getByRole("button", {
      name: "Drag to reorder row 4",
      exact: true,
    })
    const rowHandles = canvas.locator(
      'tbody button[aria-label^="Drag to reorder row "]'
    )
    const rowOrder = () =>
      rowHandles.evaluateAll((handles) =>
        handles.map((element) => element.getAttribute("aria-label"))
      )
    await expect
      .poll(rowOrder)
      .toEqual([
        "Drag to reorder row 4",
        "Drag to reorder row 5",
        "Drag to reorder row 6",
      ])
    await handle.focus()
    await handle.press("Space")
    await expect(handle).toHaveAttribute("aria-pressed", "true")
    await handle.press("ArrowDown")
    await expect(
      canvas.locator("tbody tr").filter({
        has: page.getByRole("button", {
          name: "Drag to reorder row 5",
          exact: true,
        }),
      })
    ).toHaveClass(rowDropTargetClass)
    await handle.press("Space")
    await expect
      .poll(rowOrder)
      .toEqual([
        "Drag to reorder row 5",
        "Drag to reorder row 4",
        "Drag to reorder row 6",
      ])
    await expect(handle).toHaveAttribute("aria-pressed", "false")
    await expect(handle).toBeFocused()
    await expect
      .poll(() =>
        canvas.evaluate((element) => {
          if (
            element.querySelector(
              "[data-dnd-dragging], [data-dnd-dropping], [data-dnd-placeholder]"
            )
          ) {
            return false
          }
          if (
            element
              .getAnimations({ subtree: true })
              .some(
                (animation) =>
                  animation.pending || animation.playState === "running"
              )
          ) {
            return false
          }
          return Array.from(element.querySelectorAll("tbody tr")).every(
            (row) => {
              const style = getComputedStyle(row)
              return style.transform === "none" && style.translate === "none"
            }
          )
        })
      )
      .toBe(true)
    await expect(handle).toBeFocused()
    return
  }
  if (storyId === "molecules-pagination--edge-cases") {
    // Unavailable destinations are link placeholders, not anchors with hrefs.
    const disabledLinks = canvas.getByRole("link", { disabled: true })
    const count = await disabledLinks.count()
    expect(count).toBeGreaterThan(0)
    const pageUrl = page.url()
    const selected = canvas.locator('a[aria-current="page"]')
    const selectedPages = await selected.allTextContents()
    for (let index = 0; index < count; index += 1) {
      const link = disabledLinks.nth(index)
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute("aria-disabled", "true")
      await expect(link).not.toHaveAttribute("href")
      await expect(link).toHaveAttribute("tabindex", "-1")
      await link.scrollIntoViewIfNeeded()
      const box = await link.boundingBox()
      if (!box || box.width <= 0 || box.height <= 0) {
        throw new Error("Disabled pagination link has no clickable bounds")
      }
      const point = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      }
      expect(
        await link.evaluate((element, coordinates) => {
          const hit = element.ownerDocument.elementFromPoint(
            coordinates.x,
            coordinates.y
          )
          return hit !== null && element.contains(hit)
        }, point)
      ).toBe(true)
      // aria-disabled prevents locator.click(); exercise an actual pointer instead.
      await page.mouse.click(point.x, point.y)
      await expect(page).toHaveURL(pageUrl)
      expect(await selected.allTextContents()).toEqual(selectedPages)
      await page.mouse.move(0, 0)
      await link.evaluate((element: HTMLElement) => element.blur())
      await expect(link).not.toBeFocused()
    }
    return
  }
  const horizontal = storyId === "molecules-steps--progress-horizontal"
  const progress = canvas.getByRole("progressbar", {
    name: horizontal ? "Release progress" : "Step progress",
  })
  const percent = () =>
    progress.getAttribute("aria-valuenow").then((value) => Number(value))
  await expect.poll(percent).toBeCloseTo(66.67, 1)
  if (horizontal) {
    await canvas.getByRole("button", { name: "Continue", exact: true }).click()
    await expect(progress).toHaveAttribute("aria-valuenow", "100")
    // Zag supplies percentage text; completion is exposed as data-complete.
    await expect(progress).toHaveAttribute("aria-valuetext", "100%")
    await expect(progress).toHaveAttribute("data-complete", "")
    await expect(
      canvas.getByText(stepsCompletedText, { exact: true })
    ).toBeVisible()
    await canvas.getByRole("button", { name: "Back", exact: true }).click()
  } else {
    await canvas.getByRole("button", { name: "Back", exact: true }).click()
    await expect.poll(percent).toBeCloseTo(33.33, 1)
    await canvas.getByRole("button", { name: "Continue", exact: true }).click()
  }
  await expect.poll(percent).toBeCloseTo(66.67, 1)
  await expect(
    canvas.getByRole("group", { name: stepsReviewPanel })
  ).toBeVisible()
  await expect(
    canvas.getByText(stepsCompletedText, { exact: true })
  ).not.toBeVisible()
  await progress.click()
  await expect
    .poll(() => page.evaluate(() => document.activeElement === document.body))
    .toBe(true)
}

const staticDir = process.env.VISUAL_STORYBOOK_STATIC_DIR
  ? path.resolve(process.env.VISUAL_STORYBOOK_STATIC_DIR)
  : path.resolve(import.meta.dirname, "../storybook-static")
const harPath =
  process.env.VISUAL_ASSET_HAR_PATH ??
  path.resolve(import.meta.dirname, "fixtures/visual-assets/assets.har")
const indexPath = path.join(staticDir, "index.json")
let storybookIndex: StorybookIndex
try {
  storybookIndex = JSON.parse(readFileSync(indexPath, "utf8")) as StorybookIndex
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") {
    throw new Error(
      "Storybook index.json not found. Build the supplied revision first."
    )
  }
  throw error
}

const stories = visualStories(storybookIndex.entries).sort((a, b) =>
  a.id.localeCompare(b.id, "en")
)
const storyFilter = (process.env.TEST_STORIES ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
const selectedStories = storyFilter.length
  ? stories.filter((story) => storyFilter.includes(story.id))
  : stories
const missingStories = storyFilter.filter(
  (id) => !stories.some((story) => story.id === id)
)
if (missingStories.length) {
  throw new Error(
    `Unmapped TEST_STORIES in supplied revision: ${missingStories.join(", ")}`
  )
}
const fixedDate = "2026-10-02T12:00:00.000Z"
const drawerVariants: Record<string, string[]> = {
  "molecules-drawer--placements": ["Start", "End", "Top", "Bottom"],
  "molecules-drawer--sizes": ["XS", "SM", "MD", "LG", "XL", "FULL"],
}
const finalText: Record<string, string> = {
  "molecules-fileupload--clearable": "restored.pdf",
  "molecules-fileupload--controlled": "controlled.txt",
  "molecules-fileupload--form": "signed.pdf",
}
const interactivePortals: Record<
  string,
  { scope: string; role: "dialog" | "listbox" | "tooltip"; hover?: boolean }
> = {
  "molecules-dialog--playground": { scope: "dialog", role: "dialog" },
  "molecules-popover--playground": { scope: "popover", role: "dialog" },
  "molecules-combobox--playground": { scope: "combobox", role: "listbox" },
  "atoms-tooltip--playground": {
    scope: "tooltip",
    role: "tooltip",
    hover: true,
  },
}

function storySeed(id: string) {
  let seed = 1
  for (const character of id) {
    seed = (seed * 31 + character.charCodeAt(0)) % 2_147_483_647
  }
  return seed
}

async function openPreview(page: Page) {
  await page.goto("/iframe.html", { waitUntil: "domcontentloaded" })
  await page.waitForFunction(
    () =>
      "__STORYBOOK_ADDONS_CHANNEL__" in window &&
      "__STORYBOOK_PREVIEW__" in window,
    undefined,
    { timeout: 30_000 }
  )
}

// Globals persist across story switches, so the fast path sends this once per session.
function applyGlobals(
  page: Page,
  mode: "light" | "dark",
  brand: VisualBrand,
  manualA11y: boolean
) {
  return page.evaluate(
    async ({ colorMode, colorBrand, manual }) => {
      const storybookWindow = window as StorybookWindow
      const channel = storybookWindow.__STORYBOOK_ADDONS_CHANNEL__
      const preview = storybookWindow.__STORYBOOK_PREVIEW__
      if (!(channel && preview)) {
        throw new Error("Storybook preview channel did not initialize")
      }
      await preview.ready()
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          channel.off("globalsUpdated", updated)
          reject(new Error("Storybook globals update timed out"))
        }, 30_000)
        const updated = () => {
          clearTimeout(timeout)
          channel.off("globalsUpdated", updated)
          resolve()
        }
        channel.on("globalsUpdated", updated)
        // Only the fast session goes manual: the addon's axe/APCA pass would
        // otherwise run per screenshot. Its reports never reject a story in
        // selectStory, so the verdict does not depend on it.
        channel.emit("updateGlobals", {
          globals: {
            brand: colorBrand,
            mode: colorMode,
            theme: colorMode,
            ...(manual ? { a11y: { manual: true } } : {}),
          },
        })
      })
    },
    { colorMode: mode, colorBrand: brand, manual: manualA11y }
  )
}

function selectStory(
  page: Page,
  id: string,
  mode: "light" | "dark",
  brand: VisualBrand
) {
  return page.evaluate(
    async ({ storyId, colorMode, colorBrand }) => {
      const storybookWindow = window as StorybookWindow
      const channel = storybookWindow.__STORYBOOK_ADDONS_CHANNEL__
      const preview = storybookWindow.__STORYBOOK_PREVIEW__
      if (!(channel && preview)) {
        throw new Error("Storybook preview channel did not initialize")
      }
      const completion = await new Promise<StoryCompletion>(
        (resolve, reject) => {
          const listeners: Record<string, (value: unknown) => void> = {}
          const cleanup = () => {
            clearTimeout(timeout)
            for (const [name, listener] of Object.entries(listeners)) {
              channel.off(name, listener)
            }
          }
          const fail = (value: unknown) => {
            cleanup()
            reject(
              new Error(`Story ${storyId} failed: ${JSON.stringify(value)}`)
            )
          }
          const timeout = setTimeout(
            () => fail("render/play completion timed out"),
            60_000
          )
          listeners.storyFinished = (value) => {
            const result = value as StoryCompletion
            if (result.storyId !== storyId) {
              return
            }
            cleanup()
            const failedReports =
              result.reporters?.filter(
                (report) => report.status === "failed"
              ) ?? []
            // Contrast reports remain evidence; render and play failures stop capture.
            if (
              result.status === "error" &&
              (!failedReports.length ||
                failedReports.some((report) => report.type !== "a11y"))
            ) {
              reject(
                new Error(
                  `Story ${storyId} finished with an error: ${JSON.stringify(result)}`
                )
              )
              return
            }
            resolve(result)
          }
          for (const name of [
            "storyErrored",
            "storyThrewException",
            "playFunctionThrewException",
            "unhandledErrorsWhilePlaying",
            "storyMissing",
          ]) {
            listeners[name] = fail
          }
          for (const [name, listener] of Object.entries(listeners)) {
            channel.on(name, listener)
          }
          storybookWindow.__VISUAL_RANDOM_RESET__?.()
          channel.emit("setCurrentStory", { storyId, viewMode: "story" })
        }
      )
      const preparedStory = await preview.loadStory({ storyId })
      const declaredGlobals = preparedStory.storyGlobals ?? {}
      const requestedGlobals = {
        brand: colorBrand,
        mode: colorMode,
        theme: colorMode,
      }
      const expectedGlobals = { ...requestedGlobals, ...declaredGlobals }
      const { globals: effectiveGlobals, userGlobals } =
        preview.getStoryContext(preparedStory)
      for (const key of ["brand", "mode"] as const) {
        if (userGlobals[key] !== requestedGlobals[key]) {
          throw new Error(
            `Story ${storyId} did not acknowledge requested ${key}`
          )
        }
        if (effectiveGlobals[key] !== expectedGlobals[key]) {
          throw new Error(`Story ${storyId} has an undeclared ${key} override`)
        }
      }
      return {
        ...completion,
        requestedGlobals,
        declaredGlobals,
        userGlobals,
        effectiveGlobals,
        brandLock: preparedStory.parameters.brandLock,
        visualTimedToasts: preparedStory.parameters.visualTimedToasts,
      }
    },
    { storyId: id, colorMode: mode, colorBrand: brand }
  )
}

async function renderStory(
  page: Page,
  id: string,
  mode: "light" | "dark",
  brand: VisualBrand
) {
  await openPreview(page)
  await applyGlobals(page, mode, brand, true)
  return selectStory(page, id, mode, brand)
}

async function waitForAssets(page: Page, storyId: string) {
  await page.evaluate(() => {
    for (const image of document.images) {
      image.loading = "eager"
    }
  })
  await page.waitForFunction(
    () =>
      Array.from(document.images).every((image) => {
        const style = getComputedStyle(image)
        return (
          !image.currentSrc ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          image.complete
        )
      }),
    undefined,
    { timeout: 30_000 }
  )
  await page.evaluate(assertDecodedVisualImages, storyId)
  await page.evaluate(async () => {
    await document.fonts.ready
    const failedFonts = Array.from(document.fonts).filter(
      (font) => font.status === "error"
    )
    if (failedFonts.length) {
      throw new Error(
        `Fonts failed to load: ${failedFonts.map((font) => font.family).join(", ")}`
      )
    }
    const backgroundUrls = new Set<string>()
    const imageUrlPattern = /url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g
    for (const element of document.querySelectorAll("*")) {
      const style = getComputedStyle(element)
      if (
        !(
          element.getClientRects().length &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        )
      ) {
        continue
      }
      for (const pseudo of [null, "::before", "::after"]) {
        const imageStyle = getComputedStyle(element, pseudo)
        for (const value of [
          imageStyle.backgroundImage,
          imageStyle.maskImage,
          imageStyle.getPropertyValue("-webkit-mask-image"),
        ]) {
          for (const match of value.matchAll(imageUrlPattern)) {
            const url = match[1] ?? match[2] ?? match[3]
            if (!url || url.startsWith("#")) {
              continue
            }
            const resolved = new URL(url, location.href)
            if (
              resolved.hash &&
              resolved.origin === location.origin &&
              resolved.pathname === location.pathname &&
              resolved.search === location.search
            ) {
              continue
            }
            backgroundUrls.add(resolved.href)
          }
        }
      }
    }
    await Promise.all(
      Array.from(backgroundUrls).map(async (src) => {
        const image = new Image()
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error(`Background image timed out: ${src}`)),
            30_000
          )
          image.onload = () => {
            clearTimeout(timeout)
            resolve()
          }
          image.onerror = () => {
            clearTimeout(timeout)
            reject(new Error(`Background image failed to load: ${src}`))
          }
          image.src = src
        })
        await image.decode()
        if (!(image.naturalWidth > 0 && image.naturalHeight > 0)) {
          throw new Error(`Background image has no decoded dimensions: ${src}`)
        }
      })
    )
  })
}

function assertThemeTokens(
  page: Page,
  brand: VisualBrand,
  mode: "light" | "dark"
) {
  return page.evaluate(
    ({ expectedBrand, expectedMode }) => {
      const html = document.documentElement
      const attribute = html.getAttribute("data-theme")
      const style = getComputedStyle(html)
      const primary = style.getPropertyValue("--color-bg-primary-base").trim()
      if (!(primary && style.colorScheme.split(" ").includes(expectedMode))) {
        throw new Error(
          `Theme CSS is missing for ${expectedBrand} ${expectedMode}`
        )
      }
      const names = Array.from(style).filter((name) => name.startsWith("--"))
      const selected = names.map((name) => style.getPropertyValue(name).trim())
      let overridden = false
      try {
        html.removeAttribute("data-theme")
        const baseStyle = getComputedStyle(html)
        overridden = names.some(
          (name, index) =>
            baseStyle.getPropertyValue(name).trim() !== selected[index]
        )
      } finally {
        if (attribute !== null) {
          html.setAttribute("data-theme", attribute)
        }
      }
      if (!overridden) {
        throw new Error(
          `${expectedBrand} is labeled on HTML but its token overrides are missing`
        )
      }
    },
    { expectedBrand: brand, expectedMode: mode }
  )
}

const freezeStyleId = "visual-freeze-style"
const freezeCss =
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}"

// The fast path tags the style so the next story's reset can remove it.
async function addFreezeStyle(page: Page, fast: boolean) {
  if (!fast) {
    await page.addStyleTag({ content: freezeCss })
    return
  }
  await page.evaluate(
    ({ id, css }) => {
      const style = document.createElement("style")
      style.id = id
      style.textContent = css
      document.head.append(style)
    },
    { id: freezeStyleId, css: freezeCss }
  )
}

function projectTheme(project: TestInfo["project"]): {
  mode: "light" | "dark"
  brand: VisualBrand
} {
  return {
    mode: project.use.colorScheme === "dark" ? "dark" : "light",
    brand: project.metadata.brand as VisualBrand,
  }
}

// Returns true when the story did more than the primary capture.
async function captureStory(run: StoryRun): Promise<boolean> {
  const {
    page,
    story,
    testInfo,
    origin,
    assets: disposeAssets,
    errors,
    annotations,
    fast,
    tokenChecks,
  } = run
  const { mode, brand } = projectTheme(testInfo.project)
  const completion = fast
    ? await selectStory(page, story.id, mode, brand)
    : await renderStory(page, story.id, mode, brand)
  const { brand: expectedBrand, mode: expectedMode } = resolveVisualTheme(
    completion.effectiveGlobals ?? {},
    completion.brandLock
  )
  if (completion.brandLock !== undefined) {
    annotations.push({
      type: "visual-brand-lock",
      description: `${expectedBrand}/${expectedMode}; captured in ${testInfo.project.name}`,
    })
  }
  await expect(page.locator("#storybook-root")).toBeAttached()
  await addFreezeStyle(page, fast)
  const settledText = finalText[story.id]
  if (settledText) {
    await expect(page.getByText(settledText, { exact: true })).toBeVisible()
  }
  if (story.id === "templates-facetfilterpanel--drawer-open") {
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible()
    await expect(
      page.getByRole("checkbox", { name: "Linen 9", exact: true })
    ).toBeChecked()
    await expect(
      page.getByRole("button", { name: "Remove Linen", exact: true })
    ).toBeVisible()
  }
  await page.mouse.move(0, 0)
  await settleTransientUi(page, {
    // Toast stories document the toast itself; elsewhere a timed
    // toast is transient feedback that must not decide the frame.
    waitForTimedToasts: completion.visualTimedToasts !== "capture",
    fast,
  })
  const root = page.locator("#storybook-root")
  const capture = async (suffix = "", fullPage = false) => {
    const beforeCapture =
      suffix === "--popup-submenu"
        ? () => assertSubmenuCaptureReady(page)
        : undefined
    await expect
      .poll(
        () =>
          page.evaluate(
            ({ expectedBrand: themeBrand, expectedMode: themeMode }) => {
              const html = document.documentElement
              return (
                html.getAttribute("data-theme") === themeBrand &&
                html.classList.contains(themeMode) &&
                !html.classList.contains(
                  themeMode === "dark" ? "light" : "dark"
                )
              )
            },
            { expectedBrand, expectedMode }
          ),
        {
          message: `Expected ${expectedBrand} ${expectedMode} theme was not applied`,
        }
      )
      .toBe(true)
    await disposeAssets.whenIdle()
    await freezeVisualSvgImages(page, {
      fixedTime: 0.75,
      readSvgSource: (url) => {
        const parsed = new URL(url)
        if (parsed.origin !== origin) {
          return disposeAssets.readSvg(url)
        }
        if (!parsed.pathname.toLowerCase().endsWith(".svg")) {
          return Promise.resolve(null)
        }
        const file = path.resolve(
          staticDir,
          `.${decodeURIComponent(parsed.pathname)}`
        )
        const relative = path.relative(staticDir, file)
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          throw new Error(`Local SVG escapes supplied static tree: ${url}`)
        }
        return Promise.resolve(readFileSync(file, "utf8"))
      },
    })
    await page.evaluate(() => {
      for (const svg of document.querySelectorAll("svg")) {
        if (svg.querySelector("animate,animateTransform,animateMotion")) {
          svg.pauseAnimations()
          svg.setCurrentTime(0)
        }
      }
    })
    await waitForAssets(page, story.id)
    await disposeAssets.whenIdle()
    const themeKey = `${expectedBrand}/${expectedMode}`
    if (!(fast && tokenChecks.has(themeKey))) {
      await assertThemeTokens(page, expectedBrand, expectedMode)
      tokenChecks.add(themeKey)
    }
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    )
    if (errors.length) {
      throw new Error(`Browser errors: ${errors.join("\n")}`)
    }
    const name = `${story.id}${suffix}`
    const options = {
      animations: "disabled" as const,
      caret: "hide" as const,
      scale: "css" as const,
    }
    const framing = fullPage
      ? null
      : await root.evaluate((element) => {
          const rootBox = element.getBoundingClientRect()
          // Positioned marker labels deliberately extend beyond the slider
          // root. Include their ink without resizing or hiding overflow.
          const markers = Array.from(
            element.querySelectorAll(
              '[data-scope="slider"][data-part="marker"], [data-scope="slider"][data-part="marker"] *'
            )
          )
            .filter((marker) => {
              const style = getComputedStyle(marker)
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                marker.getClientRects().length > 0
              )
            })
            .map((marker) => marker.getBoundingClientRect())
          const boxes = [rootBox, ...markers]
          const left = Math.max(
            0,
            Math.floor(
              Math.min(...boxes.map((box) => box.left)) + window.scrollX
            )
          )
          const top = Math.max(
            0,
            Math.floor(
              Math.min(...boxes.map((box) => box.top)) + window.scrollY
            )
          )
          const right = Math.ceil(
            Math.max(...boxes.map((box) => box.right)) + window.scrollX
          )
          const bottom = Math.ceil(
            Math.max(...boxes.map((box) => box.bottom)) + window.scrollY
          )
          return {
            includesMarkers: markers.length > 0,
            bounds: {
              x: left,
              y: top,
              width: right - left,
              height: bottom - top,
            },
          }
        })
    const tiles = framing ? visualCaptureTiles(framing.bounds) : []
    if (tiles.length) {
      annotations.push({
        type: "visual-capture-tiles",
        description: JSON.stringify({ name, tiles }),
      })
    }
    // No truncation or coverage exemption: compare every tile, retaining
    // the primary name for the first and unique suffixes for the rest.
    for (const tile of tiles.length ? tiles : [null]) {
      let actual: Buffer
      await beforeCapture?.()
      if (tile) {
        actual = await page.screenshot({
          ...options,
          fullPage: true,
          clip: tile.clip,
        })
      } else if (fullPage) {
        actual = await page.screenshot({ ...options, fullPage: true })
      } else if (framing?.includesMarkers) {
        actual = await page.screenshot({
          ...options,
          fullPage: true,
          clip: framing.bounds,
        })
      } else {
        actual = await root.screenshot(options)
      }
      await beforeCapture?.()
      if (fullPage) {
        const surfaces = await visibleFloatingSurfaces(page)
        assertFloatingContainment(surfaces, PNG.sync.read(actual))
      }
      const snapshot = await compareSnapshotBuffer(
        actual,
        `${name}${tile?.suffix ?? ""}`,
        testInfo,
        !fast
      )
      await disposeAssets.whenIdle()
      expect(snapshot.passed, snapshot.message).toBe(true)
    }
  }
  await capture()
  const hasVisiblePortal = (await visibleFloatingSurfaces(page)).some(
    (surface) => surface.external
  )
  if (hasVisiblePortal) {
    await capture("--portal-open", true)
  }
  await checkStoryPopupCheckpoints(page, story.id, (suffix) =>
    capture(suffix, true)
  )
  const portalCase = interactivePortals[story.id]
  if (portalCase) {
    const trigger = root
      .locator(`[data-scope="${portalCase.scope}"][data-part="trigger"]`)
      .first()
    if (portalCase.hover) {
      await trigger.hover()
    } else {
      await trigger.click()
    }
    await expect(page.getByRole(portalCase.role).first()).toBeVisible()
    await capture("--interaction-open", true)
  }
  for (const variant of drawerVariants[story.id] ?? []) {
    await page.getByRole("button", { name: variant, exact: true }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute("data-state", "open")
    await page.mouse.move(0, 0)
    await capture(`-${variant.toLowerCase()}-open`, true)
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
  }
  if (postCaptureBehaviorStories.has(story.id)) {
    await assertPostCaptureBehavior(page, story.id)
    if (errors.length) {
      throw new Error(`Browser errors: ${errors.join("\n")}`)
    }
  }
  return (
    hasVisiblePortal ||
    Boolean(drawerVariants[story.id]) ||
    Boolean(interactivePortals[story.id]) ||
    postCaptureBehaviorStories.has(story.id) ||
    popupCheckpointStories.some(([id]) => id === story.id)
  )
}

const visualContextKeys: (keyof BrowserContextOptions)[] = [
  "viewport",
  "userAgent",
  "deviceScaleFactor",
  "isMobile",
  "hasTouch",
  "colorScheme",
  "locale",
  "timezoneId",
  "reducedMotion",
  "serviceWorkers",
  "baseURL",
]

function visualContextOptions(use: BrowserContextOptions) {
  const options: BrowserContextOptions = {}
  for (const key of visualContextKeys) {
    if (use[key] !== undefined) {
      Object.assign(options, { [key]: use[key] })
    }
  }
  return options
}

async function runCanonical(
  browser: Browser,
  story: StorybookEntry,
  testInfo: TestInfo
): Promise<void> {
  const context = await browser.newContext(
    visualContextOptions(testInfo.project.use)
  )
  const annotations: StoryRun["annotations"] = []
  try {
    const page = await context.newPage()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    // Deterministic per-story Math.random; Storybook resets it before each render.
    await context.addInitScript((initialSeed) => {
      let state = initialSeed || 1
      Math.random = () => {
        state = (state * 48_271) % 2_147_483_647
        return state / 2_147_483_647
      }
      ;(window as StorybookWindow).__VISUAL_RANDOM_RESET__ = () => {
        state = initialSeed || 1
      }
    }, storySeed(story.id))
    await page.clock.setFixedTime(new Date(fixedDate))
    const origin = new URL(String(testInfo.project.use.baseURL)).origin
    const assets = await installVisualAssets(context, {
      harPath,
      origin,
    })
    const failures: unknown[] = []
    try {
      await captureStory({
        page,
        story,
        testInfo,
        origin,
        assets,
        errors,
        annotations,
        fast: false,
        tokenChecks: new Set<string>(),
      })
    } catch (error) {
      failures.push(error)
    } finally {
      try {
        await assets?.()
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length === 1) {
      throw failures[0]
    }
    if (failures.length > 1) {
      throw new AggregateError(
        failures,
        "Visual capture and asset cleanup failed"
      )
    }
  } finally {
    testInfo.annotations.push(...annotations)
    await context.close()
  }
}

// Fast-path sessions are shared by one worker. Storybook keeps its globals, so
// a session boots once and renders many stories; anything that leaves
// overlays, storage or a repeated story forces a fresh page.
const maxRendersPerSession = 150

function fastPathAllowed(testInfo: TestInfo) {
  return (
    testInfo.config.updateSnapshots === "none" &&
    process.env.VISUAL_CANONICAL !== "1"
  )
}

async function bootSession(
  browser: Browser,
  workerInfo: WorkerInfo
): Promise<VisualSession> {
  const context = await browser.newContext(
    visualContextOptions(workerInfo.project.use)
  )
  try {
    const page = await context.newPage()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    // Math.random is reseeded per story through __VISUAL_SET_SEED__.
    await context.addInitScript(() => {
      let seed = 1
      let state = 1
      Math.random = () => {
        state = (state * 48_271) % 2_147_483_647
        return state / 2_147_483_647
      }
      const storybookWindow = window as StorybookWindow
      storybookWindow.__VISUAL_RANDOM_RESET__ = () => {
        state = seed
      }
      storybookWindow.__VISUAL_SET_SEED__ = (next) => {
        seed = next || 1
        state = seed
      }
    })
    await page.clock.setFixedTime(new Date(fixedDate))
    const origin = new URL(String(workerInfo.project.use.baseURL)).origin
    const assets = await installVisualAssets(context, { harPath, origin })
    await openPreview(page)
    const { mode, brand } = projectTheme(workerInfo.project)
    await applyGlobals(page, mode, brand, true)
    return {
      context,
      page,
      origin,
      assets,
      rendered: 0,
      lastStoryId: null,
      dirty: false,
      tokenChecks: new Set(),
      errors,
    }
  } catch (error) {
    await context.close()
    throw error
  }
}

async function closeSession(session: VisualSession) {
  try {
    await session.assets()
  } finally {
    await session.context.close()
  }
}

function createVisualSessions(
  browser: Browser,
  workerInfo: WorkerInfo
): VisualSessions {
  let current: VisualSession | undefined
  const close = async () => {
    const session = current
    current = undefined
    if (session) {
      await closeSession(session)
    }
  }
  return {
    acquire: async (storyId) => {
      if (
        !current ||
        current.dirty ||
        current.rendered >= maxRendersPerSession ||
        current.lastStoryId === storyId
      ) {
        await close()
        current = await bootSession(browser, workerInfo)
      }
      return current
    },
    // Discard runs after a failed fast attempt; the canonical retry is the verdict.
    discard: async () => {
      await close().catch(() => undefined)
    },
    close,
  }
}

async function resetForStory(page: Page, storyId: string) {
  await page.evaluate(
    ({ id, seed }) => {
      document.getElementById(id)?.remove()
      window.scrollTo(0, 0)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      localStorage.clear()
      sessionStorage.clear()
      const storybookWindow = window as StorybookWindow
      storybookWindow.__VISUAL_SET_SEED__?.(seed)
    },
    { id: freezeStyleId, seed: storySeed(storyId) }
  )
  await page.mouse.move(0, 0)
}

// Cookies and toasts survive resetForStory and would reach the next story in a
// shared session; a fresh page never has them.
function leavesSharedState(page: Page) {
  return page.evaluate(
    () =>
      document.cookie !== "" ||
      document.querySelector('[data-scope="toast"][data-part="root"]') !== null
  )
}

async function runFast(
  session: VisualSession,
  story: StorybookEntry,
  testInfo: TestInfo
) {
  await resetForStory(session.page, story.id)
  const annotations: StoryRun["annotations"] = []
  const beyondPrimary = await captureStory({
    page: session.page,
    story,
    testInfo,
    origin: session.origin,
    assets: session.assets,
    errors: session.errors,
    annotations,
    fast: true,
    tokenChecks: session.tokenChecks,
  })
  await session.assets.whenIdle()
  testInfo.annotations.push(...annotations)
  // Errors are cleared only at a clean story boundary, so one raised while the
  // session booted still fails the first story into the canonical retry.
  session.errors.length = 0
  session.rendered += 1
  session.lastStoryId = story.id
  if (beyondPrimary || (await leavesSharedState(session.page))) {
    session.dirty = true
  }
}

// Bounds the whole fast attempt, including a session boot that never finishes.
// Closing the session rejects any pending evaluate, so the fallback starts cleanly.
const fastAttemptBudgetMs = 45_000

async function runFastAttempt(
  visualSessions: VisualSessions,
  story: StorybookEntry,
  testInfo: TestInfo
) {
  let abandoned = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abandoned = true
      reject(new Error(`Fast attempt exceeded ${fastAttemptBudgetMs} ms`))
    }, fastAttemptBudgetMs)
  })
  const attempt = visualSessions.acquire(story.id).then(async (session) => {
    if (!abandoned) {
      await runFast(session, story, testInfo)
    }
  })
  try {
    await Promise.race([attempt, deadline])
  } finally {
    clearTimeout(timer)
  }
}

function retryReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (message.split("\n")[0] ?? "").slice(0, 300)
}

const test = base.extend<object, { visualSessions: VisualSessions }>({
  visualSessions: [
    async ({ browser }, use, workerInfo) => {
      const sessions = createVisualSessions(browser, workerInfo)
      await use(sessions)
      await sessions.close()
    },
    { scope: "worker" },
  ],
})

test.describe
  .parallel("storybook visual", () => {
    for (const story of selectedStories) {
      test(`${story.title} ${story.name} should not have visual regressions`, async ({
        browser,
        visualSessions,
      }, testInfo) => {
        testInfo.annotations.push({
          type: "visual-story-id",
          description: story.id,
        })
        if (!fastPathAllowed(testInfo)) {
          await runCanonical(browser, story, testInfo)
          return
        }
        try {
          await runFastAttempt(visualSessions, story, testInfo)
          return
        } catch (error) {
          await visualSessions.discard()
          testInfo.annotations.push({
            type: "visual-canonical-retry",
            description: retryReason(error),
          })
        }
        // The canonical retry gets its own budget on top of the test timeout.
        testInfo.setTimeout(testInfo.timeout + fastAttemptBudgetMs)
        await runCanonical(browser, story, testInfo)
      })
    }
  })
