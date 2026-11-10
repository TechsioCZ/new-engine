import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Label } from "../src/atoms/label"
import { FormInput } from "../src/molecules/form-input"
import { FormTextarea } from "../src/molecules/form-textarea"

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
