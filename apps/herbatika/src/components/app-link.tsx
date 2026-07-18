import type { UrlObject } from "url"

import type { Route } from "next"
import NextLink, { type LinkProps } from "next/link"
import type { AnchorHTMLAttributes } from "react"

import { appHref } from "@/lib/routing"

type AppLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement> & LinkProps<string>,
  "href"
> & {
  href: string | UrlObject
}

export default function AppLink({ href, ...props }: AppLinkProps) {
  const resolvedHref: Route<string> | UrlObject =
    typeof href === "string" ? appHref(href) : href

  return <NextLink href={resolvedHref} {...props} />
}
