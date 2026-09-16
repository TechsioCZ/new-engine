import { expect, test } from "@playwright/test"

// Thirty seconds of silent PCM: exercise the real media element without a CDN.
const sampleRate = 8000
const audio = Buffer.alloc(44 + sampleRate * 30 * 2)
audio.write("RIFF", 0)
audio.writeUInt32LE(audio.length - 8, 4)
audio.write("WAVEfmt ", 8)
audio.writeUInt32LE(16, 16)
audio.writeUInt16LE(1, 20)
audio.writeUInt16LE(1, 22)
audio.writeUInt32LE(sampleRate, 24)
audio.writeUInt32LE(sampleRate * 2, 28)
audio.writeUInt16LE(2, 32)
audio.writeUInt16LE(16, 34)
audio.write("data", 36)
audio.writeUInt32LE(audio.length - 44, 40)

test.beforeEach(async ({ page }) => {
  await page.route("**/sprite-fight/audio.mp3", (route) =>
    route.fulfill({
      contentType: "audio/wav",
      headers: { "Accept-Ranges": "bytes" },
      body: audio,
    })
  )
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
  const play = page.getByRole("button", { name: "Play", exact: true })
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
  const mute = page.getByRole("button", { name: "Mute", exact: true })
  await page.keyboard.press("m")
  await expect(mute).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("m")
  await expect(mute).toHaveAttribute("aria-pressed", "false")
  const volume = page.getByRole("slider", { name: "Volume", exact: true })
  await volume.focus()
  await expect(volume).toHaveAttribute("aria-valuenow", "100")
  await page.keyboard.press("ArrowLeft")
  await expect(volume).toHaveAttribute("aria-valuenow", "95")
})

test("player controls do not submit their enclosing form", async ({ page }) => {
  await page.goto("/iframe.html?id=molecules-player--in-form&viewMode=story")
  const play = page.getByRole("button", { name: "Play", exact: true })
  await play.click()
  await expect(play).toHaveAttribute("aria-pressed", "true")
  for (const button of await page.locator("[data-media-player] button").all()) {
    await expect(button).toHaveAttribute("type", "button")
    if (await button.isVisible()) await button.click()
  }
  await expect(page.getByRole("status")).toHaveText("Form submissions: 0")
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
  expect((await controls.boundingBox())?.height).toBeLessThan(80)
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
