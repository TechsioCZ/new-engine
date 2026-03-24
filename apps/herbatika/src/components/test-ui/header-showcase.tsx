import NextLink from "next/link";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { Header } from "@techsio/ui-kit/organisms/header";
import { HEADER_ACTION_ITEMS, PRIMARY_NAV_ITEMS } from "@/components/header/herbatika-header.navigation";
import { HerbatikaLogo } from "@/components/herbatika-logo";
import { SupportingText } from "@/components/text/supporting-text";

const HEADER_MAPPING = [
  "Top utility row: logo + search field + phone block + account/cart actions.",
  "Green nav strip: organisms/header s vertical composition a app-level nav item content.",
  "Gift/Akcie pills: LinkButton varianta, ne nový shared component.",
  "Cart total chip: LinkButton variant='primary' + Badge counter jako app composition.",
] as const;

export function HeaderShowcase() {
  return (
    <div className="space-y-500">
      <section className="overflow-hidden rounded-md border border-border-secondary bg-surface">
        <Header className="border-none shadow-none" direction="vertical">
          <Header.Container className="mx-auto flex w-full max-w-max-w items-center gap-600 px-400 py-300 @header-desktop:px-600">
            <HerbatikaLogo className="shrink-0" size="lg" />

            <div className="hidden w-full max-w-header-search flex-1 @header-desktop:block">
              <SearchForm className="w-full">
                <SearchForm.Control className="h-750 rounded-search-form border-border-secondary bg-surface">
                  <SearchForm.Input
                    className="h-full px-500 text-md text-fg-secondary placeholder:text-fg-placeholder"
                    name="q"
                    placeholder="Napíšte, čo hľadáte..."
                  />
                  <SearchForm.Button
                    aria-label="Hľadať"
                    className="min-w-800 rounded-r-search-form rounded-l-none px-450"
                    showSearchIcon
                  />
                </SearchForm.Control>
              </SearchForm>
            </div>

            <div className="flex items-center gap-450">
              <Link
                as={NextLink}
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
              </Link>

              <Button
                aria-label="Obľúbené"
                className="text-3xl text-fg-secondary hover:text-primary"
                icon="token-icon-heart"
                size="current"
                theme="unstyled"
                type="button"
              />

              <Button
                aria-label="Účet"
                className="text-3xl text-fg-secondary hover:text-primary"
                icon="token-icon-user"
                size="current"
                theme="unstyled"
                type="button"
              />

              <div className="relative">
                <LinkButton
                  as={NextLink}
                  className="px-350 py-250 text-xl font-bold"
                  href="#"
                  icon="token-icon-cart"
                  size="sm"
                  variant="primary"
                >
                  0,00 €
                </LinkButton>
                <Badge
                  className="absolute -top-200 -right-200 min-w-500 justify-center rounded-full px-100 py-50 text-xs"
                  variant="secondary"
                >
                  0
                </Badge>
              </div>
            </div>
          </Header.Container>

          <Header.Desktop className="w-full bg-primary">
            <Header.Container className="mx-auto flex min-h-750 w-full max-w-max-w items-center justify-between gap-150 px-250 @header-desktop:px-450">
              <Header.Nav
                className="flex-nowrap gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                size="sm"
              >
                {PRIMARY_NAV_ITEMS.map((item) => (
                  <Header.NavItem className="shrink-0 px-100 py-200" key={item.href} size="sm">
                    <Link
                      as={NextLink}
                      className="whitespace-nowrap leading-none text-xs"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </Header.NavItem>
                ))}
              </Header.Nav>

              <Header.Actions className="gap-100 pl-100" size="sm">
                {HEADER_ACTION_ITEMS.map((action) => (
                  <Header.ActionItem className="p-0" key={action.href} size="sm">
                    <LinkButton
                      as={NextLink}
                      className="px-300 py-150 text-sm font-bold"
                      href={action.href}
                      icon={action.icon}
                      size="sm"
                      variant="secondary"
                    >
                      {action.label}
                    </LinkButton>
                  </Header.ActionItem>
                ))}
              </Header.Actions>
            </Header.Container>
          </Header.Desktop>
        </Header>
      </section>

      <section className="space-y-250 rounded-md border border-border-secondary bg-surface p-400">
        <div className="space-y-100">
          <h2 className="text-lg font-semibold text-fg-primary">Header mapping</h2>
          <SupportingText>
            Figma potvrzuje, že shared `Header` + `SearchForm` pokrývají hlavní
            kostru. Nejvíc app-level composition zůstává v utility bloku,
            cart chipu a doplňkových nav CTA.
          </SupportingText>
        </div>

        <div className="space-y-150">
          {HEADER_MAPPING.map((item, index) => (
            <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
              <Badge variant="secondary">{String(index + 1)}</Badge>
              <SupportingText className="text-fg-primary">{item}</SupportingText>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
