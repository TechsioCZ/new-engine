export const HOMEPAGE_PRODUCTS_LIMIT = 24;
export const CATEGORY_LIST_LIMIT = 500;
export const PDP_RELATED_PRODUCTS_LIMIT = 13;

const SSR_STATIC_REVALIDATE_SECONDS = 60 * 60;
const SSR_SEMI_STATIC_REVALIDATE_SECONDS = 2 * 60;

export type SsrFetchProfile = "static" | "semiStatic";

export const SSR_FETCH_OPTIONS: Record<
  SsrFetchProfile,
  {
    cache: RequestCache;
    next: {
      revalidate: number;
    };
  }
> = {
  static: {
    cache: "force-cache",
    next: {
      revalidate: SSR_STATIC_REVALIDATE_SECONDS,
    },
  },
  semiStatic: {
    cache: "force-cache",
    next: {
      revalidate: SSR_SEMI_STATIC_REVALIDATE_SECONDS,
    },
  },
};

export const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";

export const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";
