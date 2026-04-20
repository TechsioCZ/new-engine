"use client";
import type { FormEvent } from "react";
import { useContext, useEffect } from "react";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Dialog } from "@techsio/ui-kit/molecules/dialog";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { HeaderContext } from "@techsio/ui-kit/organisms/header";
import NextImage from "next/image";
import NextLink from "next/link";
import { HEADER_ACTION_ITEMS } from "./herbatika-header.navigation";
import { HerbatikaMobileMenuNav } from "./herbatika-mobile-menu-nav";

type HerbatikaMobileMenuDialogProps = {
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const HEADER_DESKTOP_MEDIA_QUERY = "(min-width: 896px)";

export function HerbatikaMobileMenuDialog({
  onSearchSubmit,
}: HerbatikaMobileMenuDialogProps) {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useContext(HeaderContext);

  useEffect(() => {
    const mediaQuery = window.matchMedia(HEADER_DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [setIsMobileMenuOpen]);

  const handleClose = () => setIsMobileMenuOpen(false);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    handleClose();
    onSearchSubmit(event);
  };

  return (
    <div data-herbatika-mobile-menu-dialog-root="">
      <Dialog
        className="h-auto max-h-full overflow-hidden shadow-none"
        closeOnInteractOutside
        customTrigger
        hideCloseButton
        modal
        onOpenChange={({ open }) => setIsMobileMenuOpen(open)}
        open={isMobileMenuOpen}
        placement="top"
        portal={false}
        position="fixed"
        preventScroll
        size="full"
        trapFocus
      >
        <div className="w-full overflow-x-hidden shadow-sm">
          <div className="border-border-secondary border-b p-400">
            <SearchForm className="w-full" onSubmit={handleSearch}>
              <SearchForm.Control>
                <SearchForm.Input
                  name="q"
                  placeholder="Napíšte, čo hľadáte..."
                />
                <SearchForm.Button
                  aria-label="Hľadať"
                  className="rounded-r-none"
                  showSearchIcon
                />
              </SearchForm.Control>
            </SearchForm>
          </div>

          <HerbatikaMobileMenuNav />

          <div className="grid w-full grid-cols-1 gap-200 p-400 sm:grid-cols-2">
            {HEADER_ACTION_ITEMS.map((action) => (
              <LinkButton
                key={`mobile-action-${action.href}`}
                as={NextLink}
                className="px-300 py-400 rounded-xs h-fit text-sm font-bold bg-surface text-fg-primary"
                href={action.href}
                onClick={handleClose}
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
          </div>
        </div>
      </Dialog>
    </div>
  );
}
