import { expect, type Locator, type Page, test } from "@playwright/test"

const dragHandleLabel = /^Drag to reorder /

async function openStory(page: Page, story: string) {
  await page.goto(
    `/iframe.html?id=organisms-datatable--${story}&viewMode=story`,
    { waitUntil: "domcontentloaded" }
  )
  await expect(page.getByLabel(dragHandleLabel).first()).toBeVisible()
}

// Real pointer drag: the table's PointerSensor activates after 5px of movement,
// and drops resolve through the pointer branch of its collision detector.
async function drag(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!(from && to)) {
    throw new Error("Drag source or target is not visible")
  }
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 8, start.y + 8, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 20,
  })
  await page.mouse.up()
}

type StoryPreview = {
  currentRender: {
    story: { initialArgs: Record<string, { mock?: { calls: unknown[][] } }> }
  }
}

// Storybook keeps the story's fn() spies on the rendered story's args.
function callbackCalls(page: Page, name: string) {
  return page.evaluate((arg) => {
    const preview = (
      window as unknown as { __STORYBOOK_PREVIEW__: StoryPreview }
    ).__STORYBOOK_PREVIEW__
    const calls =
      preview.currentRender.story.initialArgs[arg]?.mock?.calls ?? []
    return calls.map(([details]) => details)
  }, name)
}

// biome-ignore lint/correctness/noEmptyPattern: Playwright requires fixture destructuring even when only testInfo is used.
test.beforeEach(({}, testInfo) => {
  // biome-ignore lint/suspicious/noSkippedTests: Pointer-only drag checks run in the desktop project; touch has separate coverage.
  test.skip(
    testInfo.project.name !== "desktop",
    "Mouse drags need a mouse pointer; the mobile project emulates touch"
  )
})

function headers(page: Page) {
  return page
    .locator("#storybook-root thead th")
    .evaluateAll((cells) =>
      cells.map((cell) => cell.textContent?.trim()).filter(Boolean)
    )
}

test("mouse drag reorders columns through the drag handle", async ({
  page,
}) => {
  await openStory(page, "column-reorder")
  await drag(
    page,
    page.getByLabel("Drag to reorder First name"),
    page.getByLabel("Drag to reorder Last name")
  )

  await expect
    .poll(() => headers(page))
    .toEqual([
      "Last name",
      "First name",
      "Email",
      "Role",
      "Status",
      "Age",
      "Visits",
    ])
  await expect
    .poll(() => callbackCalls(page, "onColumnReorder"))
    .toEqual([
      {
        from: 0,
        to: 1,
        columnId: "firstName",
        order: [
          "lastName",
          "firstName",
          "email",
          "role",
          "status",
          "age",
          "visits",
        ],
      },
    ])
})

test("mouse drag reorders rows through the drag handle", async ({ page }) => {
  await openStory(page, "row-reorder")
  const firstCells = page.locator("#storybook-root tbody tr td:nth-child(2)")
  await expect(firstCells.nth(0)).toHaveText("Ada")

  await drag(
    page,
    // Handles and callbacks use the record's stable id, not its row index.
    page.getByLabel("Drag to reorder row 1", { exact: true }),
    page.getByLabel("Drag to reorder row 2", { exact: true })
  )

  await expect(firstCells.nth(0)).toHaveText("Alan")
  await expect(firstCells.nth(1)).toHaveText("Ada")
  await expect
    .poll(() => callbackCalls(page, "onRowReorder"))
    .toEqual([expect.objectContaining({ from: 0, to: 1, rowId: "1" })])
})
