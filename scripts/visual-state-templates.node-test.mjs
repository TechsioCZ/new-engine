import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  checkStateCheckpoints,
  stateCheckpointAppearances,
  stateCheckpointStories,
} from "../libs/ui/test/visual-state-templates-checkpoints.mjs"

const stateSuffixPattern = /^--state-[a-z0-9-]+-open$/
const sharedViewportImport =
  /import \{ assertWithinViewport \} from "\.\/visual-viewport\.mjs"/
const nonSharedViewportCheck =
  /toBeInViewport|viewportOverhang|toBeLessThanOrEqual/

const expected = {
  "templates-popover--playground": ["default"],
  "templates-popover--sizes": ["sm", "md", "lg"],
  "templates-popover--with-close-button": ["contact-form"],
  "templates-popover--without-arrow": ["arrowless"],
  "templates-selecttemplate--playground": ["unselected-options"],
  "templates-selecttemplate--sizes": ["sm", "md", "lg"],
  "templates-selecttemplate--multiple": ["multiple-options"],
  "templates-searchsuggestions--sizes": ["sm-results", "lg-results"],
  "templates-searchsuggestions--in-dialog": ["dialog-results"],
  "templates-comprehensive-form--sizes": [
    "sm-team",
    "sm-category",
    "md-team",
    "md-category",
    "lg-team",
    "lg-category",
  ],
  "templates-comprehensive-form--popup-lifecycle-contracts": [
    "lifecycle-select",
    "lifecycle-combobox",
    "lifecycle-cascade",
    "lifecycle-date",
  ],
  "templates-comprehensive-form--modal-popup-contracts": [
    "dialog-cascade",
    "dialog-suggestions",
    "drawer-cascade",
    "drawer-suggestions",
  ],
  "templates-facetfilterpanel--overflow": ["expanded-material"],
  "templates-facetfilterpanel--rejected-drawer-close": [
    "declined-close-drawer",
  ],
  "templates-akrosproductcardcomposition--playground": ["product-preview"],
}

const excluded = [
  "templates-popover--states",
  "templates-selecttemplate--disabled",
  "templates-selecttemplate--read-only",
  "templates-selecttemplate--validation",
  "templates-selecttemplate--static-value-text",
  "templates-searchsuggestions--grouped-results",
  "templates-searchsuggestions--without-group-labels",
  "templates-searchsuggestions--loading",
  "templates-searchsuggestions--empty",
  "templates-searchsuggestions--error-with-retry",
  "templates-searchsuggestions--narrow-layout",
  "templates-searchsuggestions--states",
  "templates-searchsuggestions--disabled",
  "templates-searchsuggestions--read-only",
  "templates-comprehensive-form--disabled",
  "templates-comprehensive-form--read-only",
  "templates-facetfilterpanel--drawer-open",
  "templates-accordiontemplate--playground",
  "templates-tabstemplate--playground",
  "atoms-tooltip--sizes",
  "unknown-story",
  "__proto__",
  "constructor",
]

test("registry includes exactly the 15 assigned confirmed stories", () => {
  assert.deepEqual(stateCheckpointStories, Object.keys(expected))
  assert.equal(new Set(stateCheckpointStories).size, 15)
})

test("every documented additional appearance has its own stable suffix", () => {
  assert.deepEqual(stateCheckpointAppearances, expected)
  let checkpoints = 0
  for (const appearances of Object.values(stateCheckpointAppearances)) {
    const suffixes = appearances.map(
      (appearance) => `--state-${appearance}-open`
    )
    assert.equal(new Set(suffixes).size, suffixes.length)
    for (const suffix of suffixes) {
      assert.match(suffix, stateSuffixPattern)
    }
    checkpoints += suffixes.length
  }
  assert.equal(checkpoints, 31)
})

test("template geometry uses the shared strict helper instead of intersection ratios", () => {
  const source = readFileSync(
    new URL(
      "../libs/ui/test/visual-state-templates-checkpoints.mjs",
      import.meta.url
    ),
    "utf8"
  )
  assert.match(source, sharedViewportImport)
  assert.doesNotMatch(source, nonSharedViewportCheck)
})

test("medium search results stay excluded while all form/modal sizes are covered", () => {
  assert.deepEqual(
    stateCheckpointAppearances["templates-searchsuggestions--sizes"],
    ["sm-results", "lg-results"]
  )
  assert.equal(
    stateCheckpointAppearances["templates-comprehensive-form--sizes"].length,
    6
  )
  assert.equal(
    stateCheckpointAppearances[
      "templates-comprehensive-form--modal-popup-contracts"
    ].length,
    4
  )
})

test("unassigned and sufficient stories return false without touching the page or capture", async () => {
  const page = new Proxy(
    {},
    {
      get() {
        throw new Error("Excluded stories must not interact with the page")
      },
    }
  )
  for (const id of excluded) {
    assert.equal(
      await checkStateCheckpoints(page, id, () => {
        throw new Error("Excluded stories must not capture")
      }),
      false,
      id
    )
  }
})
