type CheckoutStepNavigationParams = {
  highestAccessibleStepIndex: number
  isCheckoutComplete: boolean
  stepCount: number
  targetStepIndex: number
}

export const canNavigateToCheckoutStep = ({
  highestAccessibleStepIndex,
  isCheckoutComplete,
  stepCount,
  targetStepIndex,
}: CheckoutStepNavigationParams) =>
  !isCheckoutComplete &&
  targetStepIndex >= 0 &&
  targetStepIndex < stepCount &&
  targetStepIndex <= highestAccessibleStepIndex
