import { createElement, Fragment } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { FormCheckbox } from "../src/molecules/form-checkbox"
import { FormErrorSummary } from "../src/molecules/form-error-summary"
import { FormNumericInput } from "../src/molecules/form-numeric-input"

const INPUT_TAG = /<input\b[^>]*>/g

test("error summary targets the native checkbox input", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      createElement(FormErrorSummary, {
        errors: [
          { id: "terms", label: "Accept terms", targetId: "terms-field" },
        ],
      }),
      createElement(FormCheckbox, { id: "terms-field", label: "Accept terms" })
    )
  )

  const checkbox = markup
    .match(INPUT_TAG)
    ?.find((tag) => tag.includes('type="checkbox"'))
  expect(markup).toContain('href="#terms-field"')
  expect(checkbox).toContain('id="terms-field"')
})

test("error summary and label target the native numeric input", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      createElement(FormErrorSummary, {
        errors: [
          {
            id: "quantity",
            label: "Enter quantity",
            targetId: "quantity-field",
          },
        ],
      }),
      createElement(FormNumericInput, {
        id: "quantity-field",
        label: "Quantity",
        // biome-ignore lint/correctness/noChildrenProp: createElement requires the component's mandatory children in its props argument for TypeScript.
        children: createElement(
          NumericInput.Control,
          null,
          createElement(NumericInput.Input)
        ),
      })
    )
  )

  const input = markup.match(INPUT_TAG)?.[0]
  expect(markup).toContain('href="#quantity-field"')
  expect(markup).toContain('for="quantity-field"')
  expect(input).toContain('id="quantity-field"')
})

test("summary is programmatically focusable and has an accessible heading", () => {
  const markup = renderToStaticMarkup(
    createElement(FormErrorSummary, {
      errors: [{ id: "email", label: "Enter your email.", targetId: "email" }],
    })
  )
  expect(markup).toContain('tabindex="-1"')
  expect(markup).toContain('aria-labelledby="')
  expect(markup).toContain('role="alert"')
})

test("empty summary does not leave an alert in the document", () => {
  expect(
    renderToStaticMarkup(createElement(FormErrorSummary, { errors: [] }))
  ).toBe("")
})
