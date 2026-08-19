import { StorefrontLink } from "@/components/storefront-link"

type AuthFooterProps = {
  text: string
  href: string
  linkText: string
}

export const AuthFooter = ({ text, href, linkText }: AuthFooterProps) => (
  <div className="mt-400 border-border-secondary border-t pt-300 text-center">
    <p className="text-fg-secondary text-sm">
      {`${text} `}
      <StorefrontLink
        className="font-medium text-primary underline-offset-4 hover:underline"
        href={href}
        onMouseDown={(event) => event.preventDefault()}
      >
        {linkText}
      </StorefrontLink>
    </p>
  </div>
)
