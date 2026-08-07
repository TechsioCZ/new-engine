// jsdom does not implement CSS.escape, which Zag uses to query generated ids.
const escapeCssIdentifier = (value: string): string =>
  value.replaceAll(/[^a-zA-Z0-9_-]/gu, (character) => `\\${character}`)

if (globalThis.CSS === undefined) {
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: escapeCssIdentifier },
  })
} else {
  globalThis.CSS.escape ??= escapeCssIdentifier
}
