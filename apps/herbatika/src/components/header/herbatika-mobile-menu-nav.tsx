"use client";

import { Accordion } from "@techsio/ui-kit/molecules/accordion";
import { Header, HeaderContext } from "@techsio/ui-kit/organisms/header";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import type { StorefrontRoute } from "@/lib/route-paths";
import { resolveCategoryHandleFromHref, routes } from "@/lib/routes";
import { PRIMARY_NAV_ITEMS } from "./herbatika-header.navigation";
import { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "./herbatika-header.submenu-data";
import { useHerbatikaHeaderSubmenu } from "./use-herbatika-header-submenu";

type HerbatikaMobileMenuChildItem = {
  href: StorefrontRoute;
  id: string;
  label: string;
};

type HerbatikaMobileMenuLinkEntry = {
  href: StorefrontRoute;
  label: string;
  type: "link";
};

type HerbatikaMobileMenuGroupEntry = {
  href: StorefrontRoute;
  items: readonly HerbatikaMobileMenuChildItem[];
  label: string;
  type: "group";
  value: string;
};

type HerbatikaMobileMenuEntry =
  | HerbatikaMobileMenuLinkEntry
  | HerbatikaMobileMenuGroupEntry;

const SUBMENU_ROOT_HANDLES = new Set<string>(
  HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS.map((group) => group.rootHandle),
);

const resolveMobileChildItems = (
  featuredItems: Array<{
    handle: string;
    id: string;
    label: string;
  }>,
): readonly HerbatikaMobileMenuChildItem[] =>
  featuredItems.map((item) => ({
    href: routes.category.detail(item.handle),
    id: item.id,
    label: item.label,
  }));

const buildMobileMenuEntries = (
  groupsByRootHandle: ReturnType<
    typeof useHerbatikaHeaderSubmenu
  >["groupsByRootHandle"],
): readonly HerbatikaMobileMenuEntry[] =>
  PRIMARY_NAV_ITEMS.map((item) => {
    const rootHandle = resolveCategoryHandleFromHref(item.href);

    if (!rootHandle || !SUBMENU_ROOT_HANDLES.has(rootHandle)) {
      return {
        href: item.href,
        label: item.label,
        type: "link",
      } satisfies HerbatikaMobileMenuLinkEntry;
    }

    const submenuGroup = groupsByRootHandle.get(rootHandle);

    return {
      href: item.href,
      items: resolveMobileChildItems(submenuGroup?.featuredItems ?? []),
      label: item.label,
      type: "group",
      value: rootHandle,
    } satisfies HerbatikaMobileMenuGroupEntry;
  });

const resolveExpandedValues = (
  pathname: string,
  mobileMenuEntries: readonly HerbatikaMobileMenuEntry[],
) => {
  const activeGroup = mobileMenuEntries.find(
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
  const { groupsByRootHandle } = useHerbatikaHeaderSubmenu();
  const mobileMenuEntries = useMemo(
    () => buildMobileMenuEntries(groupsByRootHandle),
    [groupsByRootHandle],
  );
  const [expandedValues, setExpandedValues] = useState<string[]>(() =>
    resolveExpandedValues(pathname, mobileMenuEntries),
  );

  useEffect(() => {
    setExpandedValues(resolveExpandedValues(pathname, mobileMenuEntries));
  }, [mobileMenuEntries, pathname]);

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
        {mobileMenuEntries.map((entry) =>
          entry.type === "group" ? (
            <Accordion.Item key={entry.href} value={entry.value}>
              <Accordion.Header>
                <Accordion.Title className="font-semibold">
                  <NextLink href={entry.href} onClick={handleClose}>
                    {entry.label}
                  </NextLink>
                </Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <ul className="flex flex-col">
                  {entry.items.map((item) => (
                    <li key={item.id}>
                      <NextLink
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
