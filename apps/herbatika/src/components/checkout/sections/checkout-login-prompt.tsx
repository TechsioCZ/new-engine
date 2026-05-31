import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { buildAuthRouteHref } from "@/components/auth/auth-helpers";
import { SupportingText } from "@/components/text/supporting-text";

export function CheckoutLoginPrompt() {
  const loginHref = buildAuthRouteHref("/auth/login", "/checkout/udaje");

  return (
    <div className="flex flex-wrap items-center justify-between gap-250 rounded-sm bg-highlight py-250 px-550">
      <div className="space-y-50">
        <p className="text-base font-medium text-fg-primary">
          Už máte v Herbatica účet?
        </p>
        <SupportingText className="text-xs text-fg-secondary">
          <NextLink
            className="text-fg-secondary underline underline-offset-2 hover:text-primary"
            href={loginHref}
          >
            Prihláste sa
          </NextLink>{" "}
          pre rýchly nákup a zľavu na ďalšie nákupy.
        </SupportingText>
      </div>
      <LinkButton
        as={NextLink}
        className="bg-button-bg-outlined-tertiary py-250 px-450 font-normal hover:bg-button-bg-outlined-tertiary-hover"
        href={loginHref}
        size="lg"
        theme="outlined"
        variant="tertiary"
      >
        Prihlásiť sa
      </LinkButton>
    </div>
  );
}
