import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FormInput, FormInputRaw } from "../src/molecules/form-input"

const INPUT_TAG = /<input\b[^>]*>/
const WRAPPER_TAG = /^<div\b[^>]*>/
const CLASS_ATTRIBUTE = /class="([^"]*)"/
const ID_ATTRIBUTE = /\bid="([^"]*)"/
const DESCRIPTION_ATTRIBUTE = /aria-describedby="([^"]*)"/

describe.each([
  ["FormInput", FormInput],
  ["FormInputRaw", FormInputRaw],
] as const)("%s input classes", (_name, Component) => {
  it("merges caller classes onto the input and preserves responsive defaults", () => {
    const html = renderToStaticMarkup(
      h(Component, { label: "Email", className: "consumer-input-marker" })
    )
    const input = html.match(INPUT_TAG)?.[0]
    expect(input).toContain("consumer-input-marker")
    expect(input).toContain("p-input-sm")
    expect(input).toContain("md:p-input-md")
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
