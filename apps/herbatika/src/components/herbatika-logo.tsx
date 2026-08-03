import { Link } from "@techsio/ui-kit/atoms/link"
import NextImage from "next/image"

import logo from "@/assets/herbatica-logo.avif"
import NextLink from "@/components/app-link"

type HerbatikaLogoProps = {
  className?: string
  href?: string
  imageClassName?: string
  size?: "sm" | "md" | "lg"
}

export function HerbatikaLogo({
  className,
  href = "/",
  imageClassName,
  size = "md",
}: HerbatikaLogoProps) {
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
    <Link as={NextLink} className={className} href={href}>
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
