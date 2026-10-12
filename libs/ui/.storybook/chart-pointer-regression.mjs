// @ts-check
/** biome-ignore-all lint/suspicious/noMisplacedAssertion: Storybook's generated Jest test invokes these assertions through postVisit. */
import assert from "node:assert/strict"

/** @import { Page, Locator } from "@playwright/test" */
/**
 * @typedef {{ id: string, label: string, value: number, payload: { source: string } }} SourceRow
 * @typedef {{ selected: SourceRow | null, calls: number, isSourceRow: boolean }} SelectionState
 */

/**
 * Read exposed points within the source mark, including a narrow padded slice.
 * A generated focus circle can share the mark's key and receive its input.
 * @param {HTMLElement | SVGElement} element
 * @param {{ x: number, y: number } | null} requestedPosition
 */
function exposedMarkPoints(element, requestedPosition) {
  if (!(element instanceof SVGGeometryElement)) {
    throw new Error("Pointer fixture mark is not SVG geometry")
  }
  const bounds = element.getBBox()
  const matrix = element.getScreenCTM()
  const key = element.getAttribute("data-ts-key")
  const svg = element.closest("svg")
  if (!(matrix && key && svg && bounds.width > 0 && bounds.height > 0)) {
    throw new Error("Pointer fixture mark has no visible keyed geometry")
  }
  const inverse = matrix.inverse()
  /** @param {{ x: number, y: number }} position */
  const isExposed = (position) => {
    const local = new DOMPoint(position.x, position.y).matrixTransform(inverse)
    const target = element.ownerDocument.elementFromPoint(
      position.x,
      position.y
    )
    const targetKey = target?.getAttribute("data-ts-key")
    // Line dots append :dot to their ChartPoint key; the focus circle does not.
    const isPointOverlay =
      element instanceof SVGCircleElement &&
      target instanceof SVGCircleElement &&
      key.endsWith(":dot") &&
      targetKey === key.slice(0, -4)
    return (
      element.isPointInFill(local) &&
      target instanceof SVGGeometryElement &&
      target.closest("svg") === svg &&
      (targetKey === key || isPointOverlay)
    )
  }
  if (requestedPosition) {
    return {
      key,
      positions: isExposed(requestedPosition) ? [requestedPosition] : [],
    }
  }
  // Sample the center first, then points near both edges of concave arcs.
  const fractions = [
    0.5, 0.75, 0.25, 0.875, 0.125, 0.9375, 0.0625, 0.625, 0.375,
  ]
  /** @type {{ x: number, y: number }[]} */
  const positions = []
  for (const xFraction of fractions) {
    for (const yFraction of fractions) {
      const screen = new DOMPoint(
        bounds.x + bounds.width * xFraction,
        bounds.y + bounds.height * yFraction
      ).matrixTransform(matrix)
      const position = { x: screen.x, y: screen.y }
      if (isExposed(position)) {
        positions.push(position)
      }
    }
  }
  return { key, positions }
}

/**
 * DOM reads supply coordinates only; page.mouse performs every interaction.
 * Recheck after hover because a sticky tooltip or focus mark can move.
 * @param {Page} page
 * @param {Locator} mark
 */
async function hoverMark(page, mark) {
  await mark.scrollIntoViewIfNeeded()
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const probe = await mark.evaluate(exposedMarkPoints, null)
    for (const position of probe.positions) {
      const beforeHover = await mark.evaluate(exposedMarkPoints, position)
      if (!beforeHover.positions.length) {
        continue
      }
      await page.mouse.move(position.x, position.y)
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          })
      )
      const afterHover = await mark.evaluate(exposedMarkPoints, position)
      assert.equal(
        afterHover.key,
        probe.key,
        "Hover must retain the source mark"
      )
      if (afterHover.positions.length) {
        return position
      }
    }
  }
  throw new Error(
    "Pointer fixture mark has no exposed interior after native hover"
  )
}

/**
 * @param {Page} page
 * @param {"pie" | "donut" | "line"} type
 * @param {number} calls
 * @param {SourceRow | null} selected
 */
