type UrlSearchParamValue = string | number | boolean | null | undefined

/** Append encoded query state to a path produced by the storefront URL API. */
export const withUrlSearchParams = (
  pathname: string,
  values: Readonly<Record<string, UrlSearchParamValue>>
): string => {
  const url = new URL(pathname, "https://internal.invalid")

  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  return `${url.pathname}${url.search}${url.hash}`
}
