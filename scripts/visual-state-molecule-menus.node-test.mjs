import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  checkStateCheckpoints,
  stateCheckpointAppearances,
  stateCheckpointStories,
} from "../libs/ui/test/visual-state-molecule-menus-checkpoints.mjs"

const stateSuffixPattern = /^--state-[a-z0-9]+(?:-[a-z0-9]+)*-open$/
const checkpointSource = readFileSync(
  new URL(
    "../libs/ui/test/visual-state-molecule-menus-checkpoints.mjs",
    import.meta.url
  ),
  "utf8"
)

function checkpointFunction(name, next) {
  const start = checkpointSource.indexOf(`async function ${name}(`)
  const end = checkpointSource.indexOf(`async function ${next}(`, start)
  assert.ok(start >= 0 && end > start)
  return checkpointSource.slice(start, end)
}

test("multiple hierarchy checks the leaf summary without dropping either selected branch", () => {
  const source = checkpointFunction(
    "checkMultipleHierarchy",
    "checkCommandDialog"
  )
  for (const snippet of [
    'for (const branch of ["home", "electronics"])',
    'expect(trigger).toHaveText("Computers, Lighting")',
    "await assertHierarchy(",
    'branch === "home" ? "Lighting" : "Computers"',
  ]) {
    assert.ok(source.includes(snippet), snippet)
  }
  assert.ok(!source.includes("Electronics / Computers"))
  assert.ok(!source.includes("Home & garden / Lighting"))
})

test("long-label checkpoints use keyboard top and bottom views at both text sizes", () => {
  const capture = checkpointFunction("captureLongLabels", "checkLongLabels")
  for (const snippet of [
    '["Home", "End"].entries()',
    "await page.keyboard.press(key)",
    "index === 0 ? appearance :",
    "}-bottom`",
    "assertLongLabelsMenu(page, trigger, fontSize, index)",
  ]) {
    assert.ok(capture.includes(snippet), snippet)
  }
  const replay = checkpointFunction("checkLongLabels", "checkSelect")
  for (const snippet of [
    'captureLongLabels(page, capture, "long-labels", baseline)',
    'captureLongLabels(page, capture, "long-labels-200-percent", "200%")',
    "} finally {",
    "await restoreRootFontSize(page, previous)",
  ]) {
    assert.ok(replay.includes(snippet), snippet)
  }
})

test("scroll captures retain full-row visibility and reject clipped or truncated labels", () => {
  const source = checkpointFunction("assertLongLabelsMenu", "captureLongLabels")
  for (const snippet of [
    "expect(row).toBeInViewport({ ratio: 1 })",
    "label.scrollWidth <= label.clientWidth",
    "label.scrollHeight <= label.clientHeight",
    'style.overflowWrap === "anywhere"',
    'style.textOverflow !== "ellipsis"',
    'style.webkitLineClamp === "none"',
    'toHaveCSS("overflow-y", scrollableOverflowPattern)',
    "element.scrollTop <=",
    "Number.parseFloat(getComputedStyle(element).paddingTop)",
    ".toBeGreaterThan(0)",
    'await assertRows(root, "menuitem", longCommands)',
  ]) {
    assert.ok(source.includes(snippet), snippet)
  }
})

test("assigned menu/list/palette evidence covers every implementable audited appearance", () => {
  assert.deepEqual(stateCheckpointAppearances, {
    "molecules-menu--sizes": ["sm", "md", "lg"],
    "molecules-menu--with-options-menu": ["checked-options"],
    "molecules-menu--context-menu": ["keyboard-context"],
    "molecules-menu--rtl-support": ["rtl-submenu"],
    "molecules-menu--tall-scrollable-submenus": [
      "ltr-short-child",
      "ltr-scrolling-child-end",
      "rtl-short-child",
      "rtl-scrolling-child-end",
    ],
    "molecules-menu--long-labels": [
      "long-labels",
      "long-labels-bottom",
      "long-labels-200-percent",
      "long-labels-200-percent-bottom",
    ],
    "molecules-select--sizes": ["sm", "md", "lg"],
    "molecules-select--with-item-groups": ["grouped-options"],
    "molecules-select--multiple": ["multiple-selection"],
    "molecules-cascadeselect--sizes": ["sm", "md", "lg"],
    "molecules-cascadeselect--multiple-selection": [
      "multiple-home",
      "multiple-electronics",
    ],
    "molecules-command--in-dialog": ["command-dialog"],
  })
  assert.deepEqual(
    stateCheckpointStories,
    Object.keys(stateCheckpointAppearances)
  )
  assert.equal(new Set(stateCheckpointStories).size, 12)
  const checkpoints = Object.entries(stateCheckpointAppearances).flatMap(
    ([id, appearances]) =>
      appearances.map((appearance) => {
        const suffix = `--state-${appearance}-open`
        assert.match(suffix, stateSuffixPattern)
        return `${id}${suffix}`
      })
  )
  assert.equal(checkpoints.length, 25)
  assert.equal(new Set(checkpoints).size, checkpoints.length)
})

test("unhandled, already-evidenced and disabled/read-only stories do not touch the page", async () => {
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
    "unrelated--story",
    "toString",
    "constructor",
    "__proto__",
    "molecules-menu--playground",
    "molecules-menu--nested-menu",
    "molecules-menu--with-disabled-items",
    "molecules-select--playground",
    "molecules-select--machine-options",
    "molecules-select--disabled",
    "molecules-select--read-only",
    "molecules-cascadeselect--playground",
    "molecules-cascadeselect--open-hierarchy",
    "molecules-cascadeselect--deep-hierarchy",
    "molecules-cascadeselect--states",
    "molecules-command--playground",
    "molecules-command-with-hotkey--open-palette",
  ]) {
    assert.equal(await checkStateCheckpoints(page, id, capture), false, id)
  }
})
