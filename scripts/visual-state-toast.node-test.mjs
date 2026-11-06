import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import {
  checkStateCheckpoints,
  stateCheckpointAppearances,
  stateCheckpointStories,
  stateCheckpointSuffixes,
  stateCheckpointText,
} from "../libs/ui/test/visual-state-toast-checkpoints.mjs"

const types = ["info", "success", "warning", "error", "loading"]
const expected = {
  "molecules-toast--playground": ["success-hover-paused"],
  "molecules-toast--variants": types.map((type) => `type-${type}`),
  "molecules-toast--update-example": [
    "original-info",
    "updating-loading",
    "updated-success",
  ],
  "molecules-toast--remove-vs-dismiss": ["instant-and-animated-stack"],
  "molecules-toast--pause-resume-example": ["paused-timer"],
  "molecules-toast--batch-operations": ["stacked-paused-batch"],
  "molecules-toast--promise-example": ["resolved-success"],
  "molecules-toast--with-action": ["undo-action"],
  "molecules-toast--persistent-loading": [
    "non-closable-loading",
    "completed-dismissible-success",
  ],
  "molecules-toast--long-content": ["wrapped-long-content"],
}

const source = readFileSync(
  new URL("../libs/ui/stories/molecules/toast.stories.tsx", import.meta.url),
  "utf8"
)
const appearancePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

test("all 10 Toast stories retain all 17 documented appearances", () => {
  assert.deepEqual(stateCheckpointAppearances, expected)
  assert.deepEqual(stateCheckpointStories, Object.keys(expected))
  assert.equal(new Set(stateCheckpointStories).size, 10)
  assert.equal(Object.values(expected).flat().length, 17)
  for (const [id, appearances] of Object.entries(stateCheckpointAppearances)) {
    assert.equal(new Set(appearances).size, appearances.length, id)
    for (const appearance of appearances) {
      assert.match(appearance, appearancePattern)
    }
    assert.deepEqual(
      stateCheckpointSuffixes[id],
      appearances.map((appearance) => `--state-${appearance}-open`)
    )
  }
  assert.deepEqual(Object.keys(stateCheckpointSuffixes), Object.keys(expected))
})

test("each handled story has a checked-in Storybook export", () => {
  const requireUI = createRequire(
    new URL("../libs/ui/package.json", import.meta.url)
  )
  const { toId, storyNameFromExport } = requireUI("storybook/internal/csf")
  const title = source.match(
    /\bconst meta\b[\s\S]*?\btitle:\s*["']([^"']+)["']/
  )?.[1]
  assert.equal(title, "Molecules/Toast")
  const knownStories = new Set(
    [...source.matchAll(/^export const (\w+)\b/gm)].map(([, name]) =>
      toId(title, storyNameFromExport(name))
    )
  )
  for (const id of stateCheckpointStories) {
    assert.ok(knownStories.has(id), id)
  }
})

test("Variants covers every documented toast type", () => {
  const documented = source
    .match(/options:\s*\[([^\]]+)\]/)?.[1]
    .match(/"([a-z]+)"/g)
    ?.map((type) => type.slice(1, -1))
  assert.deepEqual(documented, types)
})

test("checkpoints rely only on authored controls and toast copy", () => {
  // Computed labels are checked against the template that renders them.
  const templated = [
    [/^Update Toast \(Step [1-4]\)$/, /Update Toast \(Step \{step \+ 1\}\)/],
    [/^Toast [1-3]$/, /`Toast \$\{i \+ 1\}`/],
    [/^This is toast number [1-3]$/, /`This is toast number \$\{i \+ 1\}`/],
  ]
  for (const [id, texts] of Object.entries(stateCheckpointText)) {
    assert.ok(texts.length > 0, id)
    for (const text of texts) {
      const template = templated.find(([pattern]) => pattern.test(text))?.[1]
      assert.ok(
        template ? template.test(source) : source.includes(text),
        `${id}: ${text}`
      )
    }
  }
  for (const type of types) {
    assert.ok(source.includes(`label: "Show ${type} toast"`), type)
  }
})

test("stacked-toast controls use a top-aligned surface instead of viewport centering", () => {
  for (const name of ["BatchOperations", "RemoveVsDismiss"]) {
    const story = source.match(
      new RegExp(
        `export const ${name}: Story = \\{([\\s\\S]*?)(?=\\nexport const |\\n// Promise-based)`
      )
    )?.[1]
    assert.ok(story, name)
    assert.ok(story.includes('layout: "fullscreen"'), name)
    assert.ok(story.includes("<StorySurface>"), name)
    assert.ok(story.includes("</StorySurface>"), name)
    assert.ok(!story.includes("VariantContainer"), name)
  }
  assert.ok(
    stateCheckpointText["molecules-toast--batch-operations"].includes(
      "Resume All"
    )
  )
})

test("unhandled stories do not touch the page", async () => {
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
    "molecules-toast--docs",
    "molecules-toast",
    "molecules-dialog--playground",
    "molecules-menu--playground",
    "atoms-statustext--playground",
    "unknown-story",
    "",
    "__proto__",
    "toString",
  ]) {
    assert.equal(await checkStateCheckpoints(page, id, capture), false, id)
  }
})
