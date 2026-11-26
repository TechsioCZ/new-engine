import { expect, type Page, test } from "@playwright/test"
import { installPlayerMediaFixture } from "./player-media-fixture.mjs"

const PLAY_LABEL = /^(Play|Pause)$/
const MUTE_LABEL = /^(Mute|Unmute)$/
const LOCALIZED_TIME_VALUE = /^\d+ sekund z 30 sekund$/
const FIRST_PREVIEW_IMAGE = /\/player-media\/thumbnail-0\.png$/
const LAST_PREVIEW_IMAGE = /\/player-media\/thumbnail-20\.png$/
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

test("audio cover controls fit a narrow container on a wide viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--with-title-and-cover&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  // Reproduce embedding the preset in a narrow card, independently of viewport.
  await player.evaluate((element) => {
    let card = element
    while (!card.querySelector("img") && card.parentElement) {
      card = card.parentElement
    }
    card.style.width = "320px"
    card.style.maxWidth = "320px"
  })
  const geometry = await player.evaluate((element) => {
    let card = element
    while (!card.querySelector("img") && card.parentElement) {
      card = card.parentElement
    }
    const root = card.getBoundingClientRect()
    const controls = [
      ...card.querySelectorAll<HTMLElement>("button, [role='slider'], img"),
    ]
      .filter((control) => {
        const style = getComputedStyle(control)
        return style.display !== "none" && style.visibility !== "hidden"
      })
      .map((control) => ({
        name: control.getAttribute("aria-label") ?? control.tagName,
        box: control.getBoundingClientRect().toJSON(),
      }))
    return { root: root.toJSON(), controls }
  })
  for (const [index, control] of geometry.controls.entries()) {
    expect(
      control.box.x,
      `${control.name} starts inside the card`
    ).toBeGreaterThanOrEqual(geometry.root.x - 0.5)
    expect(
      control.box.right,
      `${control.name} ends inside the card`
    ).toBeLessThanOrEqual(geometry.root.right + 0.5)
    for (const other of geometry.controls.slice(index + 1)) {
      const overlapWidth =
        Math.min(control.box.right, other.box.right) -
        Math.max(control.box.x, other.box.x)
      const overlapHeight =
        Math.min(control.box.bottom, other.box.bottom) -
        Math.max(control.box.y, other.box.y)
      expect(
        overlapWidth > 0.5 && overlapHeight > 0.5,
        `${control.name} overlaps ${other.name}`
      ).toBe(false)
    }
  }
  await expect(
    player.getByRole("slider", { name: "Volume", exact: true })
  ).toBeHidden()
  expect(
    (
      await player
        .getByRole("slider", { name: "Seek", exact: true })
        .boundingBox()
    )?.width
  ).toBeGreaterThanOrEqual(150)
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
  const timeline = await player
    .getByRole("slider", { name: "Seek", exact: true })
    .boundingBox()
  const media = await player.boundingBox()
  const play = await player
    .getByRole("button", { name: PLAY_LABEL })
    .boundingBox()
  const mute = await player
    .getByRole("button", { name: MUTE_LABEL })
    .boundingBox()
  if (!(timeline && media && play && mute)) {
    throw new Error(
      "The audio timeline and playback controls need visible bounds"
    )
  }
  // Vidstack reserves half a thumb at either end. Those margins belong to the
  // full-width slider span and keep the thumb inside the media bounds.
  const timelineMargins = await player
    .getByRole("slider", { name: "Seek", exact: true })
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        start: Number.parseFloat(style.marginInlineStart),
        end: Number.parseFloat(style.marginInlineEnd),
      }
    })
  expect(
    Math.abs(
      timeline.width + timelineMargins.start + timelineMargins.end - media.width
    ),
    "timeline including its thumb margins spans the full media width"
  ).toBeLessThanOrEqual(2)
  expect(
    Math.abs(timeline.x - timelineMargins.start - media.x)
  ).toBeLessThanOrEqual(2)
  expect(
    timeline.y + timeline.height,
    "timeline sits above the control row"
  ).toBeLessThanOrEqual(Math.min(play.y, mute.y) + 0.5)
  expect(play.height, "Play uses the standard control size").toBeCloseTo(40, 0)
  expect(mute.height, "Mute uses the standard control size").toBeCloseTo(40, 0)
  const current = await player.getByText("0:00", { exact: true }).boundingBox()
  const duration = await player.getByText("0:30", { exact: true }).boundingBox()
  const separator = await player.getByText("/", { exact: true }).boundingBox()
  if (!(current && duration && separator)) {
    throw new Error("Current time and duration need an inline separator")
  }
  expect(
    Math.abs(current.y + current.height / 2 - (play.y + play.height / 2))
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(duration.y + duration.height / 2 - (play.y + play.height / 2))
  ).toBeLessThanOrEqual(1)
  expect(separator.x).toBeGreaterThanOrEqual(current.x + current.width)
  expect(duration.x).toBeGreaterThanOrEqual(separator.x + separator.width)
  expect(
    duration.x - (current.x + current.width),
    "times form one adjacent group"
  ).toBeLessThan(40)
})

