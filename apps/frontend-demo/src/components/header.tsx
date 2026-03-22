"use client"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import Link from "next/link"
import { type ComponentPropsWithoutRef, type ReactNode, useState } from "react"
import { useCart } from "@/hooks/use-cart"
import { Logo } from "./atoms/logo"
import { AuthDropdown } from "./auth/auth-dropdown"
import { CartPreview } from "./molecules/cart-preview"
import { HeaderSearch } from "./molecules/header-search"
import { type NavItem, Navigation } from "./molecules/navigation"
import { MobileMenu } from "./organisms/mobile-menu"
import { RegionSelector } from "./region-selector"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps extends ComponentPropsWithoutRef<"header"> {
  logo?: {
    text?: string
    icon?: IconType
    href?: string
  }
  navigationItems?: NavItem[]
  actions?: ReactNode
  showMobileMenu?: boolean
}

export function Header({
  logo = { text: "Logo", href: "/" },
  navigationItems = [],
  actions,
  showMobileMenu = true,
  className,
  ...props
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { cart } = useCart()
  const itemCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0

  return (
    <header
      className={`sticky top-0 z-10 bg-header-bg shadow-header-default ${className}`}
      {...props}
    >
      <div className="mx-auto max-w-header-max-w px-header-container-x lg:px-header-container-x-lg">
        <div className="flex h-header-height-lg items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href={"/"}>
              <Logo size="sm" />
            </Link>

            {/* Navigation */}
            {navigationItems.length > 0 && (
              <div className="ml-header-nav-margin hidden lg:block">
                <Navigation items={navigationItems} />
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-header-actions-gap lg:gap-header-actions-gap-lg">
            {/* Desktop utilities */}
            <div className="hidden items-center gap-2 lg:flex">
              <ThemeToggle />
            </div>

            {/* Vertical divider - desktop only */}
            <div className="hidden h-5 w-px bg-header-divider lg:block" />

            {/* Core actions - all sizes */}
            <div className="flex items-center">
              <HeaderSearch />
              {/* Cart button */}
              <Popover
                contentClassName="z-50"
                id="popover-header"
                placement="bottom-end"
                trigger={
                  <div className="relative mr-100 flex items-center">
                    <Icon
                      className="text-header-icon-size text-tertiary"
                      icon="token-icon-cart"
                    />
                    {itemCount > 0 && (
                      <Badge
                        className="-right-2 -top-2 absolute h-4 w-4 min-w-4 rounded-full text-xs"
                        variant="danger"
                      >
                        {itemCount > 99 ? "99+" : itemCount.toString()}
                      </Badge>
                    )}
                  </div>
                }
                triggerClassName="data-[state=open]:outline-none"
              >
                <CartPreview />
              </Popover>

              {/* User/Auth section */}
              <AuthDropdown />
              <RegionSelector className="hidden lg:flex" />

              {/* Custom actions */}
              {actions}

              {/* Mobile menu button */}
              {showMobileMenu && (
                <Button
                  className="inline-flex items-center justify-center rounded-header-mobile-menu p-header-mobile-menu-padding text-header-icon-size text-header-mobile-menu-text hover:bg-header-mobile-menu-hover hover:text-header-mobile-menu-text-hover focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-ring focus-visible:outline-offset-(length:--default-ring-offset) lg:hidden"
                  icon="token-icon-menu"
                  onClick={() => setIsMobileMenuOpen(true)}
                  size="sm"
                  theme="borderless"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        navigationItems={navigationItems}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </header>
  )
}
