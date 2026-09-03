import { useTranslations } from "next-intl"

export type LocalizedPageErrorSurface =
  | "account"
  | "advice"
  | "authentication"
  | "cart"
  | "catalog"
  | "checkout"
  | "content"
  | "order"
  | "review"
  | "search"
  | "storefront"

const pageErrorMessage = (
  surface: LocalizedPageErrorSurface,
  tNavigation: ReturnType<typeof useTranslations<"navigation">>
) => {
  switch (surface) {
    case "account":
      return tNavigation("page_errors.account")
    case "advice":
      return tNavigation("page_errors.advice")
    case "authentication":
      return tNavigation("page_errors.authentication")
    case "cart":
      return tNavigation("page_errors.cart")
    case "catalog":
      return tNavigation("page_errors.catalog")
    case "checkout":
      return tNavigation("page_errors.checkout")
    case "content":
      return tNavigation("page_errors.content")
    case "order":
      return tNavigation("page_errors.order")
    case "review":
      return tNavigation("page_errors.review")
    case "search":
      return tNavigation("page_errors.search")
    case "storefront":
      return tNavigation("page_errors.storefront")
    default:
      return surface satisfies never
  }
}

export function LocalizedPageError({
  status,
  surface,
}: {
  status: number
  surface: LocalizedPageErrorSurface
}) {
  const tNavigation = useTranslations("navigation")

  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-max-w p-500"
      data-status={status}
      role="alert"
    >
      <h1 className="font-bold text-3xl">{status}</h1>
      <p>{pageErrorMessage(surface, tNavigation)}</p>
    </main>
  )
}
