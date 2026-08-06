export interface StorefrontBrand {
  id: string
  title: string
  handle: string
  slug: string
  facetId: string
}

export interface StorefrontBrandGroup {
  letter: string
  brands: StorefrontBrand[]
}

interface RawStorefrontBrandInput {
  id?: string | null
  title?: string | null
  handle?: string | null
}

const BRAND_FACET_PREFIX = "brand-"
const NUMERIC_BRAND_GROUP = "0-9"
const DIGIT_CHARACTER_PATTERN = /^\d$/u
const LATIN_UPPERCASE_CHARACTER_PATTERN = /^[A-Z]$/u
const BRAND_GROUP_ORDER = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  NUMERIC_BRAND_GROUP,
] as const

const brandCollator = new Intl.Collator("sk", {
  numeric: true,
  sensitivity: "base",
})

export const createBrandSlug = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")

export const createBrandHref = (brand: Pick<StorefrontBrand, "slug">) =>
  `/znacka/${brand.slug}`

const createBrandFacetId = (value: string) =>
  `${BRAND_FACET_PREFIX}${createBrandSlug(value)}`

export const normalizeStorefrontBrand = (
  input: RawStorefrontBrandInput,
): StorefrontBrand | null => {
  const title = input.title?.trim()

  if (input.id === null || input.id === undefined) {
    return null
  }
  if (input.id.length === 0) {
    return null
  }
  if (title === undefined || title.length === 0) {
    return null
  }

  const handle = input.handle?.trim() ?? title
  const slug = createBrandSlug(handle)

  if (slug.length === 0) {
    return null
  }

  return {
    facetId: createBrandFacetId(handle),
    handle,
    id: input.id,
    slug,
    title,
  }
}

export const resolveBrandBySlug = (brands: StorefrontBrand[], slug: string) => {
  const normalizedSlug = createBrandSlug(slug)
  const canonicalBrand =
    brands.find((brand) => brand.slug === normalizedSlug) ?? null

  if (canonicalBrand) {
    return canonicalBrand
  }

  return (
    brands.find((brand) => createBrandSlug(brand.title) === normalizedSlug) ??
    null
  )
}

const resolveBrandGroupLetter = (brand: StorefrontBrand) => {
  const firstCharacter = createBrandSlug(brand.title).charAt(0).toUpperCase()

  if (DIGIT_CHARACTER_PATTERN.test(firstCharacter)) {
    return NUMERIC_BRAND_GROUP
  }

  if (LATIN_UPPERCASE_CHARACTER_PATTERN.test(firstCharacter)) {
    return firstCharacter
  }

  return NUMERIC_BRAND_GROUP
}

export const groupStorefrontBrands = (
  brands: StorefrontBrand[],
): StorefrontBrandGroup[] => {
  const groupsByLetter = new Map<string, StorefrontBrand[]>()

  for (const brand of brands) {
    const letter = resolveBrandGroupLetter(brand)
    groupsByLetter.set(letter, [...(groupsByLetter.get(letter) ?? []), brand])
  }

  return BRAND_GROUP_ORDER.flatMap((letter) => {
    const groupBrands = groupsByLetter.get(letter)

    if (!groupBrands || groupBrands.length === 0) {
      return []
    }

    return [
      {
        brands: [...groupBrands].toSorted((left, right) =>
          brandCollator.compare(left.title, right.title),
        ),
        letter,
      },
    ]
  })
}
