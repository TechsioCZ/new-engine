export const sleep = async (milliseconds: number): Promise<void> => {
  if (!(Number.isFinite(milliseconds) && milliseconds >= 0)) {
    throw new RangeError("Sleep duration must be a finite, non-negative number")
  }

  const { promise, resolve } = Promise.withResolvers<null>()
  setTimeout(() => {
    resolve(null)
  }, milliseconds)
  await promise
}