test("audio playback, seeking, mute and volume work with native media", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--playground&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  await expect(
    page.getByRole("button", { name: "Seek forward 10 seconds", exact: true })
  ).toHaveCount(0)
  await updateStoryArgs(page, "molecules-audioplayer--playground", {
    controlsList: ["play", "seek", "time", "volume"],
    skipDuration: 15,
  })
  await expect(player).not.toHaveAttribute("controlslist")
  await expect(player).not.toHaveAttribute("skipduration")
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
    .getByRole("button", { name: "Seek forward 15 seconds", exact: true })
    .click()
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("audio")?.currentTime)
    )
    .toBeGreaterThan(14)
  await page
    .getByRole("button", { name: "Seek backward 15 seconds", exact: true })
    .click()
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("audio")?.currentTime)
    )
    .toBeLessThan(1)
  await page
    .getByRole("button", { name: "Seek forward 15 seconds", exact: true })
    .click()
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("audio")?.currentTime)
    )
    .toBeGreaterThan(14)
  const seek = page.getByRole("slider", { name: "Seek", exact: true })
  await seek.focus()
  await page.keyboard.press("ArrowLeft")
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("audio")?.currentTime)
    )
    .toBeLessThan(14)
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

test("podcast seek labels and keyboard settings control the native audio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--podcast&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  await updateStoryArgs(page, "molecules-audioplayer--podcast", {
    style: { width: 320 },
  })
  const card = player.locator("xpath=ancestor-or-self::div[.//img][1]")
  await expect(card).toHaveCSS("width", "320px")
  const currentTime = player.getByText("0:00", { exact: true })
  const durationTime = player.getByText("0:30", { exact: true })
  const separator = player.getByText("/", { exact: true })
  await expect(separator).toBeVisible()
  const currentBox = await currentTime.boundingBox()
  const durationBox = await durationTime.boundingBox()
  const separatorBox = await separator.boundingBox()
  const mediaBox = await player.boundingBox()
  const timeGroup = await currentTime.locator("..").boundingBox()
  if (!(currentBox && durationBox && separatorBox && mediaBox && timeGroup)) {
    throw new Error("Narrow podcast times need visible bounds")
  }
  expect(
    timeGroup.width,
    "narrow podcast times own a full row"
  ).toBeGreaterThanOrEqual(mediaBox.width - 2)
  expect(separatorBox.x).toBeGreaterThanOrEqual(currentBox.x + currentBox.width)
  expect(durationBox.x).toBeGreaterThanOrEqual(
    separatorBox.x + separatorBox.width
  )
  expect(durationBox.x - (currentBox.x + currentBox.width)).toBeLessThan(40)
  const buttons = player.getByRole("button")
  await expect(buttons).toHaveCount(5)
  const buttonBoxes: NonNullable<typeof mediaBox>[] = []
  for (const button of await buttons.all()) {
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    if (!box) {
      throw new Error("Podcast buttons need visible bounds")
    }
    expect(
      Math.max(
        currentBox.y + currentBox.height,
        durationBox.y + durationBox.height
      ),
      "time row sits above transport and auxiliary controls"
    ).toBeLessThanOrEqual(box.y + 0.5)
    expect(box.x).toBeGreaterThanOrEqual(mediaBox.x - 0.5)
    expect(box.x + box.width).toBeLessThanOrEqual(
      mediaBox.x + mediaBox.width + 0.5
    )
    buttonBoxes.push(box)
  }
  for (const [index, box] of buttonBoxes.entries()) {
    for (const other of buttonBoxes.slice(index + 1)) {
      const overlapWidth =
        Math.min(box.x + box.width, other.x + other.width) -
        Math.max(box.x, other.x)
      const overlapHeight =
        Math.min(box.y + box.height, other.y + other.height) -
        Math.max(box.y, other.y)
      expect(
        overlapWidth > 0.5 && overlapHeight > 0.5,
        "podcast controls do not overlap"
      ).toBe(false)
    }
  }
  const forward = player.getByRole("button", {
    name: "Seek forward 10 seconds",
    exact: true,
  })
  const backward = player.getByRole("button", {
    name: "Seek backward 10 seconds",
    exact: true,
  })
  await expect(forward).toHaveText("+10")
  await expect(backward).toHaveText("−10")
  await forward.click()
  await expect
    .poll(() =>
      player
        .locator("audio")
        .evaluate((media: HTMLAudioElement) => media.currentTime)
    )
    .toBeCloseTo(10, 1)
  await backward.click()
  await expect
    .poll(() =>
      player
        .locator("audio")
        .evaluate((media: HTMLAudioElement) => media.currentTime)
    )
    .toBeCloseTo(0, 1)
  const settings = player.getByRole("button", {
    name: "Playback settings",
    exact: true,
  })
  await settings.focus()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("menu")).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(
    page.getByRole("menuitemradio", { name: "Normal", exact: true })
  ).toHaveAttribute("aria-checked", "true")
  await page.keyboard.press("k")
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await expect(settings).toBeFocused()
  await expect(player).toHaveAttribute("data-paused", "")
  expect(
    await player
      .locator("audio")
      .evaluate((media: HTMLAudioElement) => media.currentTime)
  ).toBeCloseTo(0, 1)
  await settings.click()
  await page
    .getByRole("menuitem", { name: "Playback speed", exact: true })
    .click()
  await page.getByRole("menuitemradio", { name: "1.5×", exact: true }).click()
  await expect
    .poll(() =>
      player
        .locator("audio")
        .evaluate((media: HTMLAudioElement) => media.playbackRate)
    )
    .toBe(1.5)
  await settings.click()
  await page
    .getByRole("menuitem", { name: "Playback speed", exact: true })
    .click()
  await expect(
    page.getByRole("menuitemradio", { name: "1.5×", exact: true })
  ).toHaveAttribute("aria-checked", "true")
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

