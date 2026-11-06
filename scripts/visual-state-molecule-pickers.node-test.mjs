import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import {
  checkStateCheckpoints,
  stateCheckpointAppearances,
  stateCheckpointStories,
} from "../libs/ui/test/visual-state-molecule-pickers-checkpoints.mjs"
import {
  assertWithinViewport,
  viewportOverhang,
} from "../libs/ui/test/visual-viewport.mjs"

const sizes = ["size-sm", "size-md", "size-lg"]
const expected = {
  "molecules-combobox--sizes": sizes,
  "molecules-combobox--multiple-selection": ["selected-chips-suggestions"],
  "molecules-datepicker--sizes": sizes,
  "molecules-datepicker--date-range-calendar": ["range-calendars"],
  "molecules-datepicker--localized-unavailable-range": [
    "czech-unavailable-range",
  ],
  "molecules-datepicker--initially-open-timed-draft": ["timed-draft"],
  "molecules-datepicker--initially-open-date-time-range": ["timed-range"],
  "molecules-datepicker--transactional-time-granularities": [
    "hour-12h",
    "minute-24h",
    "second-24h",
  ],
  "molecules-datepicker--locales-and-long-labels": [
    "czech-calendar",
    "english-calendar",
  ],
  "molecules-phoneinput--sizes": sizes,
  "molecules-phoneinput--country-display-variants": ["flag-free-countries"],
  "molecules-phoneinput--limited-countries": ["limited-disabled-country"],
  "molecules-phoneinput--custom-country-list": ["custom-country-rows"],
  "molecules-tour--playground": [
    "welcome-dialog",
    "targeted-spotlight",
    "floating-completion",
  ],
  "molecules-tour--floating-placements": [
    "floating-top-start",
    "floating-top",
    "floating-top-end",
    "floating-right-start",
    "floating-right",
    "floating-right-end",
    "floating-bottom-start",
    "floating-bottom",
    "floating-bottom-end",
    "floating-left-start",
    "floating-left",
    "floating-left-end",
    "floating-center",
  ],
  "molecules-tour--custom-controls": ["custom-actions"],
  "molecules-tour--scroll-target": ["below-fold-spotlight"],
  "molecules-verticalnavigation--within-drawer": ["catalog-navigation"],
  "molecules-overlay-regressions--modal-popover-commands": [
    "modal-popover-commands",
  ],
  "molecules-overlay-regressions--detent-notifications": [
    "notification-half",
    "notification-quarter",
    "notification-full",
  ],
}

const appearancePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const roundingFailure = /1 CSS px rounding/
const bypassedPointerCheck = /\b(?:force|trial):\s*true/
const calendarNavigation =
  /if \(scope === "date-picker"\) \{[^}]*scrollIntoViewIfNeeded\(\)/
