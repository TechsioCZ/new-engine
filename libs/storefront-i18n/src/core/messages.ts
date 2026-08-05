export type FlatStorefrontMessages = Readonly<Record<string, string>>

export interface NestedStorefrontMessages {
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

const getOrCreateMessageNamespace = (
  target: NestedStorefrontMessages,
  segment: string,
  key: string
): NestedStorefrontMessages => {
  const existingValue = Object.hasOwn(target, segment)
    ? target[segment]
    : undefined

  if (typeof existingValue === "string") {
    throw new TypeError(`Conflicting storefront message key: ${key}`)
  }

  if (existingValue) {
    return existingValue
  }

  const namespace: NestedStorefrontMessages = {}
  target[segment] = namespace
  return namespace
}

export const nestStorefrontMessages = (
  messages: FlatStorefrontMessages
): NestedStorefrontMessages => {
  const nestedMessages: NestedStorefrontMessages = {}

  for (const [key, value] of Object.entries(messages)) {
    const segments = getMessageKeySegments(key)
    let target = nestedMessages

    for (const segment of segments.slice(0, -1)) {
      target = getOrCreateMessageNamespace(target, segment, key)
    }

    const lastSegment = segments.at(-1) as string
    if (Object.hasOwn(target, lastSegment)) {
      throw new Error(`Conflicting storefront message key: ${key}`)
    }

    target[lastSegment] = value
  }

  return nestedMessages
}
