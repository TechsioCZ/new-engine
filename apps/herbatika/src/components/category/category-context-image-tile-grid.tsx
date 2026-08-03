"use client"

import type { HttpTypes } from "@medusajs/types"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import type { StaticImageData } from "next/image"
import NextImage from "next/image"

import NextLink from "@/components/app-link"
import { resolveCategoryImage } from "@/lib/category-images"

export type CategoryContextImageTile = {
  href: string
  id: string
  label: string
  src?: StaticImageData
}

type CategoryContextImageTileSource = {
  handle?: string | null
  href: string
  id: string
  label: string
  parentCategoryId?: string | null
}

type BuildCategoryContextImageTilesInput = {
  categories: CategoryContextImageTileSource[]
  categoryById?: Map<string, HttpTypes.StoreProductCategory>
}

type CategoryContextImageTileGridProps = {
  tiles: CategoryContextImageTile[]
}

const DEFAULT_TILE_ICON: IconType = "token-icon-leaf"

const resolveCategoryTileImage = ({
  handle,
  label,
  parentCategoryId,
  categoryById,
}: {
  handle?: string | null
  label: string
  parentCategoryId?: string | null
  categoryById?: Map<string, HttpTypes.StoreProductCategory>
}) =>
  resolveCategoryImage({
    ...(categoryById === undefined ? {} : { categoryById }),
    ...(handle === undefined ? {} : { handle }),
    label,
    ...(parentCategoryId === undefined ? {} : { parentCategoryId }),
  })

export const buildCategoryContextImageTiles = ({
  categories,
  categoryById,
}: BuildCategoryContextImageTilesInput): CategoryContextImageTile[] => {
  const seenLabels = new Set<string>()
  const tiles: CategoryContextImageTile[] = []

  for (const category of categories) {
    const normalizedLabel = category.label.trim()
    if (!normalizedLabel) {
      continue
    }

    const dedupeKey = normalizedLabel.toLocaleLowerCase("sk")
    if (seenLabels.has(dedupeKey)) {
      continue
    }

    seenLabels.add(dedupeKey)
    const src = resolveCategoryTileImage({
      ...(categoryById === undefined ? {} : { categoryById }),
      ...(category.handle === undefined ? {} : { handle: category.handle }),
      label: normalizedLabel,
      ...(category.parentCategoryId === undefined
        ? {}
        : { parentCategoryId: category.parentCategoryId }),
    })
    tiles.push({
      href: category.href,
      id: category.id,
      label: normalizedLabel,
      ...(src === undefined ? {} : { src }),
    })
  }

  return tiles
}

export function CategoryContextImageTileGrid({
  tiles,
}: CategoryContextImageTileGridProps) {
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
              {tile.src ? (
                <NextImage
                  alt=""
                  aria-hidden="true"
                  className="h-submenu-image w-auto max-w-full object-contain"
                  src={tile.src}
                />
              ) : (
                <Icon
                  className="text-3xl text-primary"
                  icon={DEFAULT_TILE_ICON}
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