const geometryMutation = /scrollIntoView|scrollBy|scrollTo|\.focus\(/
const sharedSelectedDay = /const selected = selectedCalendarDay\(content\)/
const detentKeyboard =
  /getByRole\("button", \{ name: label, exact: true \}\)\s*\.press\("Enter"\)/
const detentClick =
  /getByRole\("button", \{ name: label, exact: true \}\)\s*\.click\(\{ timeout: 5000 \}\)/
const checkpointSource = readFileSync(
  new URL(
    "../libs/ui/test/visual-state-molecule-pickers-checkpoints.mjs",
    import.meta.url
  ),
  "utf8"
)

test("all 20 assigned confirmed stories retain all 45 documented appearances", () => {
  assert.deepEqual(stateCheckpointAppearances, expected)
  assert.equal(stateCheckpointStories.length, 20)
  assert.equal(new Set(stateCheckpointStories).size, 20)
  assert.deepEqual(
    [...stateCheckpointStories].sort(),
    Object.keys(expected).sort()
  )
  assert.equal(Object.values(expected).flat().length, 45)
  for (const appearances of Object.values(stateCheckpointAppearances)) {
    assert.equal(new Set(appearances).size, appearances.length)
    for (const appearance of appearances) {
      assert.match(appearance, appearancePattern)
    }
  }
})

test("each handled story has a checked-in Storybook export", () => {
  const requireUI = createRequire(
    new URL("../libs/ui/package.json", import.meta.url)
  )
  const { toId, storyNameFromExport } = requireUI("storybook/internal/csf")
  const exportsPattern = /^export const (\w+)\b/gm
  const titlePattern = /\bconst meta\b[\s\S]*?\btitle:\s*["']([^"']+)["']/
  const knownStories = new Set()
  for (const file of [
    "combobox",
    "date-picker",
    "phone-input",
    "tour",
    "vertical-navigation",
    "overlay-regressions",
  ]) {
    const source = readFileSync(
      new URL(
        `../libs/ui/stories/molecules/${file}.stories.tsx`,
        import.meta.url
      ),
      "utf8"
    )
    const title = source.match(titlePattern)?.[1]
    assert.ok(title, `${file} has a Storybook title`)
    for (const [, name] of source.matchAll(exportsPattern)) {
      knownStories.add(toId(title, storyNameFromExport(name)))
    }
  }
  for (const id of stateCheckpointStories) {
    assert.ok(knownStories.has(id), id)
  }
})

test("sufficient, disabled, out-of-scope and unknown stories do not touch the page", async () => {
  const page = new Proxy(
    {},
    {
      get() {
        assert.fail("Unhandled stories must not interact with the page")
      },
    }
  )
  const capture = () => assert.fail("Unhandled stories must not capture")
  for (const id of [
    "molecules-combobox--grouped",
    "molecules-combobox--loading",
    "molecules-combobox--loading-with-selection",
    "molecules-combobox--error-retry",
    "molecules-combobox--rich-item",
    "molecules-combobox--playground",
    "molecules-combobox--states",
    "molecules-phoneinput--playground",
    "molecules-phoneinput--disabled",
    "molecules-phoneinput--read-only",
    "molecules-datepicker--playground",
    "molecules-datepicker--disabled",
    "molecules-datepicker--read-only",
    "molecules-tour--long-content",
    "molecules-tour--unmount-during-wait",
    "molecules-overlay-regressions--playground",
    "molecules-menu--sizes",
    "molecules-dialog--sizes",
    "molecules-drawer--snap-points-and-swipe",
    "unknown-story",
    "",
    "__proto__",
    "toString",
  ]) {
    assert.equal(await checkStateCheckpoints(page, id, capture), false, id)
  }
})

/** @param {{ left: number, top: number, right: number, bottom: number }} box
 * @param {{ box: typeof box, overflowX?: string, overflowY?: string }[]} clips
 */
function fakeLocator(box, clips = []) {
  const ownerDocument = {
    documentElement: { clientWidth: 1280, clientHeight: 720 },
    defaultView: {
      getComputedStyle: (element) => ({
        position: "static",
        display: "block",
        overflowX: "visible",
        overflowY: "visible",
        contain: "none",
        willChange: "auto",
        contentVisibility: "visible",
        ...element.style,
      }),
    },
  }
  let parentElement = null
  for (const clip of clips) {
    const width = clip.box.right - clip.box.left
    const height = clip.box.bottom - clip.box.top
    parentElement = {
      parentElement,
      clientLeft: 0,
      clientTop: 0,
      clientWidth: Math.round(width),
      clientHeight: Math.round(height),
      offsetWidth: Math.round(width),
      offsetHeight: Math.round(height),
      getBoundingClientRect: () => ({ ...clip.box, width, height }),
      style: {
        overflowX: clip.overflowX ?? "visible",
        overflowY: clip.overflowY ?? "visible",
      },
    }
  }
  return {
    evaluate(callback) {
      return Promise.resolve(
        callback({
          ownerDocument,
          parentElement,
          getBoundingClientRect: () => box,
        })
      )
    },
  }
}

test("viewport containment allows only the shared 1 CSS px rounding", async () => {
  // Desktop 1280x720 Tour ScrollTarget geometry after Zag's nearest scroll.
  const target = { left: 34.08, top: 674.08, right: 261.95, bottom: 720.08 }
  const spotlight = { left: 24.08, top: 664.08, right: 271.95, bottom: 730.08 }
  await assertWithinViewport(fakeLocator(target))
  await assert.rejects(
    assertWithinViewport(fakeLocator(spotlight)),
    roundingFailure
  )
  await assert.rejects(
    assertWithinViewport(
      fakeLocator({ left: -2, top: 10, right: 100, bottom: 50 })
    ),
    roundingFailure
  )
})

test("picker containment tolerates fractional clips but rejects the clipped August 31 regression", async () => {
  const box = { left: 100, top: 100, right: 135, bottom: 135 }
  // A 35px fixture distinguishes subpixel rounding from the original day
  // with only 15/35 (0.42857) of its width visible inside the scrollport.
  for (const overflowX of ["auto", "scroll", "hidden", "clip"]) {
    const clip = {
      box: { left: 0, top: 0, right: 134.984_375, bottom: 200 },
      overflowX,
    }
    await assertWithinViewport(fakeLocator(box, [clip]))
    assert.equal(
      await fakeLocator(box, [clip]).evaluate(viewportOverhang),
      0.015_625
    )
    assert.equal(
      await fakeLocator(box, [
        clip,
        { box: { ...clip.box, right: 115 }, overflowX },
      ]).evaluate(viewportOverhang),
      20
    )
  }
  await assert.rejects(
    assertWithinViewport(
      fakeLocator(box, [
        {
          box: { left: 0, top: 0, right: 115, bottom: 200 },
          overflowX: "auto",
        },
      ])
    ),
    roundingFailure
  )
  const verticalClip = {
    box: { left: 0, top: 0, right: 200, bottom: 134.984_375 },
    overflowY: "auto",
  }
  await assertWithinViewport(fakeLocator(box, [verticalClip]))
  assert.equal(
    await fakeLocator(box, [
      { ...verticalClip, box: { ...verticalClip.box, bottom: 133.984_375 } },
    ]).evaluate(viewportOverhang),
    1.015_625
  )
})

test("the mobile minute calendar's 18px last-row clip remains a failure", async () => {
  // failure-07: August 31 is 28px tall, with its bottom 18px below the
  // calendar scrollport at y=519; the time and action footers remain visible.
  const selected = fakeLocator(
    { left: 64, top: 509, right: 101, bottom: 537 },
    [
      {
        box: { left: 17, top: 284, right: 295, bottom: 519 },
        overflowY: "auto",
      },
    ]
  )
  assert.equal(await selected.evaluate(viewportOverhang), 18)
  await assert.rejects(assertWithinViewport(selected), roundingFailure)
})

test("calendar selection uses explicit preparation boundaries, never capture readiness", () => {
  const pickers = checkpointSource.slice(
    checkpointSource.indexOf("async function checkPickers("),
    checkpointSource.indexOf("function tourReadiness(")
  )
  const navigation =
    "await selectedCalendarDay(content).scrollIntoViewIfNeeded()"
  assert.equal(pickers.split(navigation).length - 1, 1)
  assert.ok(
    pickers.indexOf(navigation) > pickers.indexOf("await trigger.click()")
  )
  assert.ok(
    pickers.indexOf(navigation) < pickers.indexOf("const ready = async")
  )
  assert.match(pickers, calendarNavigation)
  assert.ok(pickers.includes("await prepare()"))
  assert.ok(pickers.includes("prepare ? { prepare } : undefined"))
  assert.doesNotMatch(
    pickers.slice(pickers.indexOf("const ready = async")),
    geometryMutation
  )
  assert.match(checkpointSource, sharedSelectedDay)
})

test("selected dates and time actions use the shared containment check with visibility", () => {
  for (const target of ["selected", "action"]) {
    assert.ok(
      checkpointSource.includes(`await expect(${target}).toBeVisible()`)
    )
    assert.ok(
      checkpointSource.includes(`await assertWithinViewport(${target})`)
    )
  }
})

test("detent switches require real pointer clicks with hit-target checks", () => {
  const detents = checkpointSource.slice(
    checkpointSource.indexOf("const detents = [")
  )
  assert.match(detents, detentClick)
  assert.doesNotMatch(detents, detentKeyboard)
  assert.doesNotMatch(detents, bypassedPointerCheck)
})
