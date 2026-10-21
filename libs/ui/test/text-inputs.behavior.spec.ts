import { expect, type Page, test } from "@playwright/test"

async function openStory(
  page: Page,
  id: string,
  brand = "base",
  mode = "light"
) {
  await page.goto(
    `/iframe.html?id=${id}&viewMode=story&globals=brand:${brand};mode:${mode}`
  )
  await page
    .locator(
      '#storybook-root input:not([type="hidden"]), #storybook-root textarea'
    )
    .first()
    .waitFor()
  await page.waitForFunction(() => {
    const preview = (
      window as unknown as {
        __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } }
      }
    ).__STORYBOOK_PREVIEW__
    return preview?.currentRender?.phase === "finished"
  })
}

function formValue(page: Page) {
  return page
    .locator('input[type="tel"]')
    .evaluate((input: HTMLInputElement) =>
      input.form ? new FormData(input.form).get("phone") : null
    )
}

test("phone middle replacement and separator deletion retain logical positions", async ({
  page,
}) => {
  for (const story of ["native-form-value", "controlled"]) {
    await openStory(page, `molecules-phoneinput--${story}`)
    const input = page.locator('input[type="tel"]')
    await input.fill("900123456")
    await input.evaluate((node: HTMLInputElement) =>
      node.setSelectionRange(4, 5)
    )
    await input.press("Backspace")
    expect(
      await input.evaluate((node: HTMLInputElement) => node.selectionStart)
    ).toBeLessThan(5)
    await input.press("8")
    await expect(input).toHaveValue("900 823 456")
    if (story === "native-form-value") {
      expect(await formValue(page)).toBe("+421900823456")
    }

    await input.fill("900123456")
    await input.evaluate((node: HTMLInputElement) =>
      node.setSelectionRange(4, 4)
    )
    await input.press("Backspace")
    await expect(input).toHaveValue("901 234 56")
    expect(
      await input.evaluate((node: HTMLInputElement) => node.selectionStart)
    ).toBe(2)

    await input.fill("900123456")
    await input.evaluate((node: HTMLInputElement) =>
      node.setSelectionRange(3, 3)
    )
    await input.press("Delete")
    await expect(input).toHaveValue("900 234 56")
    await input.press("8")
    await expect(input).toHaveValue("900 823 456")
  }
})

test("phone canonical submission, canceled external reset and ref cleanup plays pass", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text())
    }
  })
  for (const story of [
    "controlled",
    "async-controlled-value",
    "paste-international-number",
    "native-form-value",
    "native-draft-submission",
    "external-form-reset",
    "reset-ownership",
    "editing-positions",
    "ref-lifecycle",
  ]) {
    if (story === "ref-lifecycle") {
      await page.goto(
        `/iframe.html?id=molecules-phoneinput--${story}&viewMode=story`
      )
      await expect(
        page.getByRole("button", { name: "Inspect object ref" })
      ).toBeVisible()
      await expect(page.locator('input[type="tel"]')).toHaveCount(0)
    } else {
      await openStory(page, `molecules-phoneinput--${story}`)
    }
  }
  expect(errors).toEqual([])
})

