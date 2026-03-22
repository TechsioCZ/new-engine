import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test as base, type Locator, type Page } from '@playwright/test'

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
const indexPath = path.resolve(__dirname, '../storybook-static/index.json')
const resetEnv = (process.env.PLAYWRIGHT_PAGE_RESET ?? '').toLowerCase()
const shouldResetBetweenTests =
  resetEnv === ''
    ? true
    : resetEnv === '1' || resetEnv === 'true' || resetEnv === 'yes'

let storybookIndex: StorybookIndex

const test = base.extend<{}, { workerPage: Page }>({
  workerPage: [
    async ({ browser }, use, testInfo) => {
      const context = await browser.newContext(testInfo.project.use)
      const page = await context.newPage()
      await use(page)
      await context.close()
    },
    { scope: 'worker' },
  ],
})

try {
  const raw = readFileSync(indexPath, 'utf-8')
  storybookIndex = JSON.parse(raw) as StorybookIndex
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new Error(
      "Storybook index.json not found. Run 'pnpm build:storybook' first.",
    )
  }
  throw error
}

const stories = Object.values(
  storybookIndex.entries,
).filter((entry) => entry.type === 'story')

const storyFilter = (process.env.TEST_STORIES ?? '')
  .split(',')
  .map((storyId) => storyId.trim())
  .filter(Boolean)

const selectedStories =
  storyFilter.length > 0
    ? stories.filter((story) => storyFilter.includes(story.id))
    : stories

if (storyFilter.length > 0 && selectedStories.length === 0) {
  throw new Error(
    `No stories matched TEST_STORIES=${storyFilter.join(',')}`,
  )
}

test.describe.parallel('storybook visual', () => {
  for (const story of selectedStories) {
    test(
      `${story.title} ${story.name} should not have visual regressions`,
      async ({ workerPage, browser }, testInfo) => {
        let page = workerPage
        let ownedContext: { close: () => Promise<void>; newPage: () => Promise<Page> } | null = null

        const createIsolatedPage = async () => {
          if (ownedContext) {
            await ownedContext.close()
          }
          ownedContext = await browser.newContext(testInfo.project.use)
          page = await ownedContext.newPage()
        }

        const isRecoverableError = (error: unknown) => {
          if (!error || typeof error !== 'object') {
            return false
          }
          const message = String((error as Error).message || '')
          return (
            message.includes('Target page, context or browser has been closed') ||
            message.includes('Page crashed') ||
            message.includes('net::ERR_ABORTED') ||
            message.includes('frame was detached')
          )
        }

        const run = async () => {
          const params = new URLSearchParams({
            id: story.id,
            viewMode: 'story',
          })
          const mask: Locator[] = []

          if (shouldResetBetweenTests) {
            try {
              await page.context().clearCookies()
              await page.goto('about:blank')
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
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.goto(`/iframe.html?${params.toString()}`, {
              waitUntil: 'domcontentloaded',
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

          await page.waitForSelector('#storybook-root')
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
              const root = document.querySelector('#storybook-root')
              return root && root.children.length > 0
            },
            { timeout: 30_000 },
          )
          await page.evaluate(async () => {
            if (!('fonts' in document)) {
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

          try {
            await page.waitForFunction(
              () => {
                const root = document.querySelector('#storybook-root')
                if (!root) return false
                const images = root.querySelectorAll('img')
                if (images.length === 0) return true
                return Array.from(images).every((img) => {
                  if (!img.src) return true
                  if (img.loading === 'lazy') return true
                  return img.complete
                })
              },
              { timeout: 5000 },
            )
          } catch {
            // image readiness is best-effort; avoid failing on lazy/offscreen images
          }

          const isCarouselStory =
            story.id.startsWith('molecules-carousel--') ||
            story.id.startsWith('templates-carouseltemplate--')
          if (isCarouselStory) {
            await page.evaluate(async () => {
              const groups = Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[data-scope="carousel"][data-part="item-group"]',
                ),
              )

              for (const group of groups) {
                group.style.scrollSnapType = 'none'
                group.style.scrollBehavior = 'auto'
                group.scrollLeft = 0
                group.scrollTop = 0
              }

              const waitForStableScroll = async (el: HTMLElement) => {
                let last = el.scrollLeft + el.scrollTop
                for (let i = 0; i < 10; i += 1) {
                  await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => resolve()),
                  )
                  const current = el.scrollLeft + el.scrollTop
                  if (Math.abs(current - last) < 1) return
                  last = current
                }
              }

              await Promise.all(
                groups.map((group) => waitForStableScroll(group)),
              )
            })
          }

          if (story.id.includes('carousel--autoplay')) {
            const autoplayTrigger = page.locator(
              '[data-scope="carousel"][data-part="autoplay-trigger"]',
            )
            if (await autoplayTrigger.count()) {
              const label = await autoplayTrigger.getAttribute('aria-label')
              if (label && label.toLowerCase().includes('stop')) {
                await autoplayTrigger.click()
              }
            }

            const firstIndicator = page.locator(
              '[data-scope="carousel"][data-part="indicator"][data-index="0"]',
            )
            if (await firstIndicator.count()) {
              await firstIndicator.click()
            }
          }

          if (story.id.startsWith('molecules-treeview--')) {
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
                  .querySelectorAll('[data-selected], [data-highlighted], [data-focused]')
                  .forEach((el) => {
                    el.removeAttribute('data-selected')
                    el.removeAttribute('data-highlighted')
                    el.removeAttribute('data-focused')
                  })
                tree
                  .querySelectorAll('[aria-selected], [aria-current]')
                  .forEach((el) => {
                    el.removeAttribute('aria-selected')
                    el.removeAttribute('aria-current')
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
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          )

          if (story.id === 'atoms-button--states') {
            mask.push(
              page.locator('.icon-\\[svg-spinners--ring-resize\\]'),
            )
          }

          // Park the mouse on a transparent overlay so hover styles don't leak into screenshots.
          await page.evaluate(() => {
            const id = '__playwright_hover_shield__'
            if (document.getElementById(id)) return
            const shield = document.createElement('div')
            shield.id = id
            shield.style.position = 'fixed'
            shield.style.left = '0'
            shield.style.top = '0'
            shield.style.width = '24px'
            shield.style.height = '24px'
            shield.style.zIndex = '2147483647'
            shield.style.pointerEvents = 'auto'
            shield.style.background = 'transparent'
            document.body.appendChild(shield)
          })
          await page.mouse.move(12, 12)

          // Element screenshots are faster and avoid full-page rendering cost.
          const root = page.locator('#storybook-root')
          await expect(root).toHaveScreenshot(
            `${story.id}.png`,
            {
              animations: 'disabled',
              ...(mask.length > 0 ? { mask } : {}),
            },
          )
        }

        if (page.isClosed()) {
          await createIsolatedPage()
        }

        try {
          await run()
        } finally {
          const contextToClose = ownedContext as { close: () => Promise<void> } | null
          await contextToClose?.close()
        }
      },
    )
  }
})
