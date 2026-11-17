import costs from "./visual-shard-costs.json" with { type: "json" }
import { THEMES } from "../src/theme/theme-config.ts"

/** @typedef {"business" | "akros" | "n1"} VisualBrand */
/** @typedef {"light" | "dark"} VisualColorScheme */

/** Resolve the canvas theme exactly like the Storybook brand-lock decorator.
 * Locked stories are captured consistently in every project, not skipped: the
 * completeness gate still requires every story/project identity, including Akros.
 * @param {Record<string, unknown>} globals
 * @param {unknown} [brandLock]
 * @returns {{brand: VisualBrand, mode: VisualColorScheme}}
 */
export function resolveVisualTheme(globals, brandLock) {
  const brand = brandLock ?? globals.brand
  if (typeof brand !== "string" || !Object.hasOwn(THEMES, brand)) {
    throw new Error(`Unsupported declared story brand: ${String(brand)}`)
  }
  if (globals.mode !== "light" && globals.mode !== "dark") {
    throw new Error(`Unsupported declared story mode: ${String(globals.mode)}`)
  }
  const typedBrand = /** @type {VisualBrand} */ (brand)
  const mode =
    globals.mode === "dark" && THEMES[typedBrand].modes.includes("dark")
      ? "dark"
      : "light"
  return { brand: typedBrand, mode }
}

/** Supported brand/mode pairs, shared by accessibility and visual checks. */
export function createThemeMatrix() {
  return Object.entries(THEMES).flatMap(([brand, config]) =>
    config.modes.map((mode) => ({ brand, mode }))
  )
}

/** The two device projects that execute the component behavior specs, in config
 * order. Screenshot projects come from createVisualMatrix below. */
export const DEVICE_PROJECTS = ["desktop", "mobile"]

/** CI separates mobile/desktop behavior from screenshots. Behavior groups use
 * Playwright's native shard; screenshot groups split stories inside each
 * project so Chromium and WebKit costs are spread over every runner.
 * Shard counts per group are decided by the CI plan job. */
export const PLAYWRIGHT_GROUPS = ["mobile", "desktop", "visual"]

/**
 * Assign expensive stories first instead of balancing only test counts. Costs
 * come from full CI captures across all four projects. Unmeasured stories have
 * the median cost. Reserve capacity for cohosted accessibility themes measured in full CI.
 * @template T
 * @param {T[]} stories
 * @param {{index: number, total: number} | undefined} shard
 * @param {{storyCount: number, medianCost: number, a11yCosts?: number[], stories: Record<string, number>}} [weights]
 * @returns {T[]}
 */
export function shardVisualStories(stories, shard, weights = costs) {
  if (!shard) return stories
  const scale = stories.length / weights.storyCount
  const loads = Array.from({length: shard.total}, (_, index) =>
    weights.a11yCosts?.length === shard.total ? weights.a11yCosts[index] * scale : 0
  )
  const assigned = new Map()
  const ordered = stories.map((story, index) => {
    const id = typeof story === "string" ? story
      : typeof story === "object" && story !== null && "id" in story && typeof story.id === "string"
        ? story.id : ""
    return { index, cost: weights.stories[id] ?? weights.medianCost }
  }).sort((a, b) => b.cost - a.cost || a.index - b.index)
  for (const { index, cost } of ordered) {
    const bucket = loads.indexOf(Math.min(...loads))
    assigned.set(index, bucket)
    loads[bucket] += cost
  }
  return stories.filter((_, index) => assigned.get(index) === shard.index - 1)
}

/** Specs the `mobile` project runs. Every other behavior spec asserts DOM,
 * keyboard or engine semantics that do not change with device emulation, or
 * sizes its own viewport, so Desktop Chrome covers it once. The three here
 * cannot be covered there:
 * - cascade-select.behavior.spec.ts reads page.viewportSize() without setting
 *   it, so only the phone viewport can make the open column hierarchy overflow.
 * - drawer.behavior.spec.ts drives the snap-point drawer with touch pointer
 *   events; touch dragging is the drawer's mobile interaction contract.
 * - search-suggestions.spec.ts asserts documentElement.scrollWidth <=
 *   innerWidth for rich results at the project viewport, which only a phone
 *   width can fail.
 * Mobile WebKit still executes every createVisualMatrix mobile screenshot
 * project, so responsive layout, safe-area insets, coarse-pointer touch targets
 * and the engine itself stay in CI. */
