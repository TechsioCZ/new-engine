import NextLink from "next/link"

type AuthFooterProps = {
  text: string
  href: string
  linkText: string
}

export const AuthFooter = ({ text, href, linkText }: AuthFooterProps) => (
  <div className="mt-400 border-border-secondary border-t pt-300 text-center">
    <p className="text-fg-secondary text-sm">
      {`${text} `}
      <NextLink
        className="font-medium text-primary underline-offset-4 hover:underline"
        href={href}
        onMouseDown={(event) => event.preventDefault()}
      >
        {linkText}
      </NextLink>
    </p>
  </div>
)