test("audio loading and errors fit a narrow cover layout and keep retry usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  let failRequest: () => void = () => undefined
  const pendingResponse = new Promise<void>((resolve) => {
    failRequest = resolve
  })
  await page.route("**/sprite-fight/audio.mp3", async (route) => {
    await pendingResponse
    await route.fulfill({ status: 404, body: "Missing audio" })
  })
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--with-title-and-cover&viewMode=story"
  )
  const root = page.locator("[data-media-player]")
  const card = root.locator("xpath=ancestor-or-self::div[.//img][1]")
  await card.evaluate((element) => {
    element.style.width = "320px"
    element.style.maxWidth = "320px"
  })
  const cardBox = await card.boundingBox()
  const loading = page
    .getByRole("status")
    .filter({ hasText: "Loading media..." })
  await expect(loading).toBeVisible()
  const loadingBox = await loading.boundingBox()
  expect(loadingBox?.x).toBeGreaterThanOrEqual(cardBox?.x ?? 0)
  expect((loadingBox?.x ?? 0) + (loadingBox?.width ?? 0)).toBeLessThanOrEqual(
    (cardBox?.x ?? 0) + (cardBox?.width ?? 0)
  )
  expect(loadingBox?.y).toBeGreaterThanOrEqual(cardBox?.y ?? 0)
  expect((loadingBox?.y ?? 0) + (loadingBox?.height ?? 0)).toBeLessThanOrEqual(
    (cardBox?.y ?? 0) + (cardBox?.height ?? 0)
  )
  failRequest()
  const alert = page.getByRole("alert")
  await expect(alert).toBeVisible()
  const player = await card.boundingBox()
  const feedback = await alert.boundingBox()
  expect(feedback?.x).toBeGreaterThanOrEqual(player?.x ?? 0)
  expect((feedback?.x ?? 0) + (feedback?.width ?? 0)).toBeLessThanOrEqual(
    (player?.x ?? 0) + (player?.width ?? 0)
  )
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
  expect(
    await card.evaluate((element) => element.scrollWidth <= element.clientWidth)
  ).toBe(true)
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
  await page.setViewportSize({ width: 480, height: 650 })
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

test("custom video controls leave space for default captions after resizing", async ({
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
  const player = page.locator("[data-media-player]")
  await expect(toolbar).toBeVisible()
  const assertCaptionFits = async () => {
    await expect(caption).toBeVisible()
    let previousGeometry: string | undefined
    await expect
      .poll(
        async () => {
          const cueBox = await caption.boundingBox()
          const toolbarBox = await toolbar.boundingBox()
          const playerBox = await player.boundingBox()
          if (!(cueBox && toolbarBox && playerBox)) {
            previousGeometry = undefined
            return {
              stable: false,
              aboveControls: false,
              insidePlayer: false,
            }
          }
          const geometry = JSON.stringify({ cueBox, toolbarBox, playerBox })
          const stable = geometry === previousGeometry
          previousGeometry = geometry
          return {
            stable,
            aboveControls: cueBox.y + cueBox.height <= toolbarBox.y,
            insidePlayer:
              cueBox.y >= playerBox.y &&
              cueBox.x >= playerBox.x &&
              cueBox.x + cueBox.width <= playerBox.x + playerBox.width &&
              cueBox.y + cueBox.height <= playerBox.y + playerBox.height,
          }
        },
        { intervals: [100] }
      )
      .toEqual({ stable: true, aboveControls: true, insidePlayer: true })
  }
  await assertCaptionFits()
  for (const width of [480, 320]) {
    const previousWidth = (await player.boundingBox())?.width
    await page.setViewportSize({ width, height: 650 })
    await expect
      .poll(async () => (await player.boundingBox())?.width)
      .not.toBe(previousWidth)
    await expect(caption).toHaveText(
      "Custom captions should stay above all playback controls."
    )
    await assertCaptionFits()
  }
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
  await expect(seek).toHaveAttribute("aria-valuetext", "0 sekund z 30 sekund")
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

test("playback settings support keyboard navigation and change the native rate", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--settings&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  const settings = page.getByRole("button", {
    name: "Playback settings",
    exact: true,
  })
  await settings.focus()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("menu")).toBeFocused()
  await page.keyboard.press("ArrowRight")
  const normal = page.getByRole("menuitemradio", {
    name: "Normal",
    exact: true,
  })
  await expect(normal).toBeVisible()
  await expect(normal).toHaveAttribute("aria-checked", "true")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("k")
  await page.keyboard.press("Escape")
  await expect(normal).toBeHidden()
  await page.keyboard.press("Escape")
  await expect(settings).toHaveAttribute("aria-expanded", "false")
  await expect(settings).toBeFocused()
  await expect(player).toHaveAttribute("data-paused", "")
  expect(
    await player
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.currentTime)
  ).toBeCloseTo(0, 2)
  await settings.click()
  await page
    .getByRole("menuitem", { name: "Playback speed", exact: true })
    .click()
  const faster = page.getByRole("menuitemradio", {
    name: "1.5×",
    exact: true,
  })
  await faster.click()
  await expect
    .poll(() =>
      player
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.playbackRate)
    )
    .toBe(1.5)
  await settings.click()
  await page
    .getByRole("menuitem", { name: "Playback speed", exact: true })
    .click()
  await expect(faster).toHaveAttribute("aria-checked", "true")
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
  )
  await expect(page.locator("[data-media-player]")).toHaveAttribute(
    "data-can-play",
    ""
  )
  await expect(settings).toHaveCount(0)
  expect(
    await page
      .locator("video")
      .evaluate((video: HTMLVideoElement) => video.playbackRate)
  ).toBe(1)
})

