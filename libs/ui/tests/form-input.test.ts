import {
  type ComponentProps,
  type ComponentType,
  createElement as h,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Input } from "../src/atoms/input"
import { NumericInput } from "../src/atoms/numeric-input"
import { StatusText } from "../src/atoms/status-text"
import { Textarea } from "../src/atoms/textarea"
import { FormInput, FormInputRaw } from "../src/molecules/form-input"
import { FormNumericInput } from "../src/molecules/form-numeric-input"
import { FormTextarea, FormTextareaRaw } from "../src/molecules/form-textarea"

const INPUT_TAG = /<input\b[^>]*>/
const WRAPPER_TAG = /^<div\b[^>]*>/
const CLASS_ATTRIBUTE = /class="([^"]*)"/
const ID_ATTRIBUTE = /\bid="([^"]*)"/
const FIELD_TAG = /<(?:input|textarea)\b[^>]*>/
const DESCRIPTION_ATTRIBUTE = /aria-describedby="([^"]*)"/

describe.each([
  ["FormInput", FormInput],
  ["FormInputRaw", FormInputRaw],
] as const)("%s input classes", (_name, Component) => {
  it("merges caller classes onto the input and preserves the selected size", () => {
    const html = renderToStaticMarkup(
      h(Component, { label: "Email", className: "consumer-input-marker" })
    )
    const input = html.match(INPUT_TAG)?.[0]
    expect(input).toContain("consumer-input-marker")
    expect(input).toContain("p-input-md")
    expect(input).not.toContain("md:p-input-md")
    expect(html.match(WRAPPER_TAG)?.[0]).not.toContain("consumer-input-marker")
  })

  it("lets caller padding replace matching defaults without losing label associations", () => {
    const html = renderToStaticMarkup(
      h(Component, {
        label: "Email",
        className: "p-input-lg md:p-input-sm",
        required: true,
        disabled: true,
        "aria-describedby": "email-hint",
        "aria-invalid": true,
      })
    )
    const input = html.match(INPUT_TAG)?.[0]
    const classes = input?.match(CLASS_ATTRIBUTE)?.[1]?.split(" ")
    expect(classes).toContain("p-input-lg")
    expect(classes).toContain("md:p-input-sm")
    expect(classes).not.toContain("p-input-sm")
    expect(classes).not.toContain("p-input-md")
    expect(classes).not.toContain("md:p-input-md")
    const id = input?.match(ID_ATTRIBUTE)?.[1]
    expect(id).toBeTruthy()
    expect(html).toContain(`for="${id}"`)
    expect(input).toContain('required=""')
    expect(input).toContain('disabled=""')
    expect(input).toContain('aria-describedby="email-hint"')
    expect(input).toContain('aria-invalid="true"')
  })
})

it("preserves caller and generated helper descriptions in the error state", () => {
  const html = renderToStaticMarkup(
    h(FormInput, {
      id: "email",
      label: "Email",
      className: "consumer-input-marker",
      helpText: "Enter a valid email",
      validateStatus: "error",
      "aria-describedby": "external-hint",
    })
  )
  const input = html.match(INPUT_TAG)?.[0]
  const describedBy = input?.match(DESCRIPTION_ATTRIBUTE)?.[1]?.split(" ")
  expect(describedBy).toHaveLength(2)
  expect(describedBy?.[0]).toBe("external-hint")
  expect(html).toContain(`id="${describedBy?.[1]}"`)
  expect(html).toContain('for="email"')
  expect(input).toContain('aria-invalid="true"')
  expect(input).toContain("consumer-input-marker")
})

it("keeps small field padding independent of the viewport", () => {
  const html = renderToStaticMarkup(
    h(FormInput, { label: "Contact name", size: "sm" })
  )
  const input = html.match(INPUT_TAG)?.[0]
  expect(input).toContain("p-input-sm")
  expect(input).not.toContain("p-input-md")
  expect(input).toContain("h-form-control-sm")
})

it("consumes hideSearchClear and respects false instead of emitting the hidden pseudo-element", () => {
  const html = renderToStaticMarkup(
    h(Input, {
      type: "search",
      hideSearchClear: false,
      "aria-label": "Search products",
    })
  )
  expect(html).not.toContain("hideSearchClear")
  expect(html).not.toContain("webkit-search-cancel-button")
  const hidden = renderToStaticMarkup(
    h(Input, { type: "search", hideSearchClear: true })
  )
  expect(hidden).toContain("webkit-search-cancel-button")
  const locked = renderToStaticMarkup(
    h(Input, { type: "search", hideSearchClear: false, readOnly: true })
  )
  expect(locked).toContain("webkit-search-cancel-button")
})

const feedbackFields: ComponentType<{
  label: string
  validateStatus: "error"
  helpText: string
  showHelpTextIcon: boolean
  "aria-describedby": string
}>[] = [FormInput, FormInputRaw, FormTextarea, FormTextareaRaw]

