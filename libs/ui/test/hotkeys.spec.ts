import { expect, test } from "@playwright/test"

const hotkeysColorClass = /text-hotkeys-key-fg/
const hotkeysSizeClass = /text-hotkeys-sm/

test("Playground shortcut opens the visible action and prevents browser defaults", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--playground&viewMode=story")
  await expect(
    page.getByRole("button", { name: "Open example", exact: true })
  ).toBeVisible()
  await expect(page.getByTestId("hotkeys-playground-registrations")).toHaveText(
    "1"
  )
  await page.evaluate(() => {
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.ctrlKey &&
          event.shiftKey &&
          event.key.toLowerCase() === "a"
        ) {
          queueMicrotask(() => {
            document.documentElement.dataset.hotkeyDefaultPrevented = String(
              event.defaultPrevented
            )
          })
        }
      },
      { capture: true }
    )
  })
  await page.keyboard.press("Control+Shift+a")
  await expect(page.locator("html")).toHaveAttribute(
    "data-hotkey-default-prevented",
    "true"
  )
  await expect(
    page.getByRole("dialog", { name: "Hotkey activated" })
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Open example", exact: true }).click()
  await expect(
    page.getByRole("dialog", { name: "Hotkey activated" })
  ).toBeVisible()
})

test("requireReset survives rerenders while the shortcut is held", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--form-fields-technical&viewMode=story"
  )
  await expect(page.getByTestId("hotkeys-count")).toHaveText("0")
  await page.keyboard.down("Control")
  await page.keyboard.down("s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.keyboard.down("s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.keyboard.up("s")
  await page.keyboard.press("s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("2")
  await page.keyboard.up("Control")
})

test("current callbacks and boolean or function enabled values apply without duplicate registrations", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--lifecycle&viewMode=story")
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("3")
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.getByRole("button", { name: "Increase amount" }).click()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("3")
  await page
    .getByRole("button", { name: "Toggle enabled", exact: true })
    .click()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("3")
  await page.getByRole("button", { name: "Toggle function enabled" }).click()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("3")
  await page
    .getByRole("button", { name: "Toggle enabled", exact: true })
    .click()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("5")
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("3")
})

test("binding and metadata updates plus array removal and reorder stay synchronized with readback", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--lifecycle&viewMode=story")
  await expect(page.getByTestId("hotkeys-registrations")).toHaveText(
    "extra:Extra,save:Save,shared:Shared"
  )
  await page.getByRole("button", { name: "Change binding" }).click()
  await expect(page.getByTestId("hotkeys-registrations")).toHaveText(
    "extra:Extra,save:Save draft,shared:Shared"
  )
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("0")
  await page.keyboard.press("Control+d")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.getByRole("button", { name: "Reorder" }).click()
  await page.keyboard.press("Control+e")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("11")
  await page.getByRole("button", { name: "Toggle extra" }).click()
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("2")
  await page.keyboard.press("Control+e")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("11")
  await page.getByRole("button", { name: "Toggle extra" }).click()
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("3")
  await page.keyboard.press("Control+e")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("21")
})

test("unmount and remount preserve another consumer on a StrictMode-owned store", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--lifecycle&viewMode=story")
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("3")
  await page.getByRole("button", { name: "Toggle consumer" }).click()
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("1")
  await page.keyboard.press("Control+j")
  await expect(page.getByTestId("hotkeys-shared-count")).toHaveText("1")
  await page.getByRole("button", { name: "Toggle consumer" }).click()
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("3")
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.keyboard.press("Control+j")
  await expect(page.getByTestId("hotkeys-shared-count")).toHaveText("2")
})

test("changing native eventType options moves activation from keydown to keyup", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--lifecycle&viewMode=story")
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("3")
  await page.getByRole("button", { name: "Toggle keyup" }).click()
  await page.keyboard.down("Control")
  await page.keyboard.down("s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("0")
  await page.keyboard.up("s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.keyboard.up("Control")
})

test("color class overrides preserve the root font-size token", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--token-class-override&viewMode=story"
  )
  const root = page.locator('[data-scope="hotkeys"][data-part="root"]')
  await expect(root).toHaveClass(hotkeysColorClass)
  await expect(root).toHaveClass(hotkeysSizeClass)
})

test("display-only keycaps do not register actions", async ({ page }) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--display-only&viewMode=story")
  await expect(page.locator("kbd")).toHaveText(["Ctrl K", "Ctrl K"])
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("0")
  await page.keyboard.press("Control+k")
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("0")
})

test("compound shortcut changes the sample formatting with keyboard and pointer", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--compound&viewMode=story")
  const button = page.getByRole("button", { name: "Bold", exact: true })
  await button.click()
  await expect(page.getByTestId("hotkeys-format")).toHaveText("Bold")
  await expect(page.getByTestId("hotkeys-sample")).toHaveCSS(
    "font-weight",
    "700"
  )
  await page.keyboard.press("Control+b")
  await expect(page.getByTestId("hotkeys-format")).toHaveText("Regular")
  await expect(button).toHaveAttribute("aria-pressed", "false")
  await expect(page.locator("kbd")).toHaveText(["Ctrl", "B"])
  await expect(page.locator('[data-part="separator"]')).toHaveAttribute(
    "aria-hidden",
    "true"
  )
})

