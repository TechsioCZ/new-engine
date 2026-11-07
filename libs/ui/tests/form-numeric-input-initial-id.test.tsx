import { Fragment } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { FormNumericInput } from "../src/molecules/form-numeric-input"

const inputTag = /<input\b[^>]*>/
const labelTag = /<label\b[^>]*>/
const stepperTags = /<button\b[^>]*aria-controls="([^"]+)"[^>]*>/g

// Run in Node: these relationships must exist before client layout effects.
describe("FormNumericInput initial server-rendered IDs", () => {
  it.each([
    [undefined, undefined, "order-quantity"],
    ["warehouse-quantity", undefined, "warehouse-quantity"],
    ["warehouse-quantity", "native-quantity", "native-quantity"],
    [undefined, "native-quantity", "native-quantity"],
  ] as const)(
    "associates labels and steppers with input override %s / %s",
    (machineId, nativeId, expectedId) => {
      const html = renderToStaticMarkup(
        <FormNumericInput
          defaultValue={7}
          id="order-quantity"
          ids={machineId ? { input: machineId } : undefined}
          label="Order quantity"
        >
          <NumericInput.Control>
            <Fragment key="numeric-controls">
              <NumericInput.Input id={nativeId} />
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </Fragment>
          </NumericInput.Control>
        </FormNumericInput>
      )
      expect(html.match(inputTag)?.[0]).toContain(`id="${expectedId}"`)
      expect(html.match(labelTag)?.[0]).toContain(`for="${expectedId}"`)
      expect(
        Array.from(html.matchAll(stepperTags), (match) => match[1])
      ).toEqual([expectedId, expectedId])
    }
  )
})
