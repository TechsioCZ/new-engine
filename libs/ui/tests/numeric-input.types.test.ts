import type * as NumberInput from "@zag-js/number-input"
import type { ComponentProps, Ref } from "react"
import { describe, expectTypeOf, it } from "vitest"
import type {
  NumericInput,
  NumericInputProps,
} from "../src/atoms/numeric-input"
import type { FormNumericInput } from "../src/molecules/form-numeric-input"
import type { NumericInputTemplate } from "../src/templates/numeric-input"

describe("NumericInput compatibility and draft contract", () => {
  it("adds text values without changing the legacy numeric callback", () => {
    expectTypeOf<NumericInputProps["value"]>().toEqualTypeOf<
      number | string | undefined
    >()
    expectTypeOf<NumericInputProps["defaultValue"]>().toEqualTypeOf<
      number | string | undefined
    >()
    expectTypeOf<NumericInputProps["onChange"]>().toEqualTypeOf<
      ((value: number) => void) | undefined
    >()
    expectTypeOf<NumericInputProps["onValueChange"]>().toEqualTypeOf<
      NumberInput.Props["onValueChange"]
    >()
    expectTypeOf<NumericInputProps["onValueCommit"]>().toEqualTypeOf<
      NumberInput.Props["onValueCommit"]
    >()
    expectTypeOf<NumericInputProps["onValueInvalid"]>().toEqualTypeOf<
      NumberInput.Props["onValueInvalid"]
    >()
    expectTypeOf<NumericInputProps["onFocusChange"]>().toEqualTypeOf<
      NumberInput.Props["onFocusChange"]
    >()
  })

  it("keeps form/template consumers and the actual input ref usable", () => {
    expectTypeOf<
      ComponentProps<typeof FormNumericInput>["onChange"]
    >().toEqualTypeOf<NumericInputProps["onChange"]>()
    expectTypeOf<
      ComponentProps<typeof NumericInputTemplate>["onChange"]
    >().toEqualTypeOf<NumericInputProps["onChange"]>()
    expectTypeOf<
      ComponentProps<typeof NumericInput.Input>["ref"]
    >().toEqualTypeOf<Ref<HTMLInputElement> | undefined>()
    expectTypeOf<NumericInputProps["form"]>().toEqualTypeOf<
      string | undefined
    >()
  })
})
