import type * as NumberInput from "@zag-js/number-input"
import type { Ref } from "react"
import { describe, expectTypeOf, it } from "vitest"
import type { QuantityFieldProps } from "../src/molecules/quantity-field"

describe("QuantityField controlled and pending contract", () => {
  it("requires a text draft, its change handler and an input ref", () => {
    expectTypeOf<QuantityFieldProps["value"]>().toEqualTypeOf<string>()
    expectTypeOf<QuantityFieldProps["onValueChange"]>().toEqualTypeOf<
      NonNullable<NumberInput.Props["onValueChange"]>
    >()
    expectTypeOf<QuantityFieldProps["ref"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >()
    expectTypeOf<QuantityFieldProps>().not.toHaveProperty("defaultValue")
    expectTypeOf<QuantityFieldProps>().not.toHaveProperty("onChange")
    expectTypeOf<QuantityFieldProps>().not.toHaveProperty("allowOverflow")
    expectTypeOf<QuantityFieldProps>().not.toHaveProperty("clampValueOnBlur")
  })

  it("requires localized progress text while pending", () => {
    const ready: QuantityFieldProps = {
      label: "Quantity",
      unitLabel: "pieces",
      value: "",
      onValueChange: () => {
        /* Intentionally unused in type-only contracts. */
      },
    }
    const pending: QuantityFieldProps = {
      ...ready,
      pending: true,
      pendingLabel: "Updating quantity",
    }
    // @ts-expect-error Pending requires a caller-provided localized status label.
    const missingPendingLabel: QuantityFieldProps = { ...ready, pending: true }
    const numericValue: QuantityFieldProps = {
      ...ready,
      // @ts-expect-error Numeric state is lossy for an empty or partial draft.
      value: 2,
    }
    expectTypeOf(pending).toExtend<QuantityFieldProps>()
    expectTypeOf(missingPendingLabel).toExtend<QuantityFieldProps>()
    expectTypeOf(numericValue).toExtend<QuantityFieldProps>()
  })
})
