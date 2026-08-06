import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StorefrontLink } from "@/components/storefront-link"
import { useTranslations } from "next-intl"
import { buildAuthRouteHref } from "@/components/auth/auth-helpers"
import { buildCheckoutUrl } from "@/lib/url/builder"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { SupportingText } from "@/components/text/supporting-text"

export function CheckoutLoginPrompt() {
  const market = useMarketContext().code
  const loginHref = buildAuthRouteHref(
    market,
    "account.login",
    buildCheckoutUrl(market, "checkout.contact")
  )
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
              <StorefrontLink
                className="text-fg-secondary underline underline-offset-2 hover:text-primary"
                href={loginHref}
              >
                {chunks}
              </StorefrontLink>
            ),
          })}
        </SupportingText>
      </div>
      <LinkButton
        as={StorefrontLink}
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
