import type { FormEvent } from "react"

/**
 * Simple form submit handler with preventDefault
 */
export function handleFormSubmit(
  event: FormEvent<HTMLFormElement>,
  callback: () => void,
) {
  event.preventDefault()
  callback()
}