test("subtitle settings select actual cues and keep Off idempotent", async ({
  page,
  isMobile,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--multiple-languages&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await page.getByRole("slider", { name: "Seek", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  const cue = player.locator(".player-captions [data-part='cue']")
  await expect(cue).toBeVisible()
  const englishCue = await cue.innerText()
  expect(englishCue.length).toBeGreaterThan(0)
  const settings = page.getByRole("button", {
    name: "Playback settings",
    exact: true,
  })
  const openSubtitles = async () => {
    await settings.click()
    await page.getByRole("menuitem", { name: "Subtitles", exact: true }).click()
  }
  await openSubtitles()
  await expect(
    page.getByRole("menuitemradio", { name: "English", exact: true })
  ).toHaveAttribute("aria-checked", "true")
  if (isMobile) {
    const viewport = page.viewportSize()
    if (!viewport) {
      throw new Error("Mobile viewport is unavailable")
    }
    for (const item of await page.getByRole("menuitemradio").all()) {
      await expect
        .poll(async () => {
          const box = await item.boundingBox()
          return Boolean(
            box &&
              box.width >= 24 &&
              box.height >= 24 &&
              box.x >= 0 &&
              box.y >= 0 &&
              box.x + box.width <= viewport.width &&
              box.y + box.height <= viewport.height
          )
        })
        .toBe(true)
    }
  }
  const czech = page.getByRole("menuitemradio", {
    name: "Čeština",
    exact: true,
  })
  await czech.click()
  await expect(cue).toBeVisible()
  await expect(cue).not.toHaveText(englishCue)
  const czechCue = await cue.innerText()
  expect(czechCue.length).toBeGreaterThan(0)
  await openSubtitles()
  await expect(czech).toHaveAttribute("aria-checked", "true")
  const off = page.getByRole("menuitemradio", { name: "Off", exact: true })
  await off.click()
  await expect(cue).toBeHidden()
  await openSubtitles()
  await expect(off).toHaveAttribute("aria-checked", "true")
  await off.click()
  await expect(cue).toBeHidden()
  await expect(
    page.getByRole("button", { name: "Enable captions", exact: true })
  ).toHaveAttribute("aria-pressed", "false")
  await openSubtitles()
  await page
    .getByRole("menuitemradio", { name: "English", exact: true })
    .click()
  await expect(cue).toHaveText(englishCue)
})

test("remembered player preferences restore rate, mute, language and captions Off", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--remember-preferences&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await page.getByRole("slider", { name: "Seek", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  const settings = page.getByRole("button", {
    name: "Playback settings",
    exact: true,
  })
  await settings.click()
  await page
    .getByRole("menuitem", { name: "Playback speed", exact: true })
    .click()
  await page.getByRole("menuitemradio", { name: "1.5×", exact: true }).click()
  await page.getByRole("button", { name: "Mute", exact: true }).click()
  await settings.click()
  await page.getByRole("menuitem", { name: "Subtitles", exact: true }).click()
  await page
    .getByRole("menuitemradio", { name: "Čeština", exact: true })
    .click()
  const cue = player.locator(".player-captions [data-part='cue']")
  await expect(cue).toBeVisible()
  const czechCue = await cue.innerText()
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("ui-kit-player-preferences-demo-v1")
      )
    )
    .not.toBeNull()
  const reload = page.getByRole("button", {
    name: "Reload player",
    exact: true,
  })
  await reload.click()
  await expect(player).toHaveAttribute("data-can-play", "")
  await expect
    .poll(() =>
      player.locator("video").evaluate((video: HTMLVideoElement) => ({
        rate: video.playbackRate,
        muted: video.muted,
      }))
    )
    .toEqual({ rate: 1.5, muted: true })
  await expect(cue).toHaveText(czechCue)
  await settings.click()
  await page.getByRole("menuitem", { name: "Subtitles", exact: true }).click()
  await expect(
    page.getByRole("menuitemradio", { name: "Čeština", exact: true })
  ).toHaveAttribute("aria-checked", "true")
  await page.getByRole("menuitemradio", { name: "Off", exact: true }).click()
  await expect(cue).toBeHidden()
  await reload.click()
  await expect(player).toHaveAttribute("data-can-play", "")
  await expect(cue).toBeHidden()
  await settings.click()
  await page.getByRole("menuitem", { name: "Subtitles", exact: true }).click()
  await expect(
    page.getByRole("menuitemradio", { name: "Off", exact: true })
  ).toHaveAttribute("aria-checked", "true")
})

test("playback settings menus remain inside native fullscreen", async ({
  page,
  isMobile,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--settings&viewMode=story"
  )
  // biome-ignore lint/suspicious/noSkippedTests: Native element fullscreen requires the desktop project.
  test.skip(
    isMobile || !(await page.evaluate(() => document.fullscreenEnabled)),
    "Settings overlay containment requires desktop element fullscreen"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  await page
    .getByRole("button", { name: "Enter Fullscreen", exact: true })
    .click()
  await expect(player).toHaveAttribute("data-fullscreen", "")
  await page
    .getByRole("button", { name: "Playback settings", exact: true })
    .click()
  await page
    .getByRole("menuitem", { name: "Playback speed", exact: true })
    .click()
  await expect(
    page.getByRole("menuitemradio", { name: "Normal", exact: true })
  ).toBeVisible()
  for (const menu of await page.getByRole("menu").all()) {
    expect(
      await menu.evaluate((element) =>
        document.fullscreenElement?.contains(element)
      )
    ).toBe(true)
  }
  await page.getByRole("menuitemradio", { name: "1.5×", exact: true }).click()
  await expect
    .poll(() =>
      player
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.playbackRate)
    )
    .toBe(1.5)
})

test("chapter timelines preview real frames and seek through the chapter menu", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--chapters-and-previews&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  const seek = page.getByRole("slider", { name: "Seek", exact: true })
  const chapters = seek.locator(".vds-slider-chapter")
  await expect(chapters).toHaveCount(3)
  for (const chapter of await chapters.all()) {
    expect((await chapter.boundingBox())?.width).toBeGreaterThan(0)
  }
  const seekBox = await seek.boundingBox()
  if (!seekBox) {
    throw new Error("Chapter timeline has no visible bounds")
  }
  await page.mouse.move(
    seekBox.x + seekBox.width * 0.15,
    seekBox.y + seekBox.height / 2
  )
  await page.mouse.down()
  await expect(seek).toHaveAttribute("data-dragging", "")
  const preview = seek.locator(".player-preview")
  const image = preview.locator(".vds-slider-thumbnail img")
  await expect(preview).toHaveAttribute("data-visible", "")
  await expect(image).toHaveAttribute("src", FIRST_PREVIEW_IMAGE)
  await expect(preview).toContainText("Introduction")
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0
      )
    )
    .toBe(true)
  // The SDK's leading-only pointer throttle drops intermediate events in a burst.
  for (const position of [0.35, 0.55, 0.8]) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    )
    await page.mouse.move(
      seekBox.x + seekBox.width * position,
      seekBox.y + seekBox.height / 2
    )
  }
  await expect(image).toHaveAttribute("src", LAST_PREVIEW_IMAGE)
  await expect(preview).toContainText("Summary")
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0
      )
    )
    .toBe(true)
  await page.mouse.up()
  await page
    .getByRole("button", { name: "Playback settings", exact: true })
    .click()
  await page.getByRole("menuitem", { name: "Chapters", exact: true }).click()
  for (const title of ["Introduction", "Details", "Summary"]) {
    await expect(
      page.getByRole("menuitem", { name: title, exact: true })
    ).toBeVisible()
  }
  await page.getByRole("menuitem", { name: "Details", exact: true }).click()
  await expect
    .poll(() =>
      player
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime)
    )
    .toBeCloseTo(10, 2)
  await expect(player).toHaveAttribute("data-paused", "")
})

