"use client"

import { Link } from "@techsio/ui-kit/atoms/link"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import NextImage from "next/image"

import NextLink from "@/components/app-link"

import { useHerbatikaHeaderSubmenu } from "./use-herbatika-header-submenu"
import type { HerbatikaHeaderSubmenuFeaturedItem } from "./use-herbatika-header-submenu"

interface HerbatikaDesktopSubmenuProps {
  activeRootHandle: string | null
  onClose: () => void
}

const sortDesktopSubmenuItems = (items: HerbatikaHeaderSubmenuFeaturedItem[]) =>
  items.toSorted((left, right) => {
    const childCountDifference =
      right.childItems.length - left.childItems.length

    if (childCountDifference !== 0) {
      return childCountDifference
    }

    return left.label.localeCompare(right.label, "sk")
  })

export const HerbatikaDesktopSubmenu = ({
  activeRootHandle,
  onClose,
}: HerbatikaDesktopSubmenuProps) => {
  const tCatalog = useTranslations("catalog")
  const tNavigation = useTranslations("navigation")
  const { categoriesQuery, groupsByRootHandle } = useHerbatikaHeaderSubmenu()

  const activeGroup =
    typeof activeRootHandle === "string" && activeRootHandle !== ""
      ? (groupsByRootHandle.get(activeRootHandle) ?? null)
      : null
  const desktopSubmenuItems =
    activeGroup === null
      ? []
      : sortDesktopSubmenuItems(activeGroup.featuredItems)

  return (
    <div className="herbatika-desktop-submenu-root">
      <Dialog
        behavior="modeless"
        className="mx-auto h-auto max-h-header-submenu min-h-0 max-w-max-w gap-0 overflow-y-auto rounded-none border-x-1 border-x-border-secondary border-b-2 border-b-border-primary px-0 py-0 shadow-none"
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
        {activeGroup === null ? null : (
          <div className="mx-auto w-full max-w-max-w px-550 py-500 xl:px-700">
            {categoriesQuery.isLoading ? (
              <p className="mb-400 text-fg-secondary text-sm leading-snug">
                {tNavigation("submenu.loading")}
              </p>
            ) : null}

            {categoriesQuery.error === null ? null : (
              <p className="mb-400 text-fg-secondary text-sm leading-snug">
                {tCatalog("errors.categories_load_failed")}
              </p>
            )}

            <div className="grid grid-cols-1 gap-x-750 gap-y-700 lg:grid-cols-3 xl:grid-cols-4">
              {desktopSubmenuItems.map((item) => (
                <div className="flex min-w-0 items-start gap-300" key={item.id}>
                  <NextLink
                    className="flex h-submenu-image w-submenu-image shrink-0 items-start justify-start"
                    href={item.href}
                  >
                    {item.src === undefined ? null : (
                      <NextImage
                        alt=""
                        aria-hidden="true"
                        className="object-contain"
                        height={54}
                        src={item.src}
                        width={76}
                      />
                    )}
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
        )}
      </Dialog>
    </div>
  )
}