test("platform previews share a working save shortcut on the native OS", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--platforms&viewMode=story")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByTestId("hotkeys-platform-save-count")).toHaveText("1")
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-platform-save-count")).toHaveText("2")
  await expect(page.locator("kbd")).toHaveText([
    "Ctrl S",
    "⌘ S",
    "Ctrl S",
    "Ctrl S",
  ])
})

test("server Windows snapshot hydrates to native macOS formatting without mismatch", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel" })
    Object.defineProperty(navigator, "userAgentData", { value: undefined })
  })
  await page.goto("/iframe.html?id=atoms-hotkeys--hydration&viewMode=story")
  await expect(page.getByTestId("hotkeys-server-label")).toHaveText("Ctrl K")
  await expect(page.getByTestId("hotkeys-hydrated-label")).toHaveText("⌘ K")
  await expect(page.getByTestId("hotkeys-hydration-errors")).toHaveText("")
})

test("explicit opt-out protects form and inherited plaintext editing", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--form-fields-technical&viewMode=story"
  )
  await page
    .getByRole("checkbox", { name: "Enable shortcut while typing" })
    .uncheck()
  await page.getByRole("textbox", { name: "Text input" }).focus()
  await page.keyboard.press("Control+s")
  await page.getByText("Try rich-text editing too").click()
  await page.getByTestId("inherited-editor").click()
  await page.keyboard.press("Control+s")
  await page.getByLabel("Plain editor").focus()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("0")
})

test("form fields save the note while typing and from the button", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-hotkeys--form-fields&viewMode=story")
  const input = page.getByRole("textbox", { name: "Note" })
  await input.fill("My draft")
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-saved-note")).toHaveText("My draft")
  await expect(input).toHaveValue("My draft")
  await expect(input).toBeFocused()
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByTestId("hotkeys-saved-note")).toHaveText("My draft")
})

test("focused sequence opens Help from the demo area and pointer fallback returns to Overview", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--focused-sequence&viewMode=story"
  )
  const demo = page.getByRole("region", {
    name: "Keyboard shortcut demo",
    exact: true,
  })
  await demo.click()
  await expect(demo).toBeFocused()
  await page.keyboard.press("g")
  await page.keyboard.press("h")
  await expect(page.getByTestId("hotkeys-section")).toHaveText("Help")
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click()
  await expect(page.getByTestId("hotkeys-section")).toHaveText("Overview")
  await page.getByRole("button", { name: "Open help", exact: true }).click()
  await expect(page.getByTestId("hotkeys-section")).toHaveText("Help")
})

test("technical character sequence requires the focused target and native scope", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--focused-sequence-technical&viewMode=story"
  )
  const area = page.getByRole("button", { name: "Run action", exact: true })
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("1")
  await page.keyboard.press("g")
  await page.keyboard.press("h")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("0")
  await area.focus()
  await page.keyboard.press("g")
  await page.keyboard.press("h")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.getByRole("button", { name: "Toggle scope" }).click()
  await area.focus()
  await page.keyboard.press("g")
  await page.keyboard.press("h")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await area.click()
  await expect(page.getByTestId("hotkeys-count")).toHaveText("2")
})

test("native replacement conflict policy retains direct target identity", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--native-conflict-policy&viewMode=story"
  )
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("1")
  await page.getByRole("button", { name: "Conflict target" }).focus()
  await page.keyboard.press("Control+k")
  await expect(page.getByTestId("hotkeys-conflict-result")).toHaveText("second")
})

test("characterizes native 1.43.3 composing modifier events as unsuppressed", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--form-fields-technical&viewMode=story"
  )
  await page
    .getByRole("button", { name: "Save", exact: true })
    .dispatchEvent("keydown", {
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      isComposing: true,
    })
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
})

test("development StrictMode replays owner effects without losing registrations or subscriptions", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-hotkeys--development-strict-mode&viewMode=story"
  )
  const mode = await page
    .getByTestId("hotkeys-strict-mode-host")
    .getAttribute("data-react-mode")
  test.skip(
    mode === "production",
    "StrictMode effect replay is development-only"
  )
  await expect(page.getByTestId("hotkeys-owner-setups")).toHaveText("2")
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("3")
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("hotkeys-count")).toHaveText("1")
  await page.getByRole("button", { name: "Toggle consumer" }).click()
  await expect(page.getByTestId("hotkeys-registry-size")).toHaveText("1")
  await page.keyboard.press("Control+j")
  await expect(page.getByTestId("hotkeys-shared-count")).toHaveText("1")
})