test("visible loading defers media requests until Show video reveals the player", async ({
  page,
}) => {
  let mediaRequests = 0
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/player-media/sample.mp4") {
      mediaRequests += 1
    }
  })
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--lazy-loading&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  const reveal = page.getByRole("button", { name: "Show video", exact: true })
  await expect(reveal).toBeVisible()
  await expect(player).not.toBeInViewport()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  expect(mediaRequests).toBe(0)
  await expect(player).not.toHaveAttribute("data-can-play", "")
  await reveal.click()
  await expect(player).toBeInViewport()
  await expect(player).toHaveAttribute("data-can-play", "")
  expect(mediaRequests).toBeGreaterThan(0)
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await expect
    .poll(() =>
      player
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime)
    )
    .toBeGreaterThan(0)
})

test("picture-in-picture follows native support and enters and exits when available", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--picture-in-picture&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  const video = player.locator("video")
  const supported = await video.evaluate((element: HTMLVideoElement) => {
    const nativeVideo = element as HTMLVideoElement & {
      webkitSupportsPresentationMode?: (mode: string) => boolean
    }
    return Boolean(
      (document.pictureInPictureEnabled &&
        typeof element.requestPictureInPicture === "function" &&
        !element.disablePictureInPicture) ||
        nativeVideo.webkitSupportsPresentationMode?.("picture-in-picture")
    )
  })
  const enter = page.getByRole("button", {
    name: "Enter picture-in-picture",
    exact: true,
  })
  if (!supported) {
    await expect(enter).toBeHidden()
    return
  }
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await enter.click()
  await expect(player).toHaveAttribute("data-pip", "")
  const exit = page.getByRole("button", {
    name: "Exit picture-in-picture",
    exact: true,
  })
  await expect(exit).toHaveAttribute("aria-pressed", "true")
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => {
        const nativeVideo = element as HTMLVideoElement & {
          webkitPresentationMode?: string
        }
        return (
          document.pictureInPictureElement === element ||
          nativeVideo.webkitPresentationMode === "picture-in-picture"
        )
      })
    )
    .toBe(true)
  await exit.click()
  await expect(player).not.toHaveAttribute("data-pip", "")
  await expect(enter).toHaveAttribute("aria-pressed", "false")
})

