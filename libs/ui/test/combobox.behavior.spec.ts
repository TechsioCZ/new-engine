import { expect, type Locator, test } from "@playwright/test"

const nonEmptyAttribute = /.+/

for (const opening of ["typing", "trigger", "keyboard"] as const) {
  test(`local filtering applies immediately when opened by ${opening}`, async ({
    page,
  }) => {
    await page.goto(
      "/iframe.html?id=molecules-combobox--playground&viewMode=story"
    )
    const input = page.getByRole("combobox", { name: "Select country" })
    if (opening === "trigger") {
      await page.getByRole("button", { name: "Toggle suggestions" }).click()
    } else if (opening === "keyboard") {
      await input.focus()
      await input.press("ArrowDown")
    } else {
      await input.click()
    }

    await input.pressSequentially("s")
    await expect(page.getByRole("option")).toHaveText([
      "Slovakia",
      "Austria",
      "Spain",
      "USA",
    ])
    await expect(input).toHaveAttribute("aria-expanded", "true")

    await input.fill("zz")
    await expect(page.getByRole("option")).toHaveCount(0)
    await expect(page.getByRole("status")).toContainText(
      'No results found for "zz"'
    )
    await input.fill("")
    await expect(page.getByRole("option")).toHaveCount(10)
  })
}

test("reopening after a selection restores all choices", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--playground&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Select country" })
  await input.fill("slov")
  await page.getByRole("option", { name: "Slovakia" }).click()
  await expect(input).toHaveValue("Slovakia")
  await page.getByRole("button", { name: "Toggle suggestions" }).click()
  await expect(page.getByRole("option")).toHaveCount(10)
  await expect(page.getByRole("option", { name: "Slovakia" })).toHaveAttribute(
    "data-state",
    "checked"
  )
})

test("loading does not let keyboard selection reach unrendered options", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-combobox--loading&viewMode=story")

  const input = page.getByRole("combobox", { name: "Loading results" })
  await expect(page.getByRole("status")).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(0)

  await input.focus()
  await input.press("ArrowDown")
  await expect(input).not.toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )

  await input.press("Enter")
  await expect(input).toHaveValue("")
})

test("available options remain keyboard selectable", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--playground&viewMode=story"
  )

  const input = page.getByRole("combobox", { name: "Select country" })
  await input.focus()
  await input.press("ArrowDown")
  await expect(
    page.getByRole("option", { name: "Czech Republic" })
  ).toBeVisible()
  await input.press("ArrowDown")
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )
  await input.press("Enter")
  await expect(input).not.toHaveValue("")
})

test("loading keeps the selected label without exposing hidden options", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--loading-with-selection&viewMode=story"
  )

  const input = page.getByRole("combobox", { name: "Loading with selection" })
  await expect(input).toHaveValue("Czech Republic")
  await expect(page.getByRole("option")).toHaveCount(0)

  await input.focus()
  await input.press("ArrowDown")
  await expect(input).not.toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )
  await input.press("Enter")
  await expect(input).toHaveValue("Czech Republic")
})

test("error does not let keyboard selection reach unrendered options", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--error-retry&viewMode=story"
  )

  const input = page.getByRole("combobox", { name: "Search failed" })
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(0)

  await input.focus()
  await input.press("ArrowDown")
  await expect(input).not.toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )
  await input.press("Enter")
  await expect(input).toHaveValue("")
})

test("retry remains available when results are in an error state", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--error-retry&viewMode=story"
  )

  await page.getByRole("button", { name: "Retry" }).click()
  await expect(page.getByText("Retried 1 time(s)")).toBeVisible()
})

