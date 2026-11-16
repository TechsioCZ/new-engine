import { expect, type Page, test } from "@playwright/test"
import { installPlayerMediaFixture } from "./player-media-fixture"

const PLAY_LABEL = /^(Play|Pause)$/
const MUTE_LABEL = /^(Mute|Unmute)$/
const pageErrors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on("pageerror", (error) => errors.push(error.message))
  await installPlayerMediaFixture(page)
})

test.afterEach(({ page }) => {
  expect(pageErrors.get(page), "unhandled browser errors").toEqual([])
})

test("audio cover leaves room for visible, usable sliders", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--with-title-and-cover&viewMode=story"
  )
  await expect(
    page.getByRole("button", { name: "Play", exact: true })
  ).toBeVisible()
  const player = page.locator("[data-media-player]")
  expect((await player.boundingBox())?.width).toBeGreaterThan(150)
  const cover = page.locator("img")
  expect((await cover.boundingBox())?.width).toBeLessThan(100)
  const controls = player.locator("[role='group'] > div").first()
  await expect(controls).toHaveCount(1)
  await expect(controls).toHaveCSS("padding", "0px")
  for (const name of ["Seek", "Volume"]) {
    const slider = page.getByRole("slider", { name, exact: true })
    if (name === "Volume" && (page.viewportSize()?.width ?? 0) < 640) {
      await expect(slider).toBeHidden()
      continue
    }
    expect((await slider.boundingBox())?.height).toBeGreaterThan(20)
    await expect(
      slider.locator(".vds-slider-track > .vds-slider-track-fill")
    ).toHaveCount(1)
    expect(
      (await slider.locator(".vds-slider-track").first().boundingBox())?.height
    ).toBeGreaterThan(0)
  }
})

test("audio playback, seeking, mute and volume work with native media", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--playground&viewMode=story"
  )
  const play = page.getByRole("button", { name: PLAY_LABEL })
  await play.click()
  await expect(play).toHaveAttribute("aria-pressed", "true")
  await expect
    .poll(() =>
      page.evaluate(() => {
        const media = document.querySelector("audio")
        return media?.seekable.length ? media.seekable.end(0) : 0
      })
    )
    .toBe(30)
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("audio")?.currentTime)
    )
    .toBeGreaterThan(0)
  await play.click()
  await expect(play).toHaveAttribute("aria-pressed", "false")
  await page
    .getByRole("button", { name: "Seek forward 10 seconds", exact: true })
    .click()
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("audio")?.currentTime)
    )
    .toBeGreaterThan(9)
  const seek = page.getByRole("slider", { name: "Seek", exact: true })
  await seek.focus()
  await page.keyboard.press("ArrowLeft")
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("audio")?.currentTime)
    )
    .toBeLessThan(9)
  const player = page.locator("[data-media-player]")
  await player.focus()
  await expect(player).toHaveCSS("outline-style", "solid")
  await expect(player).not.toHaveCSS("outline-width", "0px")
  await page.keyboard.press("k")
  await expect(play).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("k")
  await expect(play).toHaveAttribute("aria-pressed", "false")
  const mute = page.getByRole("button", { name: MUTE_LABEL })
  await page.keyboard.press("m")
  await expect(mute).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("m")
  await expect(mute).toHaveAttribute("aria-pressed", "false")
  const volume = page.getByRole("slider", { name: "Volume", exact: true })
  if ((page.viewportSize()?.width ?? 0) >= 640) {
    await volume.focus()
    await expect(volume).toHaveAttribute("aria-valuenow", "100")
    await page.keyboard.press("ArrowLeft")
    await expect(volume).toHaveAttribute("aria-valuenow", "95")
  } else {
    await expect(volume).toBeHidden()
  }
})

test("player controls do not submit their enclosing form", async ({ page }) => {
  await page.goto("/iframe.html?id=molecules-player--in-form&viewMode=story")
  const play = page.getByRole("button", { name: PLAY_LABEL })
  await play.click()
  await expect(play).toHaveAttribute("aria-pressed", "true")
  for (const button of await page.locator("[data-media-player] button").all()) {
    await expect(button).toHaveAttribute("type", "button")
    if (await button.isVisible()) {
      await button.click()
    }
  }
  await expect(page.getByRole("status")).toHaveText("Form submissions: 0")
})

