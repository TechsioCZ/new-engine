export const sleep = (milliseconds: number): Promise<void> => {
  if (!(Number.isFinite(milliseconds) && milliseconds >= 0)) {
    return Promise.reject(
      new RangeError("Sleep duration must be a finite, non-negative number")
    )
  }

  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
