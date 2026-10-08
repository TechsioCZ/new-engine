import { readFileSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { expect, type Page, type TestInfo, test } from "@playwright/test"
import { PNG } from "pngjs"
import { installVisualAssets } from "./visual-assets.mjs"
import { freezeVisualSvgImages } from "./visual-svg.mjs"

type StorybookEntry = { id: string; name: string; title: string; type: string }
type VisualBrand = "base" | "neo" | "business" | "akros"
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
}
type StorybookWindow = Window & {
  __VISUAL_RANDOM_RESET__?: () => void
  __STORYBOOK_ADDONS_CHANNEL__?: {
    on: (name: string, listener: (value: unknown) => void) => void
    off: (name: string, listener: (value: unknown) => void) => void
    emit: (name: string, value: unknown) => void
  }
  __STORYBOOK_PREVIEW__?: {
    ready: () => Promise<void>
    loadStory: (input: { storyId: string }) => Promise<{
      storyGlobals: Record<string, unknown>
    }>
    getStoryContext: (story: { storyGlobals: Record<string, unknown> }) => {
      globals: Record<string, unknown>
      userGlobals: Record<string, unknown>
    }
  }
}

// Exact decoded RGBA equality: Playwright's toHaveScreenshot tolerates
// anti-aliasing differences even with a zero threshold.
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
    const changed = a.data.readUInt32BE(offset) !== e.data.readUInt32BE(offset)
    changedPixels += Number(changed)
    // Changed pixels are red; unchanged pixels are a faded copy of the baseline.
    const faded = 255 - Math.round((255 - e.data.readUInt8(offset)) / 4)
    diff.data[offset] = changed ? 255 : faded
    diff.data[offset + 1] = changed ? 0 : faded
    diff.data[offset + 2] = changed ? 0 : faded
    diff.data[offset + 3] = 255
  }
  return {
    equal: false,
    summary: `${changedPixels} pixels differ`,
    diff: PNG.sync.write(diff),
  }
}

async function compareSnapshotBuffer(
  actual: Buffer,
  name: string,
  testInfo: TestInfo
) {
  const expectedPath = testInfo.snapshotPath(`${name}.png`, {
    kind: "screenshot",
  })
  const expected = await readFile(expectedPath).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return
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
  if (comparison?.diff) {
    await testInfo.attach(`${name}-diff`, {
      body: comparison.diff,
      contentType: "image/png",
    })
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
    const disabledLinks = canvas.locator('a[aria-disabled="true"]')
    const count = await disabledLinks.count()
    expect(count).toBeGreaterThan(0)
    const pageUrl = page.url()
    const selected = canvas.locator('a[aria-current="page"]')
    const selectedPages = await selected.allTextContents()
    for (let index = 0; index < count; index += 1) {
      const link = disabledLinks.nth(index)
      await expect(link).toBeVisible()
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
      await link.evaluate((element: HTMLAnchorElement) => element.blur())
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
    await expect(progress).toHaveAttribute("aria-valuetext", "100% complete")
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
    canvas.getByRole("tabpanel", { name: stepsReviewPanel })
  ).toBeVisible()
  await expect(
    canvas.getByText(stepsCompletedText, { exact: true })
  ).not.toBeVisible()
  await progress.click()
  await expect
    .poll(() => page.evaluate(() => document.activeElement === document.body))
    .toBe(true)
}

const staticDir = path.resolve(import.meta.dirname, "../storybook-static")
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

const stories = Object.values(storybookIndex.entries)
  .filter((entry) => entry.type === "story")
  .sort((a, b) => a.id.localeCompare(b.id, "en"))
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

async function renderStory(
  page: Page,
  id: string,
  mode: "light" | "dark",
  brand: VisualBrand
) {
  await page.goto("/iframe.html", { waitUntil: "domcontentloaded" })
  await page.waitForFunction(
    () =>
      "__STORYBOOK_ADDONS_CHANNEL__" in window &&
      "__STORYBOOK_PREVIEW__" in window,
    undefined,
    { timeout: 30_000 }
  )
  return page.evaluate(
    async ({ storyId, colorMode, colorBrand }) => {
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
        channel.emit("updateGlobals", {
          globals: { brand: colorBrand, mode: colorMode, theme: colorMode },
        })
      })
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
      }
    },
    { storyId: id, colorMode: mode, colorBrand: brand }
  )
}

