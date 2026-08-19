"use client"

import { Link } from "@techsio/ui-kit/atoms/link"
import NextImage from "next/image"
import logo from "@/assets/herbatica-logo.avif"
import { StorefrontLink } from "@/components/storefront-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"

type HerbatikaLogoProps = {
  className?: string
  imageClassName?: string
  size?: "sm" | "md" | "lg"
}

export function HerbatikaLogo({
  className,
  imageClassName,
  size = "md",
}: HerbatikaLogoProps) {
  const marketContext = useMarketContext()
  let sizeClass = "h-13 w-auto"
  if (size === "sm") {
    sizeClass = "h-11 w-auto"
  } else if (size === "lg") {
    sizeClass = "h-header-logo w-auto"
  }
  const imageClasses = imageClassName
    ? `${sizeClass} ${imageClassName}`
    : sizeClass

  return (
    <Link
      as={StorefrontLink}
      className={className}
      href={buildPath({ kind: "home" }, marketContext.code)}
    >
      <NextImage
        alt="Herbatika"
        className={imageClasses}
        height={64}
        quality={50}
        src={logo}
        width={280}
      />
    </Link>
  )
}
