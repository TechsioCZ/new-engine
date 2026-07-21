const LIKE_WILDCARD_REGEX = /[%_\\]/g

export const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)
