"use client"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { HeaderContext } from "@techsio/ui-kit/organisms/header"
import NextImage from "next/image"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import { useContext, useEffect } from "react"
import { useAuth } from "@/lib/storefront/auth"
import { HEADER_ACTION_ITEMS } from "./herbatika-header.navigation"
import { HerbatikaMobileMenuNav } from "./herbatika-mobile-menu-nav"

const HEADER_DESKTOP_MEDIA_QUERY = "(min-width: 77.5rem)"

export function HerbatikaMobileMenuDialog() {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useContext(HeaderContext)
  const { isAuthenticated } = useAuth()
  const tAuth = useTranslations("auth")

  useEffect(() => {
    const mediaQuery = window.matchMedia(HEADER_DESKTOP_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setIsMobileMenuOpen(false)
      }
    }

    handleChange(mediaQuery)
    mediaQuery.addEventListener("change", handleChange)

    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [setIsMobileMenuOpen])

  const handleClose = () => setIsMobileMenuOpen(false)

  return (
    <div data-herbatika-mobile-menu-dialog-root="">
      <Dialog
        className="-top-1 h-auto max-h-full overflow-hidden shadow-none"
        closeOnInteractOutside
        customTrigger
        hideCloseButton
        modal
        onOpenChange={({ open }) => setIsMobileMenuOpen(open)}
        open={isMobileMenuOpen}
        placement="top"
        portal={false}
        position="fixed"
        preventScroll={false}
        size="full"
        trapFocus
      >
        <div className="w-full overflow-x-hidden shadow-sm">
          <div className="border-border-secondary border-b p-400">
            <LinkButton
              as={NextLink}
              block
              href={isAuthenticated ? "/account" : "/auth/login"}
              icon="token-icon-user"
              onClick={handleClose}
              size="md"
              className="bg-surface text-fg-primary hover:text-fg-reverse"
            >
              {isAuthenticated ? tAuth("account_label") : tAuth("sign_in")}
            </LinkButton>
          </div>

          <HerbatikaMobileMenuNav />

          <div className="grid w-full grid-cols-1 gap-200 p-400 sm:grid-cols-2">
            {HEADER_ACTION_ITEMS.map((action) => (
              <LinkButton
                as={NextLink}
                className="h-fit rounded-xs bg-surface px-300 py-400 font-bold text-fg-primary text-sm hover:bg-highlight"
                href={action.href}
                key={`mobile-action-${action.href}`}
                onClick={handleClose}
                size="sm"
                variant="secondary"
              >
                <NextImage
                  alt={action.label}
                  height={24}
                  src={action.src}
                  width={24}
                />
                {action.label}
              </LinkButton>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