// Resolve modern CSS colors through canvas and composite ancestor surfaces so
// these checks validate rendered light-dark()/OKLCH tokens, not token strings.
async function expectRichItemContrast(option: Locator) {
  // Theme changes can briefly interpolate the popup surface even with reduced
  // motion enabled. Assert the settled colors rather than a transition frame.
  await expect
    .poll(async () => {
      const ratios = await option.evaluate((row) => {
        const canvas = document.createElement("canvas")
        canvas.width = 1
        canvas.height = 1
        const context = canvas.getContext("2d")
        if (!context) {
          throw new Error("Canvas is required for contrast checks")
        }
        const ancestors: Element[] = []
        for (let node: Element | null = row; node; node = node.parentElement) {
          ancestors.unshift(node)
        }
        context.fillStyle = "white"
        context.fillRect(0, 0, 1, 1)
        for (const node of ancestors) {
          context.fillStyle = getComputedStyle(node).backgroundColor
          context.fillRect(0, 0, 1, 1)
        }
        const background = context.getImageData(0, 0, 1, 1)
        const luminance = (rgba: Uint8ClampedArray) => {
          const linear = Array.from(rgba.slice(0, 3), (value) => {
            const channel = value / 255
            return channel <= 0.040_45
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4
          })
          const [red = 0, green = 0, blue = 0] = linear
          return 0.2126 * red + 0.7152 * green + 0.0722 * blue
        }
        const backgroundLuminance = luminance(background.data)
        return Array.from(row.querySelectorAll("span"))
          .filter((node) => node.getClientRects().length > 0)
          .map((node) => {
            context.putImageData(background, 0, 0)
            context.fillStyle = getComputedStyle(node).color
            context.fillRect(0, 0, 1, 1)
            const foregroundLuminance = luminance(
              context.getImageData(0, 0, 1, 1).data
            )
            return (
              (Math.max(backgroundLuminance, foregroundLuminance) + 0.05) /
              (Math.min(backgroundLuminance, foregroundLuminance) + 0.05)
            )
          })
      })
      return ratios.length > 0 ? Math.min(...ratios) : 0
    })
    .toBeGreaterThanOrEqual(4.5)
}

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
] as const) {
  test(`rich item foregrounds remain readable in ${brand} ${mode}`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=molecules-combobox--rich-item&viewMode=story&globals=brand:${brand};mode:${mode}`
    )
    const selected = page.getByRole("option", { name: "Czech Republic" })
    const unselected = page.getByRole("option", { name: "Germany" })
    await expect(selected).toHaveAttribute("data-state", "checked")
    await expectRichItemContrast(selected)
    await expectRichItemContrast(unselected)

    // Check both unselected highlight and selected + highlighted precedence.
    await unselected.hover()
    await expect(unselected).toHaveAttribute("data-highlighted", "")
    await expectRichItemContrast(unselected)
    await selected.hover()
    await expect(selected).toHaveAttribute("data-highlighted", "")
    await expect(selected).toHaveAttribute("data-state", "checked")
    await expectRichItemContrast(selected)

    await unselected.click()
    await expect(unselected).toHaveAttribute("data-state", "checked")
    await expectRichItemContrast(unselected)
  })
}

test("reset authority play preserves queries and submitted parent values", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--reset-authority&viewMode=story"
  )
  await page.waitForFunction(
    () =>
      Reflect.get(window, "__STORYBOOK_PREVIEW__")?.currentRender?.phase ===
      "finished"
  )
  await expect(
    page.getByRole("combobox", { name: "Initial country query" })
  ).toHaveValue("Germany")
  await expect(
    page.getByRole("combobox", { name: "Saved country" })
  ).toHaveValue("Czech Republic")
  await expect(
    page.getByRole("combobox", { name: "Authoritative query" })
  ).toHaveValue("Parent query")
  expect(
    await page
      .getByRole("form", { name: "Reset country authority" })
      .evaluate((form: HTMLFormElement) =>
        Object.fromEntries(new FormData(form))
      )
  ).toEqual({ initial: "de", saved: "cz", query: "cz" })
})

test("external filtering displays only the latest debounced query", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--external-filtering&viewMode=story"
  )
  const input = page.getByRole("combobox", {
    name: "Search country (external)",
  })
  await input.fill("s")
  await input.fill("ger")
  await expect(page.getByRole("option")).toHaveText(["Germany"])
  await expect(page.getByRole("status")).toHaveCount(0)
})
