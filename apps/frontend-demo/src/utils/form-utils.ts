import type { SyntheticEvent } from "react"

/**
 * Simple form submit handler with preventDefault
 */
export const handleFormSubmit = (
  event: SyntheticEvent<HTMLFormElement>,
  onSubmit: () => void,
): void => {
  event.preventDefault()
  onSubmit()
}