for (const [brand, mode] of [
  ["akros", "light"],
  ["base", "light"],
  ["base", "dark"],
]) {
  test(`${brand}/${mode}: phone validation rings only identify keyboard focus`, async ({
    page,
  }) => {
    await openStory(
      page,
      "molecules-phoneinput--validation-states",
      brand,
      mode
    )
    const inputs = page.locator('input[type="tel"]')
    await page.mouse.move(0, 0)
    for (const input of await inputs.all()) {
      expect(
        await input.evaluate(
          (node) =>
            getComputedStyle(node.parentElement as HTMLElement).outlineStyle
        )
      ).toBe("none")
    }
    await inputs.first().focus()
    await expect
      .poll(() =>
        inputs
          .first()
          .evaluate(
            (node) =>
              getComputedStyle(node.parentElement as HTMLElement).outlineStyle
          )
      )
      .toBe("solid")
    await inputs.first().press("Tab")
    expect(
      await inputs
        .first()
        .evaluate(
          (node) =>
            getComputedStyle(node.parentElement as HTMLElement).outlineStyle
        )
    ).toBe("none")
  })

  test(`${brand}/${mode}: selected and highlighted country metadata inherits its row`, async ({
    page,
  }) => {
    await openStory(page, "molecules-phoneinput--playground", brand, mode)
    await page.getByRole("combobox").click()
    await page.keyboard.press("ArrowDown")
    const rows = page.locator(
      '[role="option"]:is([data-state="checked"], [data-highlighted])'
    )
    expect(await rows.count()).toBeGreaterThan(0)
    for (const row of await rows.all()) {
      const colors = await row.evaluate((node) => [
        getComputedStyle(node).color,
        getComputedStyle(
          node.querySelector(".phone-input-item-meta") as HTMLElement
        ).color,
      ])
      expect(colors[1]).toBe(colors[0])
    }
  })

  test(`${brand}/${mode}: numeric status borders survive hover and focus`, async ({
    page,
  }) => {
    await openStory(
      page,
      "molecules-formnumericinput--validation-states",
      brand,
      mode
    )
    const controls = page.locator('[data-part="control"]')
    const neutral = await controls
      .first()
      .evaluate((node) => getComputedStyle(node).borderColor)
    for (const status of ["error", "success", "warning"]) {
      const control = page.locator(
        `[data-part="control"][data-validation="${status}"]`
      )
      const color = await control.evaluate(
        (node) => getComputedStyle(node).borderColor
      )
      expect(color).not.toBe(neutral)
      for (const action of ["hover", "focus"]) {
        if (action === "hover") {
          await control.hover()
        } else {
          await control.locator("input").focus()
        }
        await expect
          .poll(() =>
            control.evaluate((node) => getComputedStyle(node).borderColor)
          )
          .toBe(color)
        expect(
          await control.evaluate((node) => getComputedStyle(node).borderWidth)
        ).toBe("3px")
      }
      if (status !== "error") {
        await expect(control.locator("input")).not.toHaveAttribute(
          "aria-invalid",
          "true"
        )
      }
    }
  })

  for (const width of [360, 390]) {
    test(`${brand}/${mode}/${width}: auto-sized notes wrap without document overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 })
      for (const story of ["atoms-textarea", "molecules-formtextarea"]) {
        await openStory(page, `${story}--auto-sizing`, brand, mode)
        const input = page.getByRole("textbox", {
          name: "Delivery instructions",
        })
        const before = (await input.boundingBox())?.height ?? 0
        const text = "W".repeat(120)
        await input.fill(text)
        await expect(input).toHaveValue(text)
        expect((await input.boundingBox())?.height).toBeGreaterThan(before)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth)
        ).toBeLessThanOrEqual(width)
        await input.fill("Delivery notes\n".repeat(20))
        expect((await input.boundingBox())?.height).toBeGreaterThan(before)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth)
        ).toBeLessThanOrEqual(width)
      }
    })
  }
}

test("template draft, invalid feedback and boundary plays pass", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text())
    }
  })
  for (const story of ["states", "controlled-draft"]) {
    await openStory(page, `templates-numericinputtemplate--${story}`, "akros")
  }
  await expect(
    page.getByRole("spinbutton", { name: "Quantity draft" })
  ).toHaveValue("3.5")
  expect(errors).toEqual([])
})

test("phone composition stays unformatted until commit", async ({ page }) => {
  await openStory(page, "molecules-phoneinput--native-form-value")
  const input = page.locator('input[type="tel"]')
  await input.focus()
  await input.evaluate((node: HTMLInputElement) => {
    node.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true })
    )
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set
    setter?.call(node, "900123456")
    node.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        isComposing: true,
        data: "900123456",
      })
    )
  })
  await expect(input).toHaveValue("900123456")
  expect(await formValue(page)).toBe("")
  await input.dispatchEvent("compositionend", { data: "900123456" })
  await expect(input).toHaveValue("900 123 456")
  await expect.poll(() => formValue(page)).toBe("+421900123456")
})

test("phone reset retains independent controlled ownership", async ({
  page,
}) => {
  await openStory(page, "molecules-phoneinput--reset-ownership")
  expect(
    await page
      .locator('input[type="tel"]')
      .evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value)
      )
  ).toEqual(["900 123 456", "900 123 456", "777123456", "777 123 456"])
})

test("legacy numeric clearing stays empty and recovers through retyping", async ({
  page,
}) => {
  await openStory(page, "templates-numericinputtemplate--numeric-compatibility")
  const input = page.getByRole("spinbutton", {
    name: "Numeric compatibility quantity",
  })
  await input.fill("")
  await expect(input).toHaveValue("")
  await input.fill("7")
  await input.press("Tab")
  await expect(input).toHaveValue("7")
})
