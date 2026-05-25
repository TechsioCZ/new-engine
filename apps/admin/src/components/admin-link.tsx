import { Link as UiLink } from "@techsio/ui-kit/atoms/link"
import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { Link as RouterLink } from "react-router-dom"
import { cx } from "../utils/cx"

type RouterLinkProps = Omit<
  ComponentPropsWithoutRef<typeof RouterLink>,
  "children" | "className"
> & {
  children: ReactNode
  className?: string
}

type AnchorLinkProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "children" | "className"
> & {
  children: ReactNode
  className?: string
}

const sharedLinkClassName =
  "font-bold text-link underline decoration-border-primary underline-offset-3 hover:decoration-link focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-ring focus-visible:outline-offset-(length:--default-ring-offset)"

export function AdminTextLink({ className, ...props }: RouterLinkProps) {
  return (
    <UiLink
      as={RouterLink}
      className={cx(sharedLinkClassName, "text-xs", className)}
      {...props}
    />
  )
}

export function AdminTableLink({ className, ...props }: RouterLinkProps) {
  return (
    <UiLink
      as={RouterLink}
      className={cx(sharedLinkClassName, className)}
      {...props}
    />
  )
}

export function AdminExternalTableLink({
  className,
  ...props
}: AnchorLinkProps) {
  return (
    <UiLink
      className={cx(sharedLinkClassName, className)}
      external
      {...props}
    />
  )
}