async function assertSelection(page, type, calls, selected) {
  const testId = `pointer-${type}-selection`
  await page.waitForFunction(
    ({ outputId, expectedCalls }) => {
      const output = document.querySelector(`[data-testid="${outputId}"]`)
      return (
        output &&
        JSON.parse(output.textContent ?? "null")?.calls === expectedCalls
      )
    },
    { outputId: testId, expectedCalls: calls },
    { timeout: 5000 }
  )
  const text = await page.getByTestId(testId).textContent()
  assert.ok(text, `${type} must expose its selected source row`)
  const state = /** @type {SelectionState} */ (JSON.parse(text))
  assert.deepEqual(
    state,
    { selected, calls, isSourceRow: true },
    `${type} must report the exact original source row and update its selection output`
  )
}

/** @param {Page} page @param {Locator} mark */
async function clickMark(page, mark) {
  const position = await hoverMark(page, mark)
  await page.mouse.click(position.x, position.y)
}

/** @param {Page} page @param {Locator} chart */
async function clickBackground(page, chart) {
  await chart.scrollIntoViewIfNeeded()
  const bounds = await chart.boundingBox()
  assert.ok(bounds, "Pointer fixture chart must be visible")
  await page.mouse.move(bounds.x + 1, bounds.y + 1)
  await page.mouse.click(bounds.x + 1, bounds.y + 1)
}

/**
 * Native pointer coverage runs only for molecules-chart--pointer-selection.
 * @param {Page} page
 */
export async function checkChartPointerSelection(page) {
  const tiny = {
    id: "tiny",
    label: "Tiny 0.5%",
    value: 0.5,
    payload: { source: "tiny-source" },
  }
  const medium = {
    id: "medium",
    label: "Medium",
    value: 49.5,
    payload: { source: "medium-source" },
  }
  const large = {
    id: "large",
    label: "Large",
    value: 50,
    payload: { source: "large-source" },
  }
  const february = {
    id: "february",
    label: "Feb",
    value: 34,
    payload: { source: "february-source" },
  }
  const pie = page.getByTestId("pointer-pie").getByRole("img")
  const pieSlices = pie.locator('path[data-ts-key*="arc-"]')
  assert.equal(
    await pieSlices.count(),
    3,
    "Pie fixture must render all source rows"
  )
  await clickMark(page, pieSlices.nth(1))
  await assertSelection(page, "pie", 1, medium)
  await clickMark(page, pieSlices.nth(0))
  await assertSelection(page, "pie", 2, tiny)
  await clickBackground(page, pie)
  await assertSelection(page, "pie", 3, null)

  const donut = page.getByTestId("pointer-donut").getByRole("img")
  const donutSlices = donut.locator('path[data-ts-key*="arc-"]')
  assert.equal(
    await donutSlices.count(),
    3,
    "Donut fixture must render all source rows"
  )
  await clickMark(page, donutSlices.nth(2))
  await assertSelection(page, "donut", 1, large)
  await clickMark(page, donutSlices.nth(0))
  await assertSelection(page, "donut", 2, tiny)
  const hole = await donutSlices.nth(0).evaluate((element) => {
    if (!(element instanceof SVGGeometryElement)) {
      throw new Error("Donut fixture mark is not SVG geometry")
    }
    const matrix = element.getScreenCTM()
    if (!matrix) {
      throw new Error("Donut fixture must expose its polar center")
    }
    const center = new DOMPoint(0, 0).matrixTransform(matrix)
    return { x: center.x, y: center.y }
  })
  await page.mouse.move(hole.x, hole.y)
  await page.mouse.click(hole.x, hole.y)
  await assertSelection(page, "donut", 3, null)
  await clickMark(page, donutSlices.nth(2))
  await assertSelection(page, "donut", 4, large)
  await clickBackground(page, donut)
  await assertSelection(page, "donut", 5, null)

  const line = page.getByTestId("pointer-line").getByRole("img")
  const points = line.locator("circle")
  assert.equal(
    await points.count(),
    3,
    "Line fixture must render all source rows"
  )
  await hoverMark(page, points.nth(1))
  const tooltip = page
    .getByTestId("pointer-line")
    .locator('.ts-chart-tooltip[role="status"]')
  await tooltip.waitFor({ state: "visible" })
  const tooltipText = await tooltip.textContent()
  assert.ok(
    tooltipText?.includes("Feb"),
    "Cartesian hover must show the source label"
  )
  assert.ok(
    tooltipText?.includes("34"),
    "Cartesian hover must show the source value"
  )
  await clickMark(page, points.nth(1))
  await assertSelection(page, "line", 1, february)
  await clickBackground(page, line)
  await assertSelection(page, "line", 2, null)
  await tooltip.waitFor({ state: "hidden" })
}