test("player uses the app catalog as playback and mute states change", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-player--localized&viewMode=story")
  await expect(page.getByLabel("Prehravac", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Spustit", exact: true }).click()
  const pause = page.getByRole("button", { name: "Pozastavit", exact: true })
  await expect(pause).toHaveAttribute("aria-pressed", "true")
  await pause.click()
  const mute = page.getByRole("button", { name: "Ztlumit", exact: true })
  await mute.click()
  await expect(
    page.getByRole("button", { name: "Zapnout zvuk", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(
    page.getByRole("slider", { name: "Pozice", exact: true })
  ).toBeVisible()
})

test("video controls fit a narrow container", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 650 })
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--fixed-height&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toBeVisible()
  const playerBox = await player.boundingBox()
  const seek = page.getByRole("slider", { name: "Seek", exact: true })
  const seekBox = await seek.boundingBox()
  expect(seekBox?.height).toBeGreaterThan(20)
  expect(seekBox?.x).toBeGreaterThanOrEqual(playerBox?.x ?? 0)
  expect((seekBox?.x ?? 0) + (seekBox?.width ?? 0)).toBeLessThanOrEqual(
    (playerBox?.x ?? 0) + (playerBox?.width ?? 0)
  )
  for (const button of await player.getByRole("button").all()) {
    if (!(await button.isVisible())) {
      continue
    }
    const box = await button.boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(playerBox?.x ?? 0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (playerBox?.x ?? 0) + (playerBox?.width ?? 0)
    )
  }
})

test("video sizing applies to the player and custom controls omit unused buttons", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--fixed-height&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toBeVisible()
  await expect(player.locator(".vds-poster")).toHaveAttribute(
    "aria-hidden",
    "true"
  )
  const playerBox = await player.boundingBox()
  expect(playerBox?.height).toBe(320)
  const controls = player.locator(".player-overlay")
  await expect(controls).toBeVisible()
  expect((await controls.boundingBox())?.height).toBeLessThan(
    (playerBox?.height ?? 0) / 2
  )
  for (const button of await controls.getByRole("button").all()) {
    const buttonBox = await button.boundingBox()
    expect(buttonBox?.x).toBeGreaterThanOrEqual(playerBox?.x ?? 0)
    expect((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0)).toBeLessThanOrEqual(
      (playerBox?.x ?? 0) + (playerBox?.width ?? 0)
    )
  }
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--custom-controls&viewMode=story"
  )
  await expect(
    page.getByRole("button", { name: "Play", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Mute", exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Fullscreen", exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByRole("slider", { name: "Seek", exact: true })
  ).toHaveCount(1)
})

test("video preset controls drive native playback and fullscreen", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  const play = page.getByRole("button", { name: PLAY_LABEL })
  await play.click()
  await expect(play).toHaveAttribute("aria-pressed", "true")
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("video")?.currentTime)
    )
    .toBeGreaterThan(0)
  await play.click()
  const forward = page.getByRole("button", {
    name: "Seek forward 10 seconds",
    exact: true,
  })
  if (await forward.isVisible()) {
    await forward.click()
  } else {
    await page.getByRole("slider", { name: "Seek", exact: true }).focus()
    await page.keyboard.press("ArrowRight")
  }
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("video")?.currentTime)
    )
    .toBeGreaterThan(4)
  const fullscreen = page.getByRole("button", {
    name: "Enter Fullscreen",
    exact: true,
  })
  if (await fullscreen.isVisible()) {
    await fullscreen.click()
    await expect(player).toHaveAttribute("data-fullscreen", "")
    await page
      .getByRole("button", { name: "Exit Fullscreen", exact: true })
      .click()
    await expect(player).not.toHaveAttribute("data-fullscreen", "")
  }
})

test("video plays inline and surface gestures do not double-toggle controls", async ({
  page,
  isMobile,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.playsInline)
    )
    .toBe(true)
  if (isMobile) {
    await player.tap({ position: { x: 30, y: 30 } })
  } else {
    await player.click({ position: { x: 30, y: 30 } })
  }
  await expect(player).toHaveAttribute("data-playing", "")
  await expect(player).not.toHaveAttribute("data-fullscreen", "")
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await expect(player).toHaveAttribute("data-paused", "")
})

