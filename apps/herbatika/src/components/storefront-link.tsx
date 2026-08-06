import NextLink from "next/link"
import type { ComponentPropsWithoutRef } from "react"

export type StorefrontLinkProps = Omit<
  ComponentPropsWithoutRef<typeof NextLink>,
  "href"
> & { href: string }

/** Client navigation for canonical public App Router destinations. */
export function StorefrontLink({
  children,
  href,
  ...props
}: StorefrontLinkProps) {
  return (
    <NextLink {...props} href={href}>
      {children}
    </NextLink>
  )
}
