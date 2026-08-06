export const assertServerOnly = (moduleName: string): void => {
  if (typeof window !== "undefined") {
    throw new Error(`${moduleName} can only be used on the server`)
  }
}
