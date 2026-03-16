"use client"
import { Link } from "@techsio/ui-kit/atoms/link"
import { Accordion } from "@techsio/ui-kit/molecules/accordion"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { Header, HeaderContext } from "@techsio/ui-kit/organisms/header"
import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { useContext, useEffect } from "react"
import { useHeaderNavigation } from "@/hooks/use-header-navigation"
import { useMediaQuery } from "@/hooks/use-media-query"

export const MobileMenu = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useContext(HeaderContext)
  const pathname = usePathname()
  const isDesktop = useMediaQuery("header")
  const { links, submenuItems } = useHeaderNavigation()

  useEffect(() => {
    if (isDesktop && isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
  }, [isDesktop, isMobileMenuOpen, setIsMobileMenuOpen])

  const handleClose = () => setIsMobileMenuOpen(false)

  return (
    <Header.Mobile position="left">
      <Dialog
        className="top-[7rem] max-w-xs overflow-hidden px-0 py-0"
        closeOnInteractOutside={true}
        customTrigger
        hideCloseButton
        modal={true}
        onOpenChange={({ open }) => setIsMobileMenuOpen(open)}
        open={isMobileMenuOpen}
        placement="left"
        portal={true}
        preventScroll={true}
        trapFocus={true}
      >
        <div className="flex h-full w-full flex-col py-100">
          <div className="overflow-y-auto">
            <Accordion className="w-full" variant="borderless">
              {links.map((link) => {
                const subMenu = submenuItems.find(
                  (item) => item.name === link.label
                )
                const isActive = pathname === link.href
                if (subMenu && subMenu.items.length > 0) {
                  return (
                    <Accordion.Item
                      className="border-border-secondary border-b"
                      key={link.label}
                      value={link.label}
                    >
                      <Accordion.Header
                        className="data-[active=true]:bg-overlay-light"
                        data-active={isActive}
                      >
                        <Accordion.Title className="w-full bg-transparent px-400 py-200 font-medium">
                          <Link
                            as={NextLink}
                            className="font-semibold text-sm no-underline hover:underline"
                            href={link.href}
                            onClick={handleClose}
                          >
                            {link.label}
                          </Link>
                        </Accordion.Title>
                        <Accordion.Indicator />
                      </Accordion.Header>
                      <Accordion.Content className="px-0 py-0">
                        {subMenu.items.map((subItem) => {
                          const isSubActive = pathname === subItem.href
                          return (
                            <Link
                              as={NextLink}
                              className="flex items-center gap-100 px-600 py-150 text-sm hover:bg-overlay-light data-[active=true]:bg-overlay-light"
                              data-active={isSubActive}
                              href={subItem.href}
                              key={subItem.href}
                              onClick={handleClose}
                            >
                              <span>{subItem.name}</span>
                            </Link>
                          )
                        })}
                      </Accordion.Content>
                    </Accordion.Item>
                  )
                }

                return (
                  <Link
                    as={NextLink}
                    className="block border-border-secondary border-b px-400 py-200 font-medium transition-colors hover:bg-overlay-light data-[active=true]:bg-overlay-light"
                    data-active={isActive}
                    href={link.href}
                    key={link.href}
                    onClick={handleClose}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </Accordion>
          </div>
        </div>
      </Dialog>
    </Header.Mobile>
  )
}