test("failed media offers retry and recovers when the source becomes available", async ({
  page,
}) => {
  let requests = 0
  await page.route("**/sprite-fight/480p.mp4", async (route) => {
    requests += 1
    if (requests === 1) {
      await route.fulfill({ status: 404, body: "Missing media" })
    } else {
      await route.fallback()
    }
  })
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
  )
  await expect(page.getByRole("alert")).toContainText(
    "This media could not be loaded."
  )
  await expect(page.locator("[data-media-player]")).toHaveAttribute(
    "aria-busy",
    "false"
  )
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.locator("[data-media-player]")).toHaveAttribute(
    "data-can-play",
    ""
  )
  await expect(page.getByRole("alert")).toHaveCount(0)
  expect(requests).toBeGreaterThan(1)
})

test("pending media shows loading feedback and clears it when ready", async ({
  page,
}) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/sprite-fight/480p.mp4", async (route) => {
    await pending
    await route.fallback()
  })
  try {
    await page.goto(
      "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
    )
    await expect(
      page
        .getByRole("status", { name: "", exact: true })
        .filter({ hasText: "Loading media" })
    ).toBeVisible()
    release()
    await expect(page.locator("[data-media-player]")).toHaveAttribute(
      "data-can-play",
      ""
    )
    await expect(
      page.getByText("Loading media...", { exact: true })
    ).toHaveCount(0)
  } finally {
    release()
  }
})

test("caption tracks can be toggled and remain above the video toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 650 })
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--captioned&viewMode=story"
  )
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  const seek = page.getByRole("slider", { name: "Seek", exact: true })
  await seek.focus()
  await page.keyboard.press("ArrowRight")
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime)
    )
    .toBeGreaterThan(4)
  const caption = page.locator(".player-captions [data-part='cue']")
  await expect(caption).toContainText("English subtitles")
  const toolbar = page.locator(".player-video-controls")
  await expect
    .poll(async () => {
      const cueBox = await caption.boundingBox()
      const toolbarBox = await toolbar.boundingBox()
      return (cueBox?.y ?? 0) + (cueBox?.height ?? 0) - (toolbarBox?.y ?? 0)
    })
    .toBeLessThanOrEqual(0)
  await page
    .getByRole("button", { name: "Disable captions", exact: true })
    .click()
  await expect(caption).toBeHidden()
  await page
    .getByRole("button", { name: "Enable captions", exact: true })
    .click()
  await expect(caption).toBeVisible()
  await expect(caption).toContainText("English subtitles")
})

test("custom preset controls retain media context and forwarded playback props", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--custom-controls&viewMode=story"
  )
  await expect(page.getByText("Loading media...", { exact: true })).toHaveCount(
    0
  )
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => audio.playbackRate)
    )
    .toBe(1.25)
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--custom-content&viewMode=story"
  )
  await page
    .getByRole("button", { name: "Show transcript", exact: true })
    .click()
  await expect(
    page.getByRole("region", { name: "Video transcript" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await expect(page.locator("[data-media-player]")).toHaveAttribute(
    "data-playing",
    ""
  )
})

test("audio errors fit a narrow cover layout and keep retry usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 650 })
  await page.route("**/sprite-fight/audio.mp3", (route) =>
    route.fulfill({ status: 404, body: "Missing audio" })
  )
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--with-title-and-cover&viewMode=story"
  )
  const alert = page.getByRole("alert")
  await expect(alert).toBeVisible()
  const player = await page.locator("[data-media-player]").boundingBox()
  const feedback = await alert.boundingBox()
  expect(feedback?.y).toBeGreaterThanOrEqual(player?.y ?? 0)
  expect((feedback?.y ?? 0) + (feedback?.height ?? 0)).toBeLessThanOrEqual(
    (player?.y ?? 0) + (player?.height ?? 0)
  )
  await expect(
    page.getByRole("button", { name: "Play", exact: true })
  ).toBeHidden()
  await expect(
    page.getByRole("button", { name: "Try again", exact: true })
  ).toBeVisible()
})
