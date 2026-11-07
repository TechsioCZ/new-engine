// biome-ignore-all lint/suspicious/noMisplacedAssertion: The play harness invokes assertion helpers only from node:test cases.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import { connect } from "@zag-js/number-input"

const source = readFileSync(
  new URL(
    "../stories/molecules/form-numeric-input.stories.tsx",
    import.meta.url
  ),
  "utf8"
)
const horizontal = source.split("export const HorizontalLayout: Story = {")[1]
if (!horizontal) {
  throw new Error("HorizontalLayout story must exist")
}
const playSource = horizontal
  .split("  play: ")[1]
  .split("\n  parameters:")[0]
  .trim()
  .replace(/,$/, "")

// Replay only the story's plain-JS play callback. Zag supplies the real default
// trigger names/types; value changes and geometry are lightweight test doubles.
function createHarness({
  invalidPart,
  borderTopStyle = "solid",
  height = 40,
} = {}) {
  const api = connect(
    {
      state: { hasTag: () => false, matches: () => false },
      prop: () => undefined,
      computed: (key) => key === "canIncrement" || key === "canDecrement",
      scope: { id: "horizontal-quantity" },
    },
    { button: (props) => props }
  )
  const input = {
    value: "50",
    getBoundingClientRect: () => ({ height: 40 }),
  }
  const buttons = [
    [api.getDecrementTriggerProps(), -1],
    [api.getIncrementTriggerProps(), 1],
  ].map(([props, delta]) => ({
    ...props,
    delta,
    borderTopStyle:
      props["data-part"] === invalidPart ? borderTopStyle : "solid",
    getBoundingClientRect: () => ({
      height: props["data-part"] === invalidPart ? height : 40,
    }),
  }))
  const values = []
  const canvas = {
    getByRole(role, options) {
      if (role === "spinbutton") {
        return input
      }
      assert.equal(role, "button")
      const button = buttons.find(
        (candidate) => candidate["aria-label"] === options.name
      )
      assert.ok(button, `No button named ${options.name}`)
      assert.equal(button.type, "button", "Step controls must not submit forms")
      return button
    },
  }
  const play = runInNewContext(`(${playSource})`, {
    within: () => canvas,
    userEvent: {
      click(button) {
        input.value = String(Number(input.value) + button.delta)
        values.push(input.value)
      },
    },
    getComputedStyle: (button) => button,
    expect: (actual) => ({
      toHaveValue: (expected) => assert.equal(actual.value, expected),
      toBe: (expected) =>
        assert.equal(actual, expected, "Step control must have a solid border"),
      toBeGreaterThanOrEqual: (expected) =>
        assert.ok(actual >= expected, "Step control is shorter than input"),
    }),
  })
  return { play: () => play({ canvasElement: {} }), values, input }
}

test("horizontal story resolves Zag's exact names and checks 50 → 51 → 50", async () => {
  const { play, values, input } = createHarness()
  await play()
  assert.deepEqual(values, ["51", "50"])
  assert.equal(input.value, "50")
})

const borderFailure = /Step control must have a solid border/
const heightFailure = /Step control is shorter than input/

for (const invalidPart of ["increment-trigger", "decrement-trigger"]) {
  test(`horizontal story rejects a missing ${invalidPart} border`, async () => {
    const { play } = createHarness({ invalidPart, borderTopStyle: "none" })
    await assert.rejects(play, borderFailure)
  })

  test(`horizontal story rejects a shorter ${invalidPart}`, async () => {
    const { play } = createHarness({ invalidPart, height: 39 })
    await assert.rejects(play, heightFailure)
  })
}
