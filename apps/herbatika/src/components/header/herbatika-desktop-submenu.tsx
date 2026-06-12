"use client"

import { Link } from "@techsio/ui-kit/atoms/link"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import NextImage from "next/image"
import NextLink from "next/link"
import {
  type HerbatikaHeaderSubmenuFeaturedItem,
  useHerbatikaHeaderSubmenu,
} from "./use-herbatika-header-submenu"

type HerbatikaDesktopSubmenuProps = {
  activeRootHandle: string | null
  onClose: () => void
}

const sortDesktopSubmenuItems = (items: HerbatikaHeaderSubmenuFeaturedItem[]) =>
  [...items].sort((left, right) => {
    const childCountDifference =
      right.childItems.length - left.childItems.length

    if (childCountDifference !== 0) {
      return childCountDifference
    }

    return left.label.localeCompare(right.label, "sk")
  })

export function HerbatikaDesktopSubmenu({
  activeRootHandle,
  onClose,
}: HerbatikaDesktopSubmenuProps) {
  const { categoriesQuery, groupsByRootHandle } = useHerbatikaHeaderSubmenu()

  const activeGroup = activeRootHandle
    ? (groupsByRootHandle.get(activeRootHandle) ?? null)
    : null
  const desktopSubmenuItems = activeGroup
    ? sortDesktopSubmenuItems(activeGroup.featuredItems)
    : []

  return (
    <div className="[&_[data-part=backdrop]]:hidden [&_[data-part=positioner]]:top-full [&_[data-part=positioner]]:right-0 [&_[data-part=positioner]]:bottom-auto [&_[data-part=positioner]]:left-0 [&_[data-part=positioner]]:overflow-visible">
      <Dialog
        behavior="modeless"
        className="mx-auto h-auto max-h-[calc(100vh-8rem)] min-h-0 max-w-max-w gap-0 overflow-y-auto rounded-none border-x-1 border-x-border-secondary border-b-2 border-b-border-primary px-0 py-0 shadow-none"
        closeOnInteractOutside={false}
        customTrigger
        hideCloseButton
        modal={false}
        onOpenChange={({ open }) => {
          if (!open) {
            onClose()
          }
        }}
        open={Boolean(activeGroup)}
        placement="top"
        portal={false}
        position="absolute"
        preventScroll={false}
        size="xs"
        trapFocus={false}
      >
        {activeGroup ? (
          <div className="mx-auto w-full max-w-max-w px-550 py-500 xl:px-700">
            {categoriesQuery.isLoading ? (
              <p className="mb-400 text-fg-secondary text-sm leading-snug">
                Načítavam podkategórie…
              </p>
            ) : null}

            {categoriesQuery.error ? (
              <p className="mb-400 text-fg-secondary text-sm leading-snug">
                Podkategórie sa nepodarilo načítať.
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-x-750 gap-y-700 lg:grid-cols-3 xl:grid-cols-4">
              {desktopSubmenuItems.map((item) => (
                <div className="flex min-w-0 items-start gap-300" key={item.id}>
                  <NextLink
                    className="flex h-submenu-image w-submenu-image shrink-0 items-start justify-start"
                    href={item.href}
                  >
                    {item.src ? (
                      <NextImage
                        alt=""
                        aria-hidden="true"
                        className="object-contain"
                        height={54}
                        src={item.src}
                        width={76}
                      />
                    ) : null}
                  </NextLink>

                  <div className="min-w-0 space-y-300 pt-100">
                    <Link
                      as={NextLink}
                      className="block font-bold text-fg-primary leading-tight hover:text-primary"
                      href={item.href}
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>

                    {item.childItems.length > 0 ? (
                      <ul className="flex flex-col leading-none">
                        {item.childItems.map((childItem) => (
                          <li key={childItem.id}>
                            <Link
                              as={NextLink}
                              className="text-primary text-sm hover:text-fg-primary"
                              href={childItem.href}
                              onClick={onClose}
                            >
                              {childItem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
