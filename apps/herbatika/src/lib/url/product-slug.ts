import { MAX_SLUG_LENGTH, SlugError, slugify, validateSlug } from "./slug"

const TRAILING_SEGMENT_PATTERN = /-[^-]*$/
const TRAILING_HYPHENS_PATTERN = /-+$/

/** Build an SEO slug from a product title while respecting URLR's hard limit. */
export function slugifyProductTitle(title: string): string {
  try {
    return slugify(title)
  } catch (error) {
    if (!(error instanceof SlugError && error.reason === "too-long")) {
      throw error
    }

    const bounded = error.value.slice(0, MAX_SLUG_LENGTH)
    const wordBoundary = bounded.replace(TRAILING_SEGMENT_PATTERN, "")
    return validateSlug(
      wordBoundary || bounded.replace(TRAILING_HYPHENS_PATTERN, "")
    )
  }
}
