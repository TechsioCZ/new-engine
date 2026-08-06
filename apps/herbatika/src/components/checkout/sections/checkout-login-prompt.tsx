import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import NextLink from "@/components/app-link"
import { buildAuthRouteHref } from "@/components/auth/auth-helpers"
import { SupportingText } from "@/components/text/supporting-text"

const CHECKOUT_LOGIN_HREF = buildAuthRouteHref("/auth/login", "/checkout/udaje")

const renderSignInLink = (chunks: ReactNode) => (
  <NextLink
    className="text-fg-secondary underline underline-offset-2 hover:text-primary"
    href={CHECKOUT_LOGIN_HREF}
  >
    {chunks}
  </NextLink>
)

export const CheckoutLoginPrompt = () => {
  const tAuth = useTranslations("auth")
  const tCheckout = useTranslations("checkout")

  return (
    <div className="flex flex-wrap items-center justify-between gap-250 rounded-sm bg-highlight px-550 py-250">
      <div className="space-y-50">
        <p className="font-medium text-base text-fg-primary">
          {tCheckout("login_prompt_title")}
        </p>
        <SupportingText className="text-fg-secondary text-xs">
          {tCheckout.rich("login_prompt_description", {
            signIn: renderSignInLink,
          })}
        </SupportingText>
      </div>
      <LinkButton
        as={NextLink}
        className="bg-button-bg-outlined-tertiary px-450 py-250 font-normal hover:bg-button-bg-outlined-tertiary-hover"
        href={CHECKOUT_LOGIN_HREF}
        size="lg"
        theme="outlined"
        variant="tertiary"
      >
        {tAuth("sign_in")}
      </LinkButton>
    </div>
  )
}
