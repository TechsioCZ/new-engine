import {
  compactRecord,
  isRecord as isPlainRecord,
  omitKeys,
  toPlainRecord,
} from "@techsio/std/object"

export { compactRecord, isPlainRecord, omitKeys, toPlainRecord }

type OmitUndefined<T extends object> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<
    T[K],
    undefined
  >
}

export const omitUndefined = <T extends object>(value: T): OmitUndefined<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as OmitUndefined<T>
