import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import { buildAuthRouteHref } from "@/components/auth/auth-helpers"
import { SupportingText } from "@/components/text/supporting-text"

export function CheckoutLoginPrompt() {
  const loginHref = buildAuthRouteHref("/auth/login", "/checkout/udaje")
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
            signIn: (chunks) => (
              <NextLink
                className="text-fg-secondary underline underline-offset-2 hover:text-primary"
                href={loginHref}
              >
                {chunks}
              </NextLink>
            ),
          })}
        </SupportingText>
      </div>
      <LinkButton
        as={NextLink}
        className="bg-button-bg-outlined-tertiary px-450 py-250 font-normal hover:bg-button-bg-outlined-tertiary-hover"
        href={loginHref}
        size="lg"
        theme="outlined"
        variant="tertiary"
      >
        {tAuth("sign_in")}
      </LinkButton>
    </div>
  )
}
