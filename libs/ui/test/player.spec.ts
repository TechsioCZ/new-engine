import { expect, type Page, test } from "@playwright/test"
import { installPlayerMediaFixture } from "./player-media-fixture"

const PLAY_LABEL = /^(Play|Pause)$/
const MUTE_LABEL = /^(Mute|Unmute)$/
const LOCALIZED_TIME_VALUE = /^\d+ sekund z 30 sekund$/
const pageErrors = new WeakMap<Page, string[]>()

async function updateStoryArgs(
  page: Page,
  storyId: string,
  updatedArgs: Record<string, unknown>
) {
  await page.evaluate(
    ({ id, args }) => {
      const storybookWindow = window as Window & {
        __STORYBOOK_ADDONS_CHANNEL__?: {
          on: (name: string, listener: (value: unknown) => void) => void
          off: (name: string, listener: (value: unknown) => void) => void
          emit: (name: string, value: unknown) => void
        }
      }
      const channel = storybookWindow.__STORYBOOK_ADDONS_CHANNEL__
      if (!channel) {
        throw new Error("Storybook preview channel did not initialize")
      }
      return new Promise<void>((resolve, reject) => {
        const onUpdate = (value: unknown) => {
          if ((value as { storyId: string }).storyId !== id) {
            return
          }
          clearTimeout(timeout)
          channel.off("storyArgsUpdated", onUpdate)
          resolve()
        }
        const timeout = setTimeout(() => {
          channel.off("storyArgsUpdated", onUpdate)
          reject(new Error(`Story ${id} args update timed out`))
        }, 10_000)
        channel.on("storyArgsUpdated", onUpdate)
        channel.emit("updateStoryArgs", { storyId: id, updatedArgs: args })
      })
    },
    { id: storyId, args: updatedArgs }
  )
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on("pageerror", (error) => errors.push(error.message))
  await installPlayerMediaFixture(page)
})

test.afterEach(({ page }) => {
  expect(pageErrors.get(page), "unhandled browser errors").toEqual([])
})

