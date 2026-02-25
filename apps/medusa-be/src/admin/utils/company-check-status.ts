const ADDRESS_COUNT_WARNING_THRESHOLD = 20

export const hasAddressCountWarning = (
  count: number | null | undefined
): boolean =>
  typeof count === "number" && count > ADDRESS_COUNT_WARNING_THRESHOLD

export const taxReliabilityBadge = (
  reliableValue: boolean | null | undefined
): {
  color: "green" | "red" | "grey"
  label: string
} => {
  if (reliableValue === true) {
    return {
      color: "green",
      label: "Reliable payer",
    }
  }

  if (reliableValue === false) {
    return {
      color: "red",
      label: "Unreliable payer",
    }
  }

  return {
    color: "grey",
    label: "Unknown",
  }
}

export const viesValidationBadge = (
  viesResult:
    | {
        valid: boolean
        is_group_registration: boolean
      }
    | undefined
): {
  color: "green" | "red" | "blue"
  label: string
} => {
  if (!viesResult) {
    return {
      color: "red",
      label: "Invalid VAT",
    }
  }

  if (viesResult.valid && viesResult.is_group_registration) {
    return {
      color: "blue",
      label: "Valid (group)",
    }
  }

  return viesResult.valid
    ? {
        color: "green",
        label: "Valid VAT",
      }
    : {
        color: "red",
        label: "Invalid VAT",
      }
}
