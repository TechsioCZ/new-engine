import NextLink from "next/link"
import { useTranslations } from "next-intl"

type TextActionLinkProps = {
  href: string
  text?: string
}

export function TextActionLink({
  href,
  text,
}: TextActionLinkProps) {
  const tContent = useTranslations("content")

  return (
    <NextLink
      className="shrink-0 font-verdana text-fg-strong text-support leading-snug underline decoration-1 underline-offset-2 hover:text-primary"
      href={href}
    >
      {text ?? tContent("actions.view_all")}
    </NextLink>
  )
}