for (const component of ["player", "audioplayer", "videoplayer"]) {
  test(`${component} state examples recover from a media error and play`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=molecules-${component}--states&viewMode=story`
    )
    const ready = page.getByRole("region", { name: "Ready", exact: true })
    const recovery = page.getByRole("region", {
      name: "Recovery demo",
      exact: true,
    })
    await expect(ready).toHaveAttribute("data-can-play", "")
    if (component === "player") {
      const timeline = ready.getByRole("slider", { name: "Seek", exact: true })
      expect((await timeline.boundingBox())?.width).toBeGreaterThan(50)
    }
    await expect(recovery.getByRole("alert")).toBeVisible()
    await expect(recovery).toHaveAttribute("aria-busy", "false")
    await recovery
      .getByRole("button", { name: "Try again", exact: true })
      .click()
    await expect(recovery).toHaveAttribute("data-can-play", "")
    await expect(recovery.getByRole("alert")).toHaveCount(0)
    await recovery.getByRole("button", { name: "Play", exact: true }).click()
    await expect
      .poll(() =>
        recovery
          .locator("audio, video")
          .evaluate((media: HTMLMediaElement) => media.currentTime)
      )
      .toBeGreaterThan(0)
  })
}

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

test("player styles preserve square media outside the player", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-player--playground&viewMode=story")
  await expect(page.locator("[data-media-player]")).toBeVisible()
  await page.evaluate(() => {
    const container = document.createElement("div")
    container.style.width = "200px"
    for (const tag of ["iframe", "video"]) {
      const media = document.createElement(tag)
      media.className = "w-full aspect-square"
      media.setAttribute("data-unrelated-media", tag)
      container.append(media)
    }
    document.body.append(container)
  })
  for (const tag of ["iframe", "video"]) {
    const media = page.locator(`[data-unrelated-media="${tag}"]`)
    await expect(media).toHaveCSS("aspect-ratio", "1 / 1")
    expect((await media.boundingBox())?.width).toBe(200)
    expect((await media.boundingBox())?.height).toBe(200)
  }
})

test("control tooltips remain inside the fullscreen player", async ({
  page,
  isMobile,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
  )
  // biome-ignore lint/suspicious/noSkippedTests: Hover tooltips require a mouse and native element fullscreen.
  test.skip(
    isMobile || !(await page.evaluate(() => document.fullscreenEnabled)),
    "Hover requires desktop element fullscreen"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  await page
    .getByRole("button", { name: "Enter Fullscreen", exact: true })
    .click()
  await expect(player).toHaveAttribute("data-fullscreen", "")
  await page.getByRole("button", { name: "Mute", exact: true }).hover()
  const tooltip = page.getByRole("tooltip")
  await expect(tooltip).toHaveText("Mute")
  await expect(tooltip).toBeVisible()
  await expect
    .poll(() =>
      tooltip.evaluate((element) =>
        document.fullscreenElement?.contains(element)
      )
    )
    .toBe(true)
  await page
    .getByRole("button", { name: "Exit Fullscreen", exact: true })
    .click()
  await expect(player).not.toHaveAttribute("data-fullscreen", "")
})

test("an early default subtitle replacement becomes active before playback", async ({
  page,
}) => {
  const storyId = "molecules-videoplayer--captioned"
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`, {
    waitUntil: "domcontentloaded",
  })
  await expect(
    page.getByRole("button", { name: "Play", exact: true })
  ).toBeVisible()
  await updateStoryArgs(page, storyId, {
    tracks: [
      {
        id: "replacement-czech",
        kind: "subtitles",
        language: "cs",
        label: "Czech",
        default: true,
        content:
          "WEBVTT\n\n00:00.000 --> 00:30.000\nThe replacement default track is active.\n",
      },
    ],
  })
  await expect(
    page.getByRole("button", { name: "Disable captions", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await page.getByRole("slider", { name: "Seek", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.locator(".player-captions [data-part='cue']")).toHaveText(
    "The replacement default track is active."
  )
})

test("updating an inline subtitle track preserves the active captions", async ({
  page,
}) => {
  const storyId = "molecules-videoplayer--captioned"
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await page.getByRole("slider", { name: "Seek", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  const caption = page.locator(".player-captions [data-part='cue']")
  await expect(caption).toContainText("English subtitles")
  const track = {
    id: "sample-english",
    kind: "subtitles",
    language: "en",
    label: "English",
    default: true,
    content:
      "WEBVTT\n\n00:00.000 --> 00:30.000\nUpdated inline subtitle content.\n",
  }
  await updateStoryArgs(page, storyId, { tracks: [track] })
  await expect(caption).toHaveText("Updated inline subtitle content.")
  await expect(
    page.getByRole("button", { name: "Disable captions", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await updateStoryArgs(page, storyId, {
    tracks: [
      {
        ...track,
        language: "cs",
        label: "Czech",
        content:
          "WEBVTT\n\n00:00.000 --> 00:30.000\nReplacement language subtitle content.\n",
      },
    ],
  })
  await expect(caption).toHaveText("Replacement language subtitle content.")
  await expect(
    page.getByRole("button", { name: "Disable captions", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await page
    .getByRole("button", { name: "Disable captions", exact: true })
    .click()
  await expect(caption).toBeHidden()
  await updateStoryArgs(page, storyId, {
    tracks: [
      {
        ...track,
        content:
          "WEBVTT\n\n00:00.000 --> 00:30.000\nCaptions stay off until explicitly enabled.\n",
      },
    ],
  })
  const enableCaptions = page.getByRole("button", {
    name: "Enable captions",
    exact: true,
  })
  await expect(enableCaptions).toHaveAttribute("aria-pressed", "false")
  await expect(caption).toBeHidden()
  await enableCaptions.click()
  await expect(caption).toHaveText(
    "Captions stay off until explicitly enabled."
  )
  await updateStoryArgs(page, storyId, {
    tracks: [
      {
        ...track,
        id: "new-default-active",
        content:
          "WEBVTT\n\n00:00.000 --> 00:30.000\nA new default track keeps captions active.\n",
      },
    ],
  })
  await expect(caption).toHaveText("A new default track keeps captions active.")
  await page
    .getByRole("button", { name: "Disable captions", exact: true })
    .click()
  await expect(caption).toBeHidden()
  await updateStoryArgs(page, storyId, {
    tracks: [
      {
        ...track,
        id: "new-default-disabled",
        content:
          "WEBVTT\n\n00:00.000 --> 00:30.000\nA new default track respects disabled captions.\n",
      },
    ],
  })
  await expect(enableCaptions).toHaveAttribute("aria-pressed", "false")
  await expect(caption).toBeHidden()
  await enableCaptions.click()
  await expect(caption).toHaveText(
    "A new default track respects disabled captions."
  )
})

test("URL subtitle replacements preserve active and disabled caption state", async ({
  page,
}) => {
  const cueTexts = {
    one: "The first URL subtitle track stays active.",
    two: "The replacement URL subtitle track stays active.",
    three: "The third URL subtitle track respects disabled captions.",
  }
  for (const [name, text] of Object.entries(cueTexts)) {
    await page.route(`**/player-track-${name}.vtt`, (route) =>
      route.fulfill({
        contentType: "text/vtt",
        body: `WEBVTT\n\n00:00.000 --> 00:30.000\n${text}\n`,
      })
    )
  }
  const storyId = "molecules-videoplayer--captioned"
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await page.getByRole("slider", { name: "Seek", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  const caption = page.locator(".player-captions [data-part='cue']")
  await expect(caption).toContainText("English subtitles")
  const track = {
    kind: "subtitles",
    language: "en",
    label: "English",
    default: true,
  }
  for (const name of ["one", "two"] as const) {
    await updateStoryArgs(page, storyId, {
      tracks: [
        { ...track, id: `url-${name}`, src: `/player-track-${name}.vtt` },
      ],
    })
    await expect(caption).toHaveText(cueTexts[name])
    await expect(
      page.getByRole("button", { name: "Disable captions", exact: true })
    ).toHaveAttribute("aria-pressed", "true")
  }
  await page
    .getByRole("button", { name: "Disable captions", exact: true })
    .click()
  await expect(caption).toBeHidden()
  await updateStoryArgs(page, storyId, {
    tracks: [{ ...track, id: "url-three", src: "/player-track-three.vtt" }],
  })
  const enableCaptions = page.getByRole("button", {
    name: "Enable captions",
    exact: true,
  })
  await expect(enableCaptions).toHaveAttribute("aria-pressed", "false")
  await expect(caption).toBeHidden()
  await enableCaptions.click()
  await expect(caption).toHaveText(cueTexts.three)
})

test("custom video controls leave space for default captions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 650 })
  const storyId = "molecules-videoplayer--custom-content"
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await expect(
    page.getByRole("button", { name: "Show transcript", exact: true })
  ).toBeVisible()
  await updateStoryArgs(page, storyId, {
    tracks: [
      {
        id: "custom-english",
        kind: "subtitles",
        language: "en",
        label: "English",
        default: true,
        content:
          "WEBVTT\n\n00:00.000 --> 00:30.000\nCustom captions should stay above all playback controls.\n",
      },
    ],
  })
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await page.getByRole("slider", { name: "Seek", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  const caption = page.locator(".player-captions [data-part='cue']")
  await expect(caption).toHaveText(
    "Custom captions should stay above all playback controls."
  )
  const toolbar = page.locator(".player-controls")
  await expect(toolbar).toBeVisible()
  await expect
    .poll(async () => {
      const cueBox = await caption.boundingBox()
      const toolbarBox = await toolbar.boundingBox()
      if (!(cueBox && toolbarBox)) {
        throw new Error("Caption or custom controls has no visible bounds")
      }
      return cueBox.y + cueBox.height - toolbarBox.y
    })
    .toBeLessThanOrEqual(0)
  await expect(caption).toBeVisible()
  await expect
    .poll(async () => {
      const cueBox = await caption.boundingBox()
      const playerBox = await page.locator("[data-media-player]").boundingBox()
      if (!(cueBox && playerBox)) {
        throw new Error("Caption or player has no visible bounds")
      }
      return {
        top: cueBox.y >= playerBox.y,
        left: cueBox.x >= playerBox.x,
        right: cueBox.x + cueBox.width <= playerBox.x + playerBox.width,
        bottom: cueBox.y + cueBox.height <= playerBox.y + playerBox.height,
      }
    })
    .toEqual({ top: true, left: true, right: true, bottom: true })
})

test("localized seeking exposes a translated time value to screen readers", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-player--localized&viewMode=story")
  await expect(page.locator("[data-media-player]")).toHaveAttribute(
    "data-can-play",
    ""
  )
  const seek = page.getByRole("slider", { name: "Pozice", exact: true })
  await seek.focus()
  await page.keyboard.press("ArrowRight")
  await expect(seek).toHaveAttribute("aria-valuetext", "5 sekund z 30 sekund")
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => Math.floor(audio.currentTime))
    )
    .toBe(5)
  await page.keyboard.press("ArrowRight")
  await expect(seek).toHaveAttribute("aria-valuetext", "10 sekund z 30 sekund")
  const seekBox = await seek.boundingBox()
  if (!seekBox) {
    throw new Error("Seek slider has no visible bounds")
  }
  await page.mouse.move(
    seekBox.x + seekBox.width * 0.5,
    seekBox.y + seekBox.height / 2
  )
  await page.mouse.down()
  await expect(seek).toHaveAttribute("data-dragging", "")
  await expect(seek).toHaveAttribute("aria-valuetext", LOCALIZED_TIME_VALUE)
  await page.mouse.move(
    seekBox.x + seekBox.width * 0.7,
    seekBox.y + seekBox.height / 2,
    { steps: 5 }
  )
  await expect(seek).toHaveAttribute("aria-valuetext", LOCALIZED_TIME_VALUE)
  await page.mouse.up()
  await expect
    .poll(async () => {
      const time = await page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => audio.currentTime)
      return time >= 18 && time <= 23
    })
    .toBe(true)
  const currentTime = await page
    .locator("audio")
    .evaluate((audio: HTMLAudioElement) => Math.floor(audio.currentTime))
  const spokenTime = await seek.getAttribute("aria-valuetext")
  expect(spokenTime).toMatch(LOCALIZED_TIME_VALUE)
  expect(
    Math.abs(Number.parseInt(spokenTime ?? "", 10) - currentTime)
  ).toBeLessThanOrEqual(1)
  await expect(page.locator("[data-media-announcer]")).toHaveAttribute(
    "aria-label",
    `Posun vpřed: ${currentTime} sekund z 30 sekund`
  )
})
