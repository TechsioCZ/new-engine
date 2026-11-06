import assert from "node:assert/strict"
import { test } from "node:test"
import {
  checkStateCheckpoints,
  stateCheckpointStories,
  stateCheckpointSuffixes,
} from "../test/visual-state-organisms-checkpoints.mjs"

const expectedCounts = {
  "organisms-header--narrow-container": 1,
  "organisms-header--sizes": 3,
  "organisms-sidebar--playground": 1,
  "organisms-sidebar--controlled-offcanvas": 2,
  "organisms-sidebar--two-pane-sidebar-09": 1,
  "organisms-sidebar--right-sidebar-14": 1,
  "organisms-sidebar--left-and-right-sidebar-15": 2,
  "organisms-sidebar--logical-edges-rtl": 2,
  "organisms-sidebar--sticky-site-header-sidebar-16": 1,
  "organisms-datatable--column-filters-with-conditions": 3,
  "organisms-datatable--narrow-column-filters": 1,
  "organisms-datatable--typed-column-filters": 3,
  "organisms-datatable--custom-filter-template": 1,
  "organisms-datatable--pagination": 1,
  "organisms-datatable--inline-edit-by-column-type": 2,
  "organisms-datatable--large-field-alignment": 2,
  "organisms-datatable--editor-validation": 2,
  "organisms-datatable--loading-more": 1,
  "organisms-datatable--overlay-isolation": 1,
  "organisms-datatable--async-save-recovery": 2,
  "organisms-datatable--required-date-range": 2,
  "organisms-datatable--edit-mode-locks-interactions": 2,
  "organisms-table--with-selection-and-actions": 2,
  "organisms-gallery--media-lifecycle-and-refs": 3,
}

test("all recoverable confirmed organisms gaps have a unique story registration", () => {
  assert.deepEqual(
    [...stateCheckpointStories].sort(),
    Object.keys(expectedCounts).sort()
  )
  assert.equal(
    new Set(stateCheckpointStories).size,
    stateCheckpointStories.length
  )
})

const checkpointSuffixPattern = /^--state-[a-z0-9]+(?:-[a-z0-9]+)*-open$/

test("each documented appearance has a unique descriptive checkpoint suffix", () => {
  for (const [id, expectedCount] of Object.entries(expectedCounts)) {
    const suffixes = stateCheckpointSuffixes[id]
    assert.equal(suffixes.length, expectedCount, id)
    assert.equal(new Set(suffixes).size, expectedCount, id)
    for (const suffix of suffixes) {
      assert.match(suffix, checkpointSuffixPattern)
    }
  }
})

test("header matrix and logical sidebar edges are not sampled", () => {
  assert.deepEqual(stateCheckpointSuffixes["organisms-header--sizes"], [
    "--state-mobile-navigation-sm-open",
    "--state-mobile-navigation-md-open",
    "--state-mobile-navigation-lg-open",
  ])
  for (const id of [
    "organisms-sidebar--left-and-right-sidebar-15",
    "organisms-sidebar--logical-edges-rtl",
  ]) {
    assert.deepEqual(stateCheckpointSuffixes[id], [
      "--state-mobile-start-navigation-open",
      "--state-mobile-end-navigation-open",
    ])
  }
  assert.deepEqual(
    stateCheckpointSuffixes["organisms-sidebar--controlled-offcanvas"],
    ["--state-mobile-start-navigation-open", "--state-desktop-offcanvas-open"]
  )
})

test("unknown and already-covered stories do not touch the page", async () => {
  for (const id of [
    "not-a-story",
    "toString",
    "organisms-datatable--column-visibility",
    "organisms-datatable--tree-structure",
    "organisms-datatable--expanded-row-detail",
    "organisms-header--localized-hamburger",
    "atoms-tooltip--sizes",
  ]) {
    const handled = await checkStateCheckpoints(null, id, () =>
      assert.fail("Unexpected capture")
    )
    assert.equal(handled, false, id)
  }
})
