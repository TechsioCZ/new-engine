export type FlatStorefrontMessages = Readonly<Record<string, string>>

export type NestedStorefrontMessages = {
  [key: string]: NestedStorefrontMessages | string
}

const FORBIDDEN_MESSAGE_SEGMENTS = new Set([
  "__proto__",
  "constructor",
  "prototype",
])

const getMessageKeySegments = (key: string) => {
  const segments = key.split(".")

  if (
    segments.some(
      (segment) =>
        !segment.trim() || FORBIDDEN_MESSAGE_SEGMENTS.has(segment.trim())
    )
  ) {
    throw new Error(`Invalid storefront message key: ${key}`)
  }

  return segments
}

export const nestStorefrontMessages = (
  messages: FlatStorefrontMessages
): NestedStorefrontMessages => {
  const nestedMessages: NestedStorefrontMessages = {}

  for (const [key, value] of Object.entries(messages)) {
    const segments = getMessageKeySegments(key)
    let target = nestedMessages

    segments.forEach((segment, index) => {
      const isLastSegment = index === segments.length - 1
      const existingValue = Object.hasOwn(target, segment)
        ? target[segment]
        : undefined

      if (isLastSegment) {
        if (existingValue !== undefined) {
          throw new Error(`Conflicting storefront message key: ${key}`)
        }

        target[segment] = value
        return
      }

      if (typeof existingValue === "string") {
        throw new Error(`Conflicting storefront message key: ${key}`)
      }

      if (!existingValue) {
        const namespace: NestedStorefrontMessages = {}
        target[segment] = namespace
        target = namespace
        return
      }

      target = existingValue
    })
  }

  return nestedMessages
}
