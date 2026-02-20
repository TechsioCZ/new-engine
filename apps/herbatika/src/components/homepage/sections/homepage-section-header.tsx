import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import type { IconType } from "@techsio/ui-kit/atoms/icon";
import NextLink from "next/link";

type HomepageSectionHeaderProps = {
  title: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaIcon?: IconType;
};

export function HomepageSectionHeader({
  title,
  subtitle,
  ctaHref,
  ctaLabel,
  ctaIcon = "icon-[mdi--arrow-right]",
}: HomepageSectionHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-400">
      <div>
        <h2 className="text-2xl font-bold text-fg-primary">{title}</h2>
        {subtitle ? <p className="mt-100 text-sm text-fg-secondary">{subtitle}</p> : null}
      </div>
      {ctaHref && ctaLabel ? (
        <LinkButton
          as={NextLink}
          className="hidden rounded-md px-400 py-200 text-sm font-semibold md:inline-flex"
          href={ctaHref}
          icon={ctaIcon}
          iconPosition="right"
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          {ctaLabel}
        </LinkButton>
      ) : null}
    </header>
  );
}
