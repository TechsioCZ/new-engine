"use client"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { HeaderContext } from "@techsio/ui-kit/organisms/header"
import NextImage from "next/image"
import { useTranslations } from "next-intl"
import { useContext, useEffect } from "react"
import { StorefrontLink } from "@/components/storefront-link"
import { useAuth } from "@/lib/storefront/auth"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { buildPath } from "@/lib/url/public-url"
import { HerbatikaMobileMenuNav } from "./herbatika-mobile-menu-nav"
import { useHerbatikaHeaderSubmenu } from "./use-herbatika-header-submenu"

const HEADER_DESKTOP_MEDIA_QUERY = "(min-width: 77.5rem)"

export function HerbatikaMobileMenuDialog({
  categoryPublicSlugsById,
}: {
  categoryPublicSlugsById?: PublicEntitySlugMap
}) {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useContext(HeaderContext)
  const { isAuthenticated } = useAuth()
  const marketContext = useMarketContext()
  const tAuth = useTranslations("auth")
  const { actionItems } = useHerbatikaHeaderSubmenu(categoryPublicSlugsById)
  const accountHref = isAuthenticated
    ? buildPath({ kind: "account" }, marketContext.code)
    : buildPath({ kind: "account", section: "login" }, marketContext.code)

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
              as={StorefrontLink}
              block
              className="bg-surface text-fg-primary hover:text-fg-reverse"
              href={accountHref}
              icon="token-icon-user"
              onClick={handleClose}
              size="md"
            >
              {isAuthenticated ? tAuth("account_label") : tAuth("sign_in")}
            </LinkButton>
          </div>

          <HerbatikaMobileMenuNav
            categoryPublicSlugsById={categoryPublicSlugsById}
          />

          <div className="grid w-full grid-cols-1 gap-200 p-400 sm:grid-cols-2">
            {actionItems.map((action) => (
              <LinkButton
                as={StorefrontLink}
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
