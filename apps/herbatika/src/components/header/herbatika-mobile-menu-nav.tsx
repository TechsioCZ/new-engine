"use client";

import { Link } from "@techsio/ui-kit/atoms/link";
import { Accordion } from "@techsio/ui-kit/molecules/accordion";
import { Header, HeaderContext } from "@techsio/ui-kit/organisms/header";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import {
  HERBATIKA_HEADER_SUBMENU_GROUPS,
  type HerbatikaHeaderSubmenuFeaturedItemConfig,
} from "./herbatika-header.submenu-data";
import { PRIMARY_NAV_ITEMS } from "./herbatika-header.navigation";

type HerbatikaMobileMenuChildItem = {
  href: string;
  id: string;
  label: string;
};

type HerbatikaMobileMenuLinkEntry = {
  href: string;
  label: string;
  type: "link";
};

type HerbatikaMobileMenuGroupEntry = {
  href: string;
  items: readonly HerbatikaMobileMenuChildItem[];
  label: string;
  type: "group";
  value: string;
};

type HerbatikaMobileMenuEntry =
  | HerbatikaMobileMenuLinkEntry
  | HerbatikaMobileMenuGroupEntry;

const submenuGroupsByRootHandle = new Map<
  string,
  (typeof HERBATIKA_HEADER_SUBMENU_GROUPS)[number]
>(
  HERBATIKA_HEADER_SUBMENU_GROUPS.map((group) => [group.rootHandle, group]),
);

const resolveRootHandleFromHref = (href: string) => {
  if (!href.startsWith("/c/")) {
    return null;
  }

  return href.slice(3);
};

const resolveMobileChildItems = (
  featuredItems: readonly HerbatikaHeaderSubmenuFeaturedItemConfig[],
): readonly HerbatikaMobileMenuChildItem[] =>
  featuredItems.map((item) => ({
    href: `/c/${item.handle}`,
    id: item.id,
    label: item.label,
  }));

const MOBILE_MENU_ENTRIES: readonly HerbatikaMobileMenuEntry[] =
  PRIMARY_NAV_ITEMS.map((item) => {
    const rootHandle = resolveRootHandleFromHref(item.href);
    const submenuGroup = rootHandle
      ? submenuGroupsByRootHandle.get(rootHandle)
      : undefined;

    if (!submenuGroup) {
      return {
        href: item.href,
        label: item.label,
        type: "link",
      } satisfies HerbatikaMobileMenuLinkEntry;
    }

    return {
      href: item.href,
      items: resolveMobileChildItems(submenuGroup.featuredItems),
      label: item.label,
      type: "group",
      value: rootHandle ?? item.href,
    } satisfies HerbatikaMobileMenuGroupEntry;
  });

const resolveExpandedValues = (pathname: string) => {
  const activeGroup = MOBILE_MENU_ENTRIES.find(
    (entry) =>
      entry.type === "group" &&
      (pathname === entry.href ||
        entry.items.some((item) => item.href === pathname)),
  );

  if (!activeGroup || activeGroup.type !== "group") {
    return [];
  }

  return [activeGroup.value];
};

export function HerbatikaMobileMenuNav() {
  const pathname = usePathname();
  const { setIsMobileMenuOpen } = useContext(HeaderContext);
  const [expandedValues, setExpandedValues] = useState<string[]>(() =>
    resolveExpandedValues(pathname),
  );

  useEffect(() => {
    setExpandedValues(resolveExpandedValues(pathname));
  }, [pathname]);

  const handleClose = () => setIsMobileMenuOpen(false);

  return (
    <Header.Nav className="w-full min-w-0 gap-y-0">
      <Accordion
        className="w-full"
        collapsible
        data-herbatika-mobile-menu-accordion=""
        multiple={false}
        onChange={setExpandedValues}
        size="md"
        value={expandedValues}
        variant="borderless"
      >
        {MOBILE_MENU_ENTRIES.map((entry) =>
          entry.type === "group" ? (
            <Accordion.Item key={entry.href} value={entry.value}>
              <Accordion.Header>
                <Accordion.Title className="font-semibold">
                  <NextLink href={entry.href} onClick={handleClose}>{entry.label}</NextLink>
                  </Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <ul className="flex flex-col">
                  {entry.items.map((item) => (
                    <li key={item.id}>
                      <NextLink
                       // as={NextLink}
                        className="block border-border-secondary/40 hover:bg-surface hover:text-primary text-sm px-350 py-150"
                        href={item.href}
                        onClick={handleClose}
                      >
                        {item.label}
                      </NextLink>
                    </li>
                  ))}
                </ul>
              </Accordion.Content>
            </Accordion.Item>
          ) : (
            <Header.NavItem
              className="min-w-0 w-full text-md bg-primary border-border-secondary border-b hover:text-fg-reverse hover:bg-accordion-bg-hover"
              key={entry.href}
            >
              <NextLink
               // as={NextLink}
                className="block w-full min-w-0"
                href={entry.href}
                onClick={handleClose}
              >
                {entry.label}
              </NextLink>
            </Header.NavItem>
          ),
        )}
      </Accordion>
    </Header.Nav>
  );
}