it.each(feedbackFields)(
  "associates error messages and retains validation icons",
  (Component) => {
    const html = renderToStaticMarkup(
      h(Component, {
        label: "Delivery details",
        validateStatus: "error",
        helpText: "Enter delivery details before saving.",
        showHelpTextIcon: false,
        "aria-describedby": "external external",
      })
    )
    const control = html.match(FIELD_TAG)?.[0]
    const descriptions = control?.match(DESCRIPTION_ATTRIBUTE)?.[1]?.split(" ")
    expect(descriptions).toHaveLength(2)
    expect(control).toContain(`aria-errormessage="${descriptions?.[1]}"`)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('role="alert"')
  }
)

it("supports native readOnly and the legacy textarea readonly alias equally", () => {
  for (const props of [{ readOnly: true }, { readonly: true }]) {
    const html = renderToStaticMarkup(
      h(Textarea, { ...props, defaultValue: "Confirmed delivery instructions" })
    )
    expect(html).toContain('readOnly=""')
    expect(html).toContain('data-readonly=""')
    expect(html).toContain("form-control-readonly")
    expect(html).not.toContain('disabled=""')
  }
})

it("auto-generates unique IDs across multiple unlabeled-ID fields", () => {
  const html = renderToStaticMarkup(
    h(
      "div",
      null,
      h(FormInput, { label: "First name" }),
      h(FormInput, { label: "Last name" })
    )
  )
  const ids = Array.from(
    html.matchAll(/<input\b[^>]*\bid="([^"]*)"/g),
    (match) => match[1]
  )
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(2)
  for (const id of ids) {
    expect(html).toContain(`for="${id}"`)
  }
})

it("keeps a precomposed Raw status message unique and associated", () => {
  const html = renderToStaticMarkup(
    h(FormInputRaw, {
      label: "Contact name",
      helpText: h(
        StatusText,
        // React's createElement types do not infer required children from the third argument.
        { id: "contact-error", status: "error" } as ComponentProps<
          typeof StatusText
        >,
        "Enter the recipient’s full name."
      ),
    })
  )
  const input = html.match(INPUT_TAG)?.[0]
  expect(input).toContain('aria-describedby="contact-error"')
  expect(input).toContain('aria-errormessage="contact-error"')
  expect(html.split('id="contact-error"')).toHaveLength(2)
  expect(html.split('role="alert"')).toHaveLength(2)
})

type CallerErrorProps = {
  label: string
  validateStatus?: "default" | "error" | "success"
  "aria-invalid"?: true
  "aria-errormessage"?: string
  helpText?: string
}
const callerErrorFields: [string, ComponentType<CallerErrorProps>][] = [
  ["FormInput", FormInput],
  ["FormInputRaw", FormInputRaw],
  ["FormTextarea", FormTextarea],
  ["FormTextareaRaw", FormTextareaRaw],
]

describe.each(callerErrorFields)(
  "%s caller-owned errors",
  (_name, Component) => {
    it("retains caller error references independently of wrapper validation", () => {
      for (const validateStatus of ["default", "error", "success"] as const) {
        const html = renderToStaticMarkup(
          h(Component, {
            label: "Delivery details",
            validateStatus,
            "aria-invalid": true,
            "aria-errormessage": "external-error",
            helpText: "Check the delivery details.",
          })
        )
        const control = html.match(FIELD_TAG)?.[0]
        expect(control).toContain('aria-invalid="true"')
        expect(control).toContain('aria-errormessage="external-error')
        if (validateStatus !== "error") {
          expect(control).toContain('aria-errormessage="external-error"')
        }
      }
    })

    it("removes only its generated error when wrapper validation clears", () => {
      const html = renderToStaticMarkup(
        h(Component, {
          label: "Delivery details",
          helpText: "Optional guidance.",
        })
      )
      expect(html.match(FIELD_TAG)?.[0]).not.toContain("aria-errormessage")
    })
  }
)

it.each([{ invalid: true }, { "aria-invalid": true as const }])(
  "preserves caller-owned errors on the numeric input for %o",
  (state) => {
    const html = renderToStaticMarkup(
      h(
        FormNumericInput,
        {
          ...state,
          label: "Quantity",
          "aria-errormessage": "external-error",
        } as ComponentProps<typeof FormNumericInput>,
        h(NumericInput.Control, null, h(NumericInput.Input))
      )
    )
    const control = html.match(INPUT_TAG)?.[0]
    expect(control).toContain('aria-invalid="true"')
    expect(control).toContain('aria-errormessage="external-error"')
  }
)

it("leaves the lifecycle of explicit numeric error references with their caller", () => {
  const html = renderToStaticMarkup(
    h(
      NumericInput,
      { "aria-errormessage": "caller-error" },
      h(NumericInput.Control, null, h(NumericInput.Input))
    )
  )
  expect(html.match(INPUT_TAG)?.[0]).toContain(
    'aria-errormessage="caller-error"'
  )
})