async function waitForAssets(page: Page) {
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
    const images = Array.from(document.images).filter((image) => {
      const style = getComputedStyle(image)
      return (
        image.currentSrc &&
        image.getClientRects().length &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      )
    })
    for (const image of images) {
      if (
        !(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
      ) {
        throw new Error(`Visible image failed to load: ${image.currentSrc}`)
      }
      await image.decode()
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
      if (expectedBrand === "base") {
        return
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

test.describe
  .parallel("storybook visual", () => {
    for (const story of selectedStories) {
      test(`${story.title} ${story.name} should not have visual regressions`, async ({
        page,
        context,
      }, testInfo) => {
        testInfo.annotations.push({
          type: "visual-story-id",
          description: story.id,
        })
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
        const disposeAssets = await installVisualAssets(context, {
          harPath,
          origin,
        })
        const failures: unknown[] = []
        try {
          const mode =
            testInfo.project.use.colorScheme === "dark" ? "dark" : "light"
          const brand = testInfo.project.metadata.brand as VisualBrand
          const completion = await renderStory(page, story.id, mode, brand)
          const expectedBrand = completion.effectiveGlobals?.brand
          const expectedMode = completion.effectiveGlobals?.mode
          if (
            !(
              (expectedBrand === "base" ||
                expectedBrand === "neo" ||
                expectedBrand === "business" ||
                expectedBrand === "akros") &&
              (expectedMode === "light" || expectedMode === "dark")
            )
          ) {
            throw new Error(`Unsupported declared story theme for ${story.id}`)
          }
          if (
            (expectedBrand === "business" || expectedBrand === "akros") &&
            expectedMode === "dark"
          ) {
            throw new Error(`Unsupported ${expectedBrand} dark story theme`)
          }
          await expect(page.locator("#storybook-root")).toBeAttached()
          await page.addStyleTag({
            content:
              "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}",
          })
          const settledText = finalText[story.id]
          if (settledText) {
            await expect(
              page.getByText(settledText, { exact: true })
            ).toBeVisible()
          }
          if (story.id === "templates-facetfilterpanel--drawer-open") {
            await expect(
              page.getByRole("dialog", { name: "Filters" })
            ).toBeVisible()
            await expect(
              page.getByRole("checkbox", { name: "Linen 9", exact: true })
            ).toBeChecked()
            await expect(
              page.getByRole("button", { name: "Remove Linen", exact: true })
            ).toBeVisible()
          }
          await page.mouse.move(0, 0)
          const root = page.locator("#storybook-root")
          const capture = async (suffix = "", fullPage = false) => {
            await expect
              .poll(
                () =>
                  page.evaluate(
                    ({
                      expectedBrand: themeBrand,
                      expectedMode: themeMode,
                    }) => {
                      const html = document.documentElement
                      return (
                        html.getAttribute("data-theme") ===
                          (themeBrand === "base" ? null : themeBrand) &&
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
                  throw new Error(
                    `Local SVG escapes supplied static tree: ${url}`
                  )
                }
                return Promise.resolve(readFileSync(file, "utf8"))
              },
            })
            await page.evaluate(() => {
              for (const svg of document.querySelectorAll("svg")) {
                if (
                  svg.querySelector("animate,animateTransform,animateMotion")
                ) {
                  svg.pauseAnimations()
                  svg.setCurrentTime(0)
                }
              }
            })
            await waitForAssets(page)
            await disposeAssets.whenIdle()
            await assertThemeTokens(page, expectedBrand, expectedMode)
            await page.evaluate(
              () =>
                new Promise<void>((resolve) =>
                  requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve())
                  )
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
            const actual = fullPage
              ? await page.screenshot({ ...options, fullPage: true })
              : await root.screenshot(options)
            const snapshot = await compareSnapshotBuffer(actual, name, testInfo)
            await disposeAssets.whenIdle()
            expect(snapshot.passed, snapshot.message).toBe(true)
          }
          await capture()
          const hasVisiblePortal = await page.evaluate(() =>
            Array.from(
              document.querySelectorAll(
                '[role="dialog"],[role="menu"],[role="listbox"],[role="tooltip"]'
              )
            ).some((element) => {
              const rootElement = document.getElementById("storybook-root")
              const style = getComputedStyle(element)
              return (
                !rootElement?.contains(element) &&
                element.getClientRects().length > 0 &&
                style.display !== "none" &&
                style.visibility !== "hidden"
              )
            })
          )
          if (hasVisiblePortal) {
            await capture("--portal-open", true)
          }
          const portalCase = interactivePortals[story.id]
          if (portalCase) {
            const trigger = root
              .locator(
                `[data-scope="${portalCase.scope}"][data-part="trigger"]`
              )
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
            await page
              .getByRole("button", { name: variant, exact: true })
              .click()
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
        } catch (error) {
          failures.push(error)
        } finally {
          try {
            await disposeAssets?.()
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
      })
    }
  })
