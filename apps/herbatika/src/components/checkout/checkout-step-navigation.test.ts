import { describe, expect, it } from "vitest"

import { canNavigateToCheckoutStep } from "./checkout-step-navigation"

describe(canNavigateToCheckoutStep, () => {
  it("allows navigation to an already accessible later step", () => {
    expect(
      canNavigateToCheckoutStep({
        highestAccessibleStepIndex: 3,
        isCheckoutComplete: false,
        stepCount: 4,
        targetStepIndex: 2,
      }),
    ).toBeTruthy()
  })

  it("rejects a later step whose checkout requirements are not met", () => {
    expect(
      canNavigateToCheckoutStep({
        highestAccessibleStepIndex: 1,
        isCheckoutComplete: false,
        stepCount: 4,
        targetStepIndex: 2,
      }),
    ).toBeFalsy()
  })

  it.each([-1, 4])("rejects an invalid target index: %s", (targetStepIndex) => {
    expect(
      canNavigateToCheckoutStep({
        highestAccessibleStepIndex: 3,
        isCheckoutComplete: false,
        stepCount: 4,
        targetStepIndex,
      }),
    ).toBeFalsy()
  })

  it("disables navigation after checkout completion", () => {
    expect(
      canNavigateToCheckoutStep({
        highestAccessibleStepIndex: 3,
        isCheckoutComplete: true,
        stepCount: 4,
        targetStepIndex: 0,
      }),
    ).toBeFalsy()
  })
})
