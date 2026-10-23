/** biome-ignore-all lint/suspicious/noMisplacedAssertion: Runtime validators and awaited node:test helpers intentionally assert outside test callbacks. */
import assert from "node:assert/strict"

/** @param {string[]} args @param {NodeJS.ProcessEnv} env */
export function assertReleaseSelection(args, env) {
  assert.equal(
    args.length,
    0,
    "Release readiness does not accept filters or snapshot updates"
  )
  assert.ok(!env.TEST_STORIES, "Release readiness requires all stories")
  assert.ok(
    !env.VISUAL_BRANDS,
    "Release readiness uses the complete registry, not VISUAL_BRANDS"
  )
  for (const name of [
    "TEST_BASE_URL",
    "VISUAL_STORYBOOK_STATIC_DIR",
    "VISUAL_ASSET_HAR_PATH",
  ]) {
    assert.ok(!env[name], `Release readiness cannot use external input ${name}`)
  }
  assert.notEqual(
    env.PLAYWRIGHT_STORYBOOK_REBUILD,
    "0",
    "Release readiness must build the checked-out commit"
  )
}

/** Parse PLAYWRIGHT_RELEASE_SHARD ("index/total"). Shards only split the
 * release run; completeness is asserted over the merged shard reports.
 * @param {string | undefined} value
 * @returns {{index: number, total: number} | undefined}
 */
export function parseReleaseShard(value) {
  if (!value) {
    return
  }
  const match = /^(\d+)\/(\d+)$/.exec(value)
  assert.ok(match, `Invalid release shard "${value}"; use index/total`)
  const index = Number(match[1])
  const total = Number(match[2])
  assert.ok(
    total >= 1 && total <= 32 && index >= 1 && index <= total,
    `Release shard out of range: ${value}`
  )
  return { index, total }
}

/** Stories that own screenshot baselines. Live documents whose content changes
 * with every release, such as the changelog, opt out with the "visual-skip" tag
 * and cover their renderer with a fixed fixture story instead.
 * @template {{type: string, tags?: string[]}} Entry
 * @param {Record<string, Entry>} entries
 * @returns {Entry[]}
 */
export function visualStories(entries) {
  return Object.values(entries).filter(
    (entry) => entry.type === "story" && !entry.tags?.includes("visual-skip")
  )
}

/** Fail before expensive browser work; never create baselines in the release gate.
 * @param {{id: string}[]} stories
 * @param {{name: string, brand: string, isMobile: boolean, colorScheme: string}[]} projects
 * @param {Set<string>} files Basenames from the reviewed Linux snapshot directory.
 */
export function assertPrimaryBaselines(stories, projects, files) {
  const missing = []
  for (const project of projects) {
    const device = project.isMobile ? "mobile" : "desktop"
    const suffix =
      project.brand === "base"
        ? `${device}${project.colorScheme === "dark" ? "-dark" : ""}`
        : project.name
    for (const { id } of stories) {
      const expected = `${id}-${suffix}-linux.png`
      if (!files.has(expected)) {
        missing.push(expected)
      }
    }
  }
  assert.equal(
    missing.length,
    0,
    `Missing ${missing.length} reviewed primary visual baselines. Examples: ${missing.slice(0, 8).join(", ")}. Generate and independently review them outside the release gate.`
  )
}

/** Validate identities, not an aggregate count that duplicates can satisfy.
 * @param {any[]} reports
 * @param {{id: string}[]} stories
 * @param {string[]} projects
 */
export function assertVisualCompletion(reports, stories, projects) {
  const required = new Set(
    projects.flatMap((project) =>
      stories.map((story) => `${project}\0${story.id}`)
    )
  )
  const seen = new Set()
  let ran = 0
  const visit = (suites) => {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          ran += 1
          if (
            spec.file?.replaceAll("\\", "/").split("/").at(-1) !==
            "visual.spec.ts"
          ) {
            continue
          }
          const id = test.annotations?.find(
            (item) => item.type === "visual-story-id"
          )?.description
          const key = `${test.projectName}\0${id}`
          assert.ok(required.has(key), `Unexpected screenshot identity: ${key}`)
          assert.ok(!seen.has(key), `Duplicate screenshot identity: ${key}`)
          assert.equal(
            test.status,
            "expected",
            `Screenshot did not pass: ${key}`
          )
          assert.ok(
            test.results?.length > 0 &&
              test.results.every((result) => result.status === "passed"),
            `Screenshot missing successful execution: ${key}`
          )
          seen.add(key)
        }
      }
      visit(suite.suites ?? [])
    }
  }
  for (const report of reports) {
    assert.equal(report.errors?.length ?? 0, 0, "Runner errors")
    assert.equal(report.stats?.unexpected ?? 0, 0, "Unexpected test failures")
    assert.equal(report.stats?.flaky ?? 0, 0, "Flaky tests")
    visit(report.suites ?? [])
  }
  assert.ok(ran > 0, "No tests ran")
  assert.equal(
    seen.size,
    required.size,
    `Missing screenshot identities: ${[...required].filter((key) => !seen.has(key)).join(", ")}`
  )
}
