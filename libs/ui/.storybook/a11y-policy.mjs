/** biome-ignore-all lint/suspicious/noMisplacedAssertion: Runtime validators and awaited node:test helpers intentionally assert outside test callbacks. */
import assert from "node:assert/strict"

export const calibrationLabels = [
  "Low contrast text (should fail APCA)",
  "High contrast text (should pass)",
  "Sub-fluent label (should fail size at gold/silver)",
]

export const calibrationIds = [
  "overview-apca-contrast-test--default",
  "overview-apca-contrast-test--silver",
  "overview-apca-contrast-test--bronze",
]

/** @param {string} brand @param {string} mode */
export function assertSupportedTheme(brand, mode) {
  assert.ok(
    ["base", "neo", "business", "akros"].includes(brand),
    `Unknown brand: ${brand}`
  )
  assert.ok(mode === "light" || mode === "dark", `Unknown mode: ${mode}`)
  assert.ok(
    mode !== "dark" || brand === "base" || brand === "neo",
    `${brand} has no dark mode`
  )
}

/** Exact calibration contracts, never a blanket contrast-rule exclusion.
 * @param {string} id
 * @param {string[]} fixtureLabels
 * @param {{violations: {id: string, nodes: {html: string}[]}[]}} results
 */
export function assertCalibration(id, fixtureLabels, results) {
  assert.deepEqual(
    fixtureLabels.map((label) => label.trim()),
    calibrationLabels,
    "Calibration controls are missing or changed"
  )
  assert.ok(calibrationIds.includes(id), `Unknown calibration: ${id}`)
  const low = "Low contrast text (should fail APCA)"
  const small = "Sub-fluent label (should fail size at gold/silver)"
  const expected = {
    "color-contrast": [low],
    "color-contrast-enhanced": [small],
    "apca-contrast": id.endsWith("--bronze") ? [low] : [low, small],
  }
  assert.ok(
    Array.isArray(results?.violations),
    "Calibration scan results are missing"
  )
  const actual = Object.fromEntries(
    results.violations.map((violation) => [
      violation.id,
      violation.nodes
        .map((node) => {
          if (node.html.includes(low)) {
            return low
          }
          if (node.html.includes(small)) {
            return small
          }
          return node.html
        })
        .sort(),
    ])
  )
  assert.equal(
    Object.keys(actual).length,
    results.violations.length,
    "Duplicate calibration rules"
  )
  assert.deepEqual(
    actual,
    Object.fromEntries(
      Object.entries(expected).map(([rule, nodes]) => [rule, nodes.sort()])
    )
  )
}
