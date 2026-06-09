export type StorefrontBrand = {
  id: string;
  title: string;
  handle: string;
  slug: string;
  facetId: string;
};

export type StorefrontBrandGroup = {
  letter: string;
  brands: StorefrontBrand[];
};

type RawStorefrontBrandInput = {
  id?: string | null;
  title?: string | null;
  handle?: string | null;
};

const BRAND_FACET_PREFIX = "brand-";
const NUMERIC_BRAND_GROUP = "0-9";
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
] as const;

const brandCollator = new Intl.Collator("sk", {
  numeric: true,
  sensitivity: "base",
});

export const createBrandSlug = (value: string): string => {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
};

export const createBrandHref = (brand: Pick<StorefrontBrand, "slug">) =>
  `/znacka/${brand.slug}`;

export const createBrandFacetId = (value: string) =>
  `${BRAND_FACET_PREFIX}${createBrandSlug(value)}`;

export const normalizeStorefrontBrand = (
  input: RawStorefrontBrandInput,
): StorefrontBrand | null => {
  const title = input.title?.trim();

  if (!input.id || !title) {
    return null;
  }

  const handle = input.handle?.trim() || title;
  const slug = createBrandSlug(handle);

  if (!slug) {
    return null;
  }

  return {
    id: input.id,
    title,
    handle,
    slug,
    facetId: createBrandFacetId(handle),
  };
};

export const resolveBrandBySlug = (
  brands: StorefrontBrand[],
  slug: string,
) => {
  const normalizedSlug = createBrandSlug(slug);
  const canonicalBrand =
    brands.find((brand) => brand.slug === normalizedSlug) ?? null;

  if (canonicalBrand) {
    return canonicalBrand;
  }

  return (
    brands.find((brand) => createBrandSlug(brand.title) === normalizedSlug) ??
    null
  );
};

const resolveBrandGroupLetter = (brand: StorefrontBrand) => {
  const firstCharacter = createBrandSlug(brand.title).charAt(0).toUpperCase();

  if (/^\d$/.test(firstCharacter)) {
    return NUMERIC_BRAND_GROUP;
  }

  if (/^[A-Z]$/.test(firstCharacter)) {
    return firstCharacter;
  }

  return NUMERIC_BRAND_GROUP;
};

export const groupStorefrontBrands = (
  brands: StorefrontBrand[],
): StorefrontBrandGroup[] => {
  const groupsByLetter = new Map<string, StorefrontBrand[]>();

  for (const brand of brands) {
    const letter = resolveBrandGroupLetter(brand);
    groupsByLetter.set(letter, [...(groupsByLetter.get(letter) ?? []), brand]);
  }

  return BRAND_GROUP_ORDER.flatMap((letter) => {
    const groupBrands = groupsByLetter.get(letter);

    if (!groupBrands || groupBrands.length === 0) {
      return [];
    }

    return [
      {
        letter,
        brands: [...groupBrands].sort((left, right) =>
          brandCollator.compare(left.title, right.title),
        ),
      },
    ];
  });
};
