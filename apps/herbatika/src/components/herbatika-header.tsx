"use client";

import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { Header } from "@techsio/ui-kit/organisms/header";
import NextLink from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { storefrontCartReadQueryOptions, useCart } from "@/lib/storefront/cart";
import { resolveCartTotalAmount } from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { HEADER_ACTION_ITEMS, PRIMARY_NAV_ITEMS } from "./header/herbatika-header.navigation";
import { HerbatikaAccountPopover } from "./header/herbatika-account-popover";
import { HerbatikaCartPopover } from "./header/herbatika-cart-popover";
import { HerbatikaLogo } from "./herbatika-logo";
import { resolveSearchHref } from "./search/search-query-config";

const REGION_TO_CURRENCY: Record<string, "EUR" | "CZK"> = {
  at: "EUR",
  cz: "CZK",
  sk: "EUR",
};

export function HerbatikaHeader() {
  const router = useRouter();
  const region = useRegionContext();

  const { cart, itemCount } = useCart(
    {
      autoCreate: true,
      region_id: region?.region_id,
      country_code: region?.country_code,
      enabled: Boolean(region?.region_id),
    },
    {
      queryOptions: storefrontCartReadQueryOptions,
    },
  );

  const currency = REGION_TO_CURRENCY[region?.country_code ?? ""] ?? "EUR";
  const cartTotalLabel = formatCurrencyAmount(
    resolveCartTotalAmount(cart),
    currency,
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    router.push(resolveSearchHref(formData.get("q")));
  };

  return (
    <Header direction="vertical">
      <Header.Container className="mx-auto flex max-w-max-w w-full min-w-0 items-center justify-between gap-200 px-300 py-300 sm:px-400 @header-desktop:px-600">
        <HerbatikaLogo
          className="min-w-0 shrink"
          size="lg"
        />

        <div className="hidden w-full max-w-header-search flex-1 @header-desktop:block">
          <SearchForm className="w-full" onSubmit={handleSearchSubmit}>
            <SearchForm.Control>
              <SearchForm.Input
                name="q"
                placeholder="Napíšte, čo hľadáte..."
              />
              <SearchForm.Button
                aria-label="Hľadať"
                className="rounded-none"
                showSearchIcon
              />
            </SearchForm.Control>
          </SearchForm>
        </div>

        <Header.Actions className="gap-450 @max-header-desktop:hidden">
          <NextLink
            className="inline-flex items-center gap-300 text-fg-secondary font-open-sans hover:text-fg-primary"
            href="tel:+421232112345"
          >
            <Icon className="text-2xl" icon="icon-[mdi--phone-outline]" />
            <span className="leading-snug">
              <span className="block text-md font-semibold leading-snug text-fg-primary">
                +421 2/321 123 45
              </span>
              <span className="block text-xs font-normal leading-snug text-fg-secondary">
                (Po-Pia: 09:00 - 16:00)
              </span>
            </span>
          </NextLink>

          <Button
            aria-label="Obľúbené"
            className="text-3xl text-fg-secondary hover:text-primary"
            icon="token-icon-heart"
            size="current"
            theme="unstyled"
            type="button"
          />

          <HerbatikaAccountPopover />
          <HerbatikaCartPopover
            cart={cart}
            cartTotalLabel={cartTotalLabel}
            currencyCode={currency}
            itemCount={itemCount}
          />
        </Header.Actions>

        <div className="flex shrink-0 items-center gap-150 @header-desktop:hidden">
          <div className="relative">
            <LinkButton
              as={NextLink}
              className="px-350 py-250 text-md md:text-xl font-bold"
              //className="h-750 min-h-750 max-w-900 min-w-0 overflow-hidden px-250 py-150 text-base font-semibold text-ellipsis whitespace-nowrap sm:max-w-none sm:px-350 sm:py-250 sm:text-xl"
              href="/checkout/kosik"
              icon="token-icon-cart"
              size="sm"
              variant="primary"
            >
              {cartTotalLabel}
            </LinkButton>
            <Badge
              className="absolute -top-150 -right-150 min-h-400 min-w-400 justify-center rounded-full px-100 py-0 text-xs leading-none"
              variant="secondary"
            >
              {String(itemCount)}
            </Badge>
          </div>

          <Header.Hamburger className="h-750 w-750 shrink-0 border border-border-secondary text-2xl" />
        </div>
      </Header.Container>

      <Header.Desktop className="bg-primary">
        <Header.Container className="mx-auto flex min-h-header-nav max-w-max-w items-center justify-between gap-150 px-250 @header-desktop:px-450">
          <Header.Nav
            className="flex-nowrap md:h-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            size="sm"
          >
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Header.NavItem
                className="shrink-0 h-full items-center flex"
                key={item.href}
              >
                <Link
                  as={NextLink}
                  className="whitespace-nowrap leading-none"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </Header.NavItem>
            ))}
          </Header.Nav>

          <Header.Actions className="px-200 gap-x-200" size="sm">
            {HEADER_ACTION_ITEMS.map((action) => (
                <LinkButton
                  key={action.href}
                  as={NextLink}
                  className="px-300 py-400 rounded-xs h-fit text-sm font-bold bg-surface text-fg-primary"
                  href={action.href}
                  size="sm"
                  variant="secondary"
                >
                  <NextImage
                    src={action.src}
                    alt={action.label}
                    width={24}
                    height={24}
                  />
                  {action.label}
                </LinkButton>

            ))}
          </Header.Actions>
        </Header.Container>
      </Header.Desktop>

      <Header.Mobile
        className="inset-x-0 z-20 w-full max-w-full overflow-x-hidden border-t border-border-secondary bg-primary shadow-sm"
        position="right"
      >
        <div className="border-border-secondary border-b p-400">
          <SearchForm className="w-full" onSubmit={handleSearchSubmit}>
            <SearchForm.Control>
              <SearchForm.Input
                name="q"
                placeholder="Napíšte, čo hľadáte..."
              />
              <SearchForm.Button className="rounded-r-none" aria-label="Hľadať" showSearchIcon />
            </SearchForm.Control>
          </SearchForm>
        </div>

        <Header.Nav className="w-full min-w-0 gap-y-0">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <Header.NavItem
              className="min-w-0 w-full bg-primary hover:bg-secondary border-border-secondary border-b"
              key={`mobile-${item.href}`}
            >
              <Link as={NextLink} className="block w-full min-w-0" href={item.href}>
                {item.label}
              </Link>
            </Header.NavItem>
          ))}
        </Header.Nav>

        <div className="grid w-full grid-cols-1 gap-200 p-400 sm:grid-cols-2">
          {HEADER_ACTION_ITEMS.map((action) => (
            <LinkButton
              as={NextLink}
              block
              className="min-h-750 justify-center font-bold"
              href={action.href}
              icon={action.icon}
              key={`mobile-action-${action.href}`}
              size="sm"
              variant="secondary"
            >
              {action.label}
            </LinkButton>
          ))}
        </div>
      </Header.Mobile>
    </Header>
  );
}
