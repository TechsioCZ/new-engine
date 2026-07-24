export function definedProperties<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  ) as {
    [Key in keyof T as undefined extends T[Key] ? Key : never]?: Exclude<
      T[Key],
      undefined
    >
  } & {
    [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key]
  }
}
