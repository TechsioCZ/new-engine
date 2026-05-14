import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { SupportingText } from "@/components/text/supporting-text";
import { routes } from "@/lib/routes";

export function CheckoutLoginPrompt() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-250 rounded-sm bg-highlight p-300">
      <div className="space-y-50">
        <p className="text-base font-medium text-fg-primary">
          Už máte v Herbatica účet?
        </p>
        <SupportingText className="text-fg-secondary">
          Prihláste sa pre rýchly nákup a zľavu na ďalšie nákupy
        </SupportingText>
      </div>
      <LinkButton
        as={NextLink}
        className="rounded-button-outlined-tertiary bg-button-bg-outlined-tertiary font-normal hover:bg-button-bg-outlined-tertiary-hover"
        href={routes.account.index}
        size="md"
        theme="outlined"
        variant="tertiary"
      >
        Prihlásiť sa
      </LinkButton>
    </div>
  );
}
