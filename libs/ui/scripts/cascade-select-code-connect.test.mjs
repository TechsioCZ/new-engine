import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { compileFunction } from "node:vm"

const INVALID_SNIPPET = /undefined|\[object Object\]/
const source = readFileSync(
  new URL("../src/molecules/cascade-select.figma.ts", import.meta.url),
  "utf8"
)
const execute = compileFunction(
  source
    .replace('import figma from "figma"', "")
    .replace("export default", "return"),
  ["figma"]
)

function render(properties) {
  const label = {
    type: "INSTANCE",
    getEnum: (_, values) => values.current,
    findText: () => ({ type: "TEXT", textContent: "Product category" }),
  }
  const status = {
    type: "INSTANCE",
    getEnum: (name, values) => values[name === "size" ? "md" : "default"],
    findLayers: () => [
      { type: "TEXT", textContent: "Choose a leaf category." },
    ],
  }
  const indicator = {
    type: "INSTANCE",
    executeTemplate: () => ({ example: "<Icon />" }),
  }
  // Figma is a hosted virtual module; stub only its runtime boundary.
  return execute({
    selectedInstance: {
      getEnum: (name, values) => values[properties[name]],
      getBoolean: (name) => properties[name],
      getString: () => "Choose a category",
      findInstance: (name) =>
        ({ Label: label, StatusText: status, Indicator: indicator })[name],
    },
    code: (strings, ...values) =>
      strings.reduce(
        (result, part, i) => result + part + (values[i] ?? ""),
        ""
      ),
    helpers: {
      react: {
        renderProp: (name, value) => {
          if (value === false || value === undefined) {
            return ""
          }
          return value === true
            ? ` ${name}`
            : ` ${name}=${JSON.stringify(value)}`
        },
        renderChildren: (value) => value ?? "",
      },
    },
  }).example
}

function createFixtures() {
  const states = [
    "default",
    "hover",
    "focus",
    "error",
    "success",
    "warning",
    "disabled",
    "readonly",
  ]
  const fixtures = []
  for (const size of ["xs", "sm", "md", "lg"]) {
    for (const state of states) {
      for (const required of ["false", "true"]) {
        for (let mask = 0; mask < 16; mask += 1) {
          const [showClearTrigger, showIndicator, showStatusText, showLabel] =
            Array.from(
              mask.toString(2).padStart(4, "0"),
              (value) => value === "1"
            )
          fixtures.push({
            size,
            state,
            required,
            showLabel,
            showStatusText,
            showIndicator,
            showClearTrigger,
          })
        }
      }
    }
  }
  return fixtures
}

test("every CascadeSelect Figma state emits valid validation and slot props", () => {
  const fixtures = createFixtures()
  assert.equal(fixtures.length, 1024)
  for (const properties of fixtures) {
    const { size, state, required } = properties
    const snippet = render(properties)
    const validation = ["error", "success", "warning"].includes(state)
      ? state
      : "default"
    assert.ok(
      snippet.includes(`validateStatus="${validation}"`),
      `${state}: missing validation mapping`
    )
    assert.ok(snippet.includes(`size="${size}"`))
    assert.equal(snippet.includes(" disabled"), state === "disabled")
    assert.equal(snippet.includes(" readOnly"), state === "readonly")
    assert.equal(snippet.includes(" required"), required === "true")
    for (const [property, slot] of [
      ["showLabel", "Label"],
      ["showStatusText", "StatusText"],
      ["showIndicator", "Indicator"],
      ["showClearTrigger", "ClearTrigger"],
    ]) {
      assert.equal(
        snippet.includes(`<CascadeSelect.${slot}`),
        properties[property]
      )
    }
    assert.doesNotMatch(snippet, INVALID_SNIPPET)
  }
})
