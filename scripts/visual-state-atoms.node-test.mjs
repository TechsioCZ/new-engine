import assert from "node:assert/strict"
import { test } from "node:test"
import {
  checkStateCheckpoints,
  stateCheckpointStories,
} from "../libs/ui/test/visual-state-atoms-checkpoints.mjs"

test("atom checkpoints contain exactly the two confirmed Hotkeys gaps", () => {
  assert.deepEqual(stateCheckpointStories, [
    "atoms-hotkeys--playground",
    "atoms-hotkeys--form-fields-technical",
  ])
})

test("unhandled stories neither use the page nor request a capture", async () => {
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
    "atoms-tooltip--playground",
    "atoms-tooltip--sizes",
    "atoms-hotkeys--sizes",
    "atoms-hotkeys--form-fields",
    "unknown-story",
    "",
  ]) {
    assert.equal(await checkStateCheckpoints(page, id, capture), false)
  }
})