export const MOBILE_VIEWPORT_SPECS = [
  "cascade-select.behavior.spec.ts",
  "drawer.behavior.spec.ts",
  "search-suggestions.spec.ts",
]

/**
 * Desktop covers every brand's token/style differences; mobile covers every
 * story's responsive/WebKit layout once, in business. Brand-locked stories
 * still render their own brand on that phone. Accessibility scans all brands.
 * An explicitly selected single brand keeps both devices for local diagnosis.
 * This avoids multiplying the full phone sweep by token-only brand changes.
 * Brand × device × color-scheme projects. Device settings come from
 * Playwright's "Desktop Chrome" and "iPhone 15" descriptors in the config.
 * @param {string} [brandsString]
 */
export function createVisualMatrix(
  brandsString = Object.keys(THEMES).join(",")
) {
  const brands = [
    ...new Set(
      brandsString
        .split(",")
        .map((brand) => brand.trim())
        .filter(Boolean)
    ),
  ]
  if (!brands.length) {
    throw new Error("At least one visual brand is required")
  }
  return brands.flatMap((brand) => {
    if (!Object.hasOwn(THEMES, brand)) {
      throw new Error(
        `Unsupported visual brand: ${brand}. Choose business, akros or n1.`
      )
    }
    const typedBrand = /** @type {VisualBrand} */ (brand)
    return (brands.length === 1 || brand === "business" ? [false, true] : [false]).flatMap((isMobile) =>
      THEMES[typedBrand].modes.map((colorScheme) => ({
        brand: typedBrand,
        name: `${brand}-${isMobile ? "mobile" : "desktop"}-${colorScheme}`,
        colorScheme,
        isMobile,
      }))
    )
  })
}

/** Every Playwright project name, in the order playwright.config.mts declares
 * them. The config asserts its own project names against this list, so this is
 * the single place a project is added or renamed.
 * @param {string} [brandsString]
 * @returns {string[]}
 */
export function createProjectNames(brandsString) {
  return [
    ...DEVICE_PROJECTS,
    ...createVisualMatrix(brandsString).map((project) => project.name),
  ]
}

/** Projects one CI group runs.
 * @param {string | undefined} group
 * @param {string} [brandsString]
 * @returns {string[]}
 */
export function groupProjectNames(group, brandsString) {
  if (group === "visual") {
    return createVisualMatrix(brandsString).map((project) => project.name)
  }
  if (group === "mobile" || group === "desktop") {
    return [group]
  }
  throw new Error(
    `Unsupported PLAYWRIGHT_GROUP ${JSON.stringify(group)}: choose ${PLAYWRIGHT_GROUPS.join(", ")}`
  )
}

/** A project that belongs to no group, or to two, stops running in CI without
 * failing anything. Asserted on every run so a rename cannot hide.
 * @param {string} [brandsString]
 */
export function assertGroupsCoverProjects(brandsString) {
  const grouped = PLAYWRIGHT_GROUPS.flatMap((group) =>
    groupProjectNames(group, brandsString)
  )
  const duplicates = grouped.filter(
    (name, index) => grouped.indexOf(name) !== index
  )
  if (duplicates.length) {
    throw new Error(
      `Projects belong to more than one group: ${[...new Set(duplicates)].join(", ")}`
    )
  }
  const expected = createProjectNames(brandsString)
  const missing = expected.filter((name) => !grouped.includes(name))
  const unknown = grouped.filter((name) => !expected.includes(name))
  if (missing.length || unknown.length) {
    throw new Error(
      `The ${PLAYWRIGHT_GROUPS.join("/")} groups do not cover the project list.${missing.length ? ` Ungrouped: ${missing.join(", ")}.` : ""}${unknown.length ? ` Unknown: ${unknown.join(", ")}.` : ""}`
    )
  }
  return expected
}