test("adaptive HLS exposes actual qualities before starting playback", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--adaptive-hls&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  await expect(player).toHaveAttribute("data-can-play", "")
  await page
    .getByRole("button", { name: "Playback settings", exact: true })
    .click()
  const quality = page.getByRole("menuitem", {
    name: "Video quality",
    exact: true,
  })
  const supportsMSE = await page.evaluate(
    () =>
      typeof MediaSource !== "undefined" &&
      MediaSource.isTypeSupported('video/mp4; codecs="avc1.4d401e"')
  )
  if (!supportsMSE) {
    const nativeHLS = await player
      .locator("video")
      .evaluate(
        (element: HTMLVideoElement) =>
          element.currentSrc.endsWith("/player-media/master.m3u8") &&
          element.canPlayType("application/vnd.apple.mpegurl") !== ""
      )
    expect(
      nativeHLS,
      "An MSE HLS provider must expose its manifest qualities before playback"
    ).toBe(true)
    return
  }
  await quality.click()
  await expect(page.getByRole("menuitemradio")).toHaveCount(3)
  await expect(
    page.getByRole("menuitemradio", { name: "Auto", exact: true })
  ).toHaveAttribute("aria-checked", "true")
  await expect(
    page.getByRole("menuitemradio", { name: "180p", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("menuitemradio", { name: "360p", exact: true })
  ).toBeVisible()
  await expect(player).toHaveAttribute("data-paused", "")
  await expect(player.locator("video")).toHaveJSProperty("currentTime", 0)
})

for (const protocol of ["hls", "dash"]) {
  test(`adaptive ${protocol} plays real segments and switches supported video qualities`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=molecules-videoplayer--adaptive-${protocol}&viewMode=story`
    )
    const player = page.locator("[data-media-player]")
    await expect(player).toHaveAttribute("data-can-play", "")
    const video = player.locator("video")
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.duration)
      )
      .toBeCloseTo(30, 4)
    await page.getByRole("button", { name: "Play", exact: true }).click()
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime)
      )
      .toBeGreaterThan(0)
    const settings = page.getByRole("button", {
      name: "Playback settings",
      exact: true,
    })
    await settings.click()
    const quality = page.getByRole("menuitem", {
      name: "Video quality",
      exact: true,
    })
    if ((await quality.count()) === 0) {
      const nativeHLS = await video.evaluate(
        (element: HTMLVideoElement) =>
          element.currentSrc.endsWith("/player-media/master.m3u8") &&
          element.canPlayType("application/vnd.apple.mpegurl") !== ""
      )
      expect(protocol).toBe("hls")
      expect(
        nativeHLS,
        "Only native HLS may delegate rendition selection to the browser"
      ).toBe(true)
      return
    }
    await quality.click()
    const auto = page.getByRole("menuitemradio", { name: "Auto", exact: true })
    await expect(auto).toHaveAttribute("aria-checked", "true")
    for (const height of [180, 360]) {
      const option = page.getByRole("menuitemradio", {
        name: `${height}p`,
        exact: true,
      })
      await option.click()
      await expect
        .poll(() =>
          video.evaluate((element: HTMLVideoElement) => element.videoHeight)
        )
        .toBe(height)
      await settings.click()
      await quality.click()
      await expect(option).toHaveAttribute("aria-checked", "true")
    }
    await auto.click()
    await settings.click()
    await quality.click()
    await expect(auto).toHaveAttribute("aria-checked", "true")
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")
    await expect(player.getByRole("alert")).toHaveCount(0)
    await expect(player).toHaveAttribute("data-playing", "")
  })
}

type EngineQualitySnapshot = {
  height: number | null
  auto: boolean
}

test("unsupported volume controls stay unfocusable while browser capability initializes", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    const samples: { exposed: boolean }[] = []
    const target = window as Window & {
      __PLAYER_VOLUME_CAPABILITY__?: typeof samples
    }
    target.__PLAYER_VOLUME_CAPABILITY__ = samples
    new MutationObserver(() => {
      for (const slider of document.querySelectorAll(
        '.vds-volume-slider[aria-hidden="true"][tabindex="0"]'
      )) {
        const style = getComputedStyle(slider)
        const box = slider.getBoundingClientRect()
        samples.push({
          exposed:
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            box.width > 0 &&
            box.height > 0,
        })
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "tabindex", "class"],
    })
  })
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--fixed-height&viewMode=story"
  )
  const volume = page.locator("[data-media-volume-slider]")
  await expect(volume).toHaveAttribute("data-supported", "")
  const samples = await page.evaluate(() => {
    const target = window as Window & {
      __PLAYER_VOLUME_CAPABILITY__?: { exposed: boolean }[]
    }
    return target.__PLAYER_VOLUME_CAPABILITY__ ?? []
  })
  expect(
    samples.length,
    "Observed the actual initial unsupported state"
  ).toBeGreaterThan(0)
  expect(samples.some((sample) => sample.exposed)).toBe(false)
  if (isMobile) {
    await expect(volume).toBeHidden()
    return
  }
  await expect(page.locator("[data-media-player]")).toHaveAttribute(
    "data-can-play",
    ""
  )
  await expect(volume).toBeVisible()
  await volume.focus()
  await page.keyboard.press("ArrowLeft")
  await expect(volume).toHaveAttribute("aria-valuenow", "95")
  await expect
    .poll(() =>
      page.locator("video").evaluate((video: HTMLVideoElement) => video.volume)
    )
    .toBeCloseTo(0.95, 2)
})

type EngineQualityWindow = Window & {
  __PLAYER_ENGINE_QUALITY__?: () => EngineQualitySnapshot
}

for (const protocol of ["hls", "dash"]) {
  test(`selecting the current ${protocol} rendition disables engine Auto quality`, async ({
    page,
  }) => {
    await page.addInitScript((engine) => {
      const target = window as EngineQualityWindow
      let selectedHeight: number | null = null
      window.addEventListener(
        "quality-change",
        (event) => {
          const quality = (event as CustomEvent<{ height: number } | null>)
            .detail
          selectedHeight = quality?.height ?? null
        },
        true
      )
      if (engine === "hls") {
        type HLSInstance = {
          autoLevelEnabled: boolean
        }
        window.addEventListener(
          "hls-instance",
          (event) => {
            const instance = (event as CustomEvent<HLSInstance>).detail
            target.__PLAYER_ENGINE_QUALITY__ = () => ({
              height: selectedHeight,
              auto: instance.autoLevelEnabled,
            })
          },
          true
        )
      } else {
        type DASHInstance = {
          getSettings: () => {
            streaming: { abr: { autoSwitchBitrate: { video: boolean } } }
          }
        }
        window.addEventListener(
          "dash-instance",
          (event) => {
            const instance = (event as CustomEvent<DASHInstance>).detail
            target.__PLAYER_ENGINE_QUALITY__ = () => ({
              height: selectedHeight,
              auto: instance.getSettings().streaming.abr.autoSwitchBitrate
                .video,
            })
          },
          true
        )
      }
    }, protocol)
    await page.goto(
      `/iframe.html?id=molecules-videoplayer--adaptive-${protocol}&viewMode=story`
    )
    const player = page.locator("[data-media-player]")
    await expect(player).toHaveAttribute("data-can-play", "")
    const video = player.locator("video")
    const readEngine = () =>
      page.evaluate(
        () =>
          (window as EngineQualityWindow).__PLAYER_ENGINE_QUALITY__?.() ?? null
      )
    await page.getByRole("button", { name: "Play", exact: true }).click()
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime)
      )
      .toBeGreaterThan(0)
    await page.getByRole("button", { name: "Pause", exact: true }).click()
    await expect
      .poll(async () => (await readEngine())?.height ?? 0)
      .toBeGreaterThan(0)
    const current = await readEngine()
    if (!current?.height) {
      throw new Error("The SDK did not report a selected rendition")
    }
    expect(current.auto).toBe(true)
    const settings = page.getByRole("button", {
      name: "Playback settings",
      exact: true,
    })
    const openQuality = async () => {
      await settings.click()
      await page
        .getByRole("menuitem", { name: "Video quality", exact: true })
        .click()
    }
    await openQuality()
    const auto = page.getByRole("menuitemradio", { name: "Auto", exact: true })
    await expect(auto).toHaveAttribute("aria-checked", "true")
    const manual = page.getByRole("menuitemradio", {
      name: `${current.height}p`,
      exact: true,
    })
    await manual.click()
    await expect.poll(async () => (await readEngine())?.auto).toBe(false)
    await openQuality()
    await expect(manual).toHaveAttribute("aria-checked", "true")
    await expect(auto).toHaveAttribute("aria-checked", "false")
    await auto.click()
    await expect.poll(async () => (await readEngine())?.auto).toBe(true)
  })
}

test("retry returns keyboard focus to the reloaded player", async ({
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
  const retry = page.getByRole("button", { name: "Try again", exact: true })
  await retry.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("alert")).toHaveCount(0)
  await expect(page.locator("[data-media-player]")).toBeFocused()
})

test("video controls follow the player width, not the viewport", async ({
  page,
}) => {
  // A compact player inside a wide viewport (sidebar, card, modal) must use
  // its own width; the viewport stays wide for the whole test.
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
  )
  const player = page.locator("[data-media-player]")
  const seek = page.getByRole("button", {
    name: "Seek forward 10 seconds",
    exact: true,
  })
  const volume = page.getByRole("slider", { name: "Volume", exact: true })
  await player.evaluate((element) => {
    element.style.width = "48rem"
  })
  await expect(seek).toBeVisible()
  await player.evaluate((element) => {
    element.style.width = "22.5rem"
  })
  await expect(seek).toBeHidden()
  await expect(volume).toBeHidden()
  await expect(page.getByRole("button", { name: PLAY_LABEL })).toBeVisible()
  await expect(page.getByRole("button", { name: MUTE_LABEL })).toBeVisible()
  await expect(
    page.getByRole("slider", { name: "Seek", exact: true })
  ).toBeVisible()
})

test("icon control tooltips do not repeat the name as a description", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-videoplayer--playground&viewMode=story"
  )
  // Keyboard focus opens the tooltip on every device, unlike hover.
  await page.getByRole("slider", { name: "Seek", exact: true }).focus()
  await page.keyboard.press("Tab")
  const play = page.getByRole("button", { name: "Play", exact: true })
  await expect(play).toBeFocused()
  await expect(page.getByRole("tooltip")).toHaveText("Play")
  await expect(play).toHaveAccessibleDescription("")
})

test("audio slider values keep 3:1 contrast against the card and track", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-audioplayer--podcast&viewMode=story"
  )
  const volume = page.locator(".audio-player-card .vds-volume-slider")
  await expect(volume).toBeAttached()
  const ratios = await page.evaluate(() => {
    const canvas = document.createElement("canvas").getContext("2d", {
      willReadFrequently: true,
    })
    if (!canvas) {
      throw new Error("Canvas is unavailable")
    }
    const rgba = (color: string) => {
      canvas.clearRect(0, 0, 1, 1)
      canvas.fillStyle = color
      canvas.fillRect(0, 0, 1, 1)
      return [...canvas.getImageData(0, 0, 1, 1).data]
    }
    const over = (front: number[], back: number[]) => {
      const alpha = (front[3] ?? 255) / 255
      return [0, 1, 2].map(
        (index) =>
          (front[index] ?? 0) * alpha + (back[index] ?? 0) * (1 - alpha)
      )
    }
    const luminance = (color: number[]) =>
      color
        .map((value) => {
          const channel = value / 255
          return channel <= 0.040_45
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        })
        .reduce(
          (sum, value, index) =>
            sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0),
          0
        )
    const contrast = (first: number[], second: number[]) => {
      const [high, low] = [luminance(first), luminance(second)].sort(
        (a, b) => b - a
      )
      return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
    }
    const card = document.querySelector(".audio-player-card")
    if (!card) {
      throw new Error("Audio card is missing")
    }
    const surface = rgba(getComputedStyle(card).backgroundColor)
    return [".vds-volume-slider", ".vds-time-slider"].map((selector) => {
      const slider = card.querySelector(selector)
      const trackElement = slider?.querySelector(
        ".vds-slider-track:not(.vds-slider-track-fill):not(.vds-slider-progress)"
      )
      const fillElement = slider?.querySelector(".vds-slider-track-fill")
      if (!(trackElement && fillElement)) {
        throw new Error(`${selector} parts are missing`)
      }
      const track = over(
        rgba(getComputedStyle(trackElement).backgroundColor),
        surface
      )
      const fill = over(
        rgba(getComputedStyle(fillElement).backgroundColor),
        track
      )
      return {
        selector,
        fillToCard: contrast(fill, surface),
        fillToTrack: contrast(fill, track),
      }
    })
  })
  for (const ratio of ratios) {
    expect(
      ratio.fillToCard,
      `${ratio.selector} fill / card`
    ).toBeGreaterThanOrEqual(3)
    expect(
      ratio.fillToTrack,
      `${ratio.selector} fill / track`
    ).toBeGreaterThanOrEqual(3)
  }
})
