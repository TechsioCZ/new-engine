import NextLink from "next/link"

type AuthFooterProps = {
    text: string,
    href: string,
    linkText: string
}

export const AuthFooter = ({text, href, linkText}: AuthFooterProps) => {

    return(
        <div className="mt-400 border-t border-border-secondary pt-300 text-center">
          <p className="text-sm text-fg-secondary">
            {`${text} `}
            <NextLink
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={href}
            >
              {linkText}
            </NextLink>
          </p>
      </div>

    )
}