import type { UrlObject } from "node:url"

import type { Route } from "next"
import NextLink from "next/link"
import type { LinkProps } from "next/link"
import type { AnchorHTMLAttributes } from "react"

import { appHref } from "@/lib/routing"

type AppLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement> & LinkProps<string>,
  "href"
> & {
  href: string | UrlObject
}

export default function AppLink({ href, ...props }: AppLinkProps) {
  const resolvedHref: Route | UrlObject =
    typeof href === "string" ? appHref(href) : href

  return <NextLink href={resolvedHref} {...props} />
}
