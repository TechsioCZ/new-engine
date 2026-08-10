"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import type { StaticImageData } from "next/image"
import NextImage from "next/image"

import NextLink from "@/components/app-link"

export interface CategoryContextImageTile {
  href: string
  id: string
  label: string
  src?: StaticImageData
}

interface CategoryContextImageTileGridProps {
  tiles: CategoryContextImageTile[]
}

const DEFAULT_TILE_ICON: IconType = "token-icon-leaf"

export const CategoryContextImageTileGrid = ({
  tiles,
}: CategoryContextImageTileGridProps) => {
  if (tiles.length === 0) {
    return null
  }

  return (
    <ul className="grid gap-400 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.id}>
          <Link
            as={NextLink}
            className="group flex items-center gap-300 rounded-lg border border-border-secondary bg-surface px-450 py-200 text-fg-primary shadow-sm transition-colors hover:border-primary/30"
            href={tile.href}
          >
            <span className="flex w-850 shrink-0 items-center justify-center">
              {tile.src === undefined ? (
                <Icon
                  className="text-3xl text-primary"
                  icon={DEFAULT_TILE_ICON}
                />
              ) : (
                <NextImage
                  alt=""
                  aria-hidden="true"
                  className="h-submenu-image w-auto max-w-full object-contain"
                  src={tile.src}
                />
              )}
            </span>
            <span className="font-medium text-fg-primary text-md leading-tight">
              {tile.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
