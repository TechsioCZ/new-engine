import { useTranslations } from "next-intl"
import { StorefrontLink } from "@/components/storefront-link"

type TextActionLinkProps = {
  href: string
  text?: string
}

export function TextActionLink({ href, text }: TextActionLinkProps) {
  const tContent = useTranslations("content")

  return (
    <StorefrontLink
      className="shrink-0 font-verdana text-fg-strong text-support leading-snug underline decoration-1 underline-offset-2 hover:text-primary"
      href={href}
    >
      {text ?? tContent("actions.view_all")}
    </StorefrontLink>
  )
}
