const LOGIN_REDIRECT_QUERY_PARAM = "redirect"
const DEFAULT_LOGIN_REDIRECT_PATH = "/ucet/profil"

export function buildLoginHref(pathname: string, search = ""): string {
  const redirectPath = search ? `${pathname}?${search}` : pathname
  const params = new URLSearchParams({
    [LOGIN_REDIRECT_QUERY_PARAM]: redirectPath,
  })

  return `/prihlaseni?${params.toString()}`
}

export function resolveLoginRedirectPath(redirectPath: string | null): string {
  if (!redirectPath?.startsWith("/") || redirectPath.startsWith("//")) {
    return DEFAULT_LOGIN_REDIRECT_PATH
  }

  return redirectPath
}
