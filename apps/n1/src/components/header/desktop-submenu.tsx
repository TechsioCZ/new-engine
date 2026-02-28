import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { Header } from "@techsio/ui-kit/organisms/header"
import Image from "next/image"
import NextLink from "next/link"
import { useRef, useState } from "react"
import { links, type SubmenuCategory, submenuItems } from "@/data/header"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { usePrefetchProducts } from "@/hooks/use-prefetch-products"

export const DesktopSubmenu = () => {
  const { delayedPrefetch, cancelPrefetch } = usePrefetchProducts()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hoverPrefetchIdsRef = useRef<Record<string, string | null>>({})

  const [activeCategory, setActiveCategory] = useState<SubmenuCategory | null>(
    null
  )

  const handleOpenSubmenu = (categoryName: string) => {
    const category = submenuItems.find((item) => item.name === categoryName)

    if (!category) {
      setDrawerOpen(false)
      return
    }

    setActiveCategory(category)
    setDrawerOpen(true)
  }

  return (
    <Header.Desktop>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover-only wrapper for submenu */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only wrapper for submenu */}
      <div className="w-full" onMouseLeave={() => setDrawerOpen(false)}>
        <Header.Container className="w-full border-highlight border-t-[1px] bg-base-dark py-0">
          <Header.Nav className="z-30 flex-wrap gap-x-0 px-0 py-0">
            {links.map((link) => (
              <NextLink
                className="group px-300 py-300 hover:bg-primary"
                href={link.href}
                key={link.href}
                prefetch={true}
              >
                <Header.NavItem
                  className="font-bold text-fg-reverse group-hover:text-black"
                  onMouseEnter={() => handleOpenSubmenu(link.label)}
                >
                  {link.label}
                </Header.NavItem>
              </NextLink>
            ))}
          </Header.Nav>
        </Header.Container>

        <Dialog
          behavior="modeless"
          className="top-full grid grid-rows-[1fr] starting:grid-rows-[0fr] bg-white shadow-none transition-all duration-500 ease-out"
          closeOnInteractOutside={true}
          customTrigger
          hideCloseButton
          modal={false}
          open={drawerOpen}
          placement="top"
          portal={false}
          position="absolute"
          preventScroll={false}
          size="xs"
          trapFocus={false}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-6 gap-200">
              {activeCategory?.items.map((item) => (
                <NextLink
                  href={item.href}
                  key={item.name}
                  onMouseEnter={() => {
                    if (!item.categoryIds?.length) {
                      hoverPrefetchIdsRef.current[item.href] = null
                      return
                    }

                    const prefetchId = delayedPrefetch(
                      item.categoryIds,
                      PREFETCH_DELAYS.CATEGORY_HOVER
                    )
                    hoverPrefetchIdsRef.current[item.href] = prefetchId
                  }}
                  onMouseLeave={() => {
                    const prefetchId = hoverPrefetchIdsRef.current[item.href]
                    if (prefetchId) {
                      cancelPrefetch(prefetchId)
                      hoverPrefetchIdsRef.current[item.href] = null
                    }
                  }}
                >
                  <Header.NavItem className="text-2xs">
                    <div className="grid h-full items-center justify-center border border-transparent hover:border-border-primary">
                      <div className="flex flex-col items-center gap-200">
                        {item.image && (
                          <Image
                            alt={item.name}
                            className="size-image-sm object-contain"
                            height={100}
                            placeholder="blur"
                            quality={50}
                            src={item.image}
                            width={100}
                          />
                        )}
                        <h3 className="font-bold text-xs">{item.name}</h3>
                      </div>
                    </div>
                  </Header.NavItem>
                </NextLink>
              ))}
            </div>
          </div>
        </Dialog>
      </div>
    </Header.Desktop>
  )
}
