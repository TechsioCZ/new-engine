import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Label } from "../src/atoms/label"
import { NumericInput } from "../src/atoms/numeric-input"
import { Combobox } from "../src/molecules/combobox"
import { DatePicker } from "../src/molecules/date-picker"
import { FormInput } from "../src/molecules/form-input"
import { FormNumericInput } from "../src/molecules/form-numeric-input"
import { FormTextarea } from "../src/molecules/form-textarea"
import { QuantityField } from "../src/molecules/quantity-field"
import { Switch } from "../src/molecules/switch"

const REQUIRED_TEXT = /<span class="sr-only">([^<]*)<\/span>/g
const LEAKED_PROP = /requiredlabel/i

function srOnlyTexts(markup: string) {
  return [...markup.matchAll(REQUIRED_TEXT)].map((match) => match[1])
}

describe("Label requiredLabel", () => {
  it("keeps the English screen-reader text by default", () => {
    const markup = renderToStaticMarkup(<Label required>Email</Label>)
    expect(srOnlyTexts(markup)).toEqual([" (required)"])
  })

  it("renders a custom translated screen-reader text", () => {
    const markup = renderToStaticMarkup(
      <Label required requiredLabel="(povinné)">
        E-mail
      </Label>
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toContain("(required)")
  })

  it("omits the screen-reader text when requiredLabel is empty", () => {
    const markup = renderToStaticMarkup(
      <Label required requiredLabel="">
        E-mail
      </Label>
    )
    expect(srOnlyTexts(markup)).toEqual([])
    expect(markup).toContain('aria-hidden="true"')
  })

  it("renders no required text when the field is not required", () => {
    const markup = renderToStaticMarkup(
      <Label requiredLabel="(povinné)">E-mail</Label>
    )
    expect(srOnlyTexts(markup)).toEqual([])
  })
})

describe("form wrappers forward requiredLabel to Label", () => {
  it("FormInput passes the custom text through and keeps it off the input", () => {
    const markup = renderToStaticMarkup(
      <FormInput label="E-mail" required requiredLabel="(povinné)" />
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toMatch(LEAKED_PROP)
  })

  it("FormTextarea passes the custom text through", () => {
    const markup = renderToStaticMarkup(
      <FormTextarea label="Poznámka" required requiredLabel="(povinné)" />
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toMatch(LEAKED_PROP)
  })
})

describe("FormNumericInput forwards requiredLabel", () => {
  it("passes the custom text through and keeps it off the input", () => {
    const markup = renderToStaticMarkup(
      <FormNumericInput label="Množství" required requiredLabel="(povinné)">
        <NumericInput defaultValue={1}>
          <NumericInput.Control>
            <NumericInput.Input aria-label="Množství" />
          </NumericInput.Control>
        </NumericInput>
      </FormNumericInput>
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toMatch(LEAKED_PROP)
  })

  it("keeps the English default and omits the text for an empty string", () => {
    const field = (requiredLabel?: string) =>
      renderToStaticMarkup(
        <FormNumericInput
          label="Množství"
          required
          requiredLabel={requiredLabel}
        >
          <NumericInput defaultValue={1}>
            <NumericInput.Control>
              <NumericInput.Input aria-label="Množství" />
            </NumericInput.Control>
          </NumericInput>
        </FormNumericInput>
      )
    expect(srOnlyTexts(field())).toEqual([" (required)"])
    expect(srOnlyTexts(field(""))).toEqual([])
  })
})

describe("components that render Label themselves expose requiredLabel", () => {
  it("Combobox renders the custom text and keeps it off the input", () => {
    const markup = renderToStaticMarkup(
      <Combobox
        items={[{ label: "Czechia", value: "CZ" }]}
        label="Země"
        required
        requiredLabel="(povinné)"
      />
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toMatch(LEAKED_PROP)
  })

  it("Combobox keeps the English default and omits an empty string", () => {
    const items = [{ label: "Czechia", value: "CZ" }]
    const withDefault = renderToStaticMarkup(
      <Combobox items={items} label="Země" required />
    )
    const withEmpty = renderToStaticMarkup(
      <Combobox items={items} label="Země" required requiredLabel="" />
    )
    expect(srOnlyTexts(withDefault)).toEqual([" (required)"])
    expect(srOnlyTexts(withEmpty)).toEqual([])
  })

  it("QuantityField renders the custom text and keeps it off the input", () => {
    const markup = renderToStaticMarkup(
      <QuantityField
        label="Množství"
        onValueChange={() => undefined}
        required
        requiredLabel="(povinné)"
        unitLabel="ks"
        value="1"
      />
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toMatch(LEAKED_PROP)
  })

  it("QuantityField keeps the English default and omits an empty string", () => {
    const field = (requiredLabel?: string) =>
      renderToStaticMarkup(
        <QuantityField
          label="Množství"
          onValueChange={() => undefined}
          required
          requiredLabel={requiredLabel}
          unitLabel="ks"
          value="1"
        />
      )
    expect(srOnlyTexts(field())).toEqual([" (required)"])
    expect(srOnlyTexts(field(""))).toEqual([])
  })

  it("Switch renders the custom text and keeps it off the input", () => {
    const markup = renderToStaticMarkup(
      <Switch required requiredLabel="(povinné)">
        Notifikace
      </Switch>
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toMatch(LEAKED_PROP)
  })

  it("Switch keeps the English default and omits an empty string", () => {
    const withDefault = renderToStaticMarkup(
      <Switch required>Notifikace</Switch>
    )
    const withEmpty = renderToStaticMarkup(
      <Switch required requiredLabel="">
        Notifikace
      </Switch>
    )
    expect(srOnlyTexts(withDefault)).toEqual([" (required)"])
    expect(srOnlyTexts(withEmpty)).toEqual([])
  })

  it("DatePicker.Label renders the custom text and keeps it off the label element", () => {
    const markup = renderToStaticMarkup(
      <DatePicker required>
        <DatePicker.Label requiredLabel="(povinné)">Datum</DatePicker.Label>
      </DatePicker>
    )
    expect(srOnlyTexts(markup)).toEqual([" (povinné)"])
    expect(markup).not.toMatch(LEAKED_PROP)
  })

  it("DatePicker.Label keeps the English default and omits an empty string", () => {
    const label = (requiredLabel?: string) =>
      renderToStaticMarkup(
        <DatePicker required>
          <DatePicker.Label requiredLabel={requiredLabel}>
            Datum
          </DatePicker.Label>
        </DatePicker>
      )
    expect(srOnlyTexts(label())).toEqual([" (required)"])
    expect(srOnlyTexts(label(""))).toEqual([])
  })
})
