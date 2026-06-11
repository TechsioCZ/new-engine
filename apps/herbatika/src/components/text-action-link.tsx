import NextLink from "next/link"

type TextActionLinkProps = {
  href: string
  text?: string
}

export function TextActionLink({
  href,
  text = "Zobraziť všetky",
}: TextActionLinkProps) {
  return (
    <NextLink
      className="shrink-0 font-verdana text-fg-strong text-support leading-snug underline decoration-1 underline-offset-2 hover:text-primary"
      href={href}
    >
      {text}
    </NextLink>
  )
}
