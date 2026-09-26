import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { NumericInput } from "../src/atoms/numeric-input"
import { FormCheckbox } from "../src/molecules/form-checkbox"
import { FormErrorSummary } from "../src/molecules/form-error-summary"
import { FormNumericInput } from "../src/molecules/form-numeric-input"

const INPUT_TAG = /<input\b[^>]*>/g

test("error summary targets the native checkbox input", () => {
  const markup = renderToStaticMarkup(
    <>
      <FormErrorSummary
        errors={[
          { id: "terms", label: "Accept terms", targetId: "terms-field" },
        ]}
      />
      <FormCheckbox id="terms-field" label="Accept terms" />
    </>
  )

  const checkbox = markup
    .match(INPUT_TAG)
    ?.find((tag) => tag.includes('type="checkbox"'))
  expect(markup).toContain('href="#terms-field"')
  expect(checkbox).toContain('id="terms-field"')
})

test("error summary and label target the native numeric input", () => {
  const markup = renderToStaticMarkup(
    <>
      <FormErrorSummary
        errors={[
          {
            id: "quantity",
            label: "Enter quantity",
            targetId: "quantity-field",
          },
        ]}
      />
      <FormNumericInput id="quantity-field" label="Quantity">
        <NumericInput.Control>
          <NumericInput.Input />
        </NumericInput.Control>
      </FormNumericInput>
    </>
  )

  const input = markup.match(INPUT_TAG)?.[0]
  expect(markup).toContain('href="#quantity-field"')
  expect(markup).toContain('for="quantity-field"')
  expect(input).toContain('id="quantity-field"')
})
