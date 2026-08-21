"use client"

import { Link } from "@techsio/ui-kit/atoms/link"
import { StorefrontLink } from "@/components/storefront-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"

type HerbatikaLogoProps = {
  className?: string
  imageClassName?: string
  size?: "sm" | "md" | "lg"
}

const TAGLINE_BY_MARKET: Record<Market, readonly [string, string]> = {
  cz: ["Zdraví. Krása.", "Příroda!"],
  hu: ["Egészség. Szépség.", "Természet!"],
  ro: ["Sănătate. Frumusețe.", "Natură!"],
  sk: ["Zdravie. Krása.", "Príroda!"],
}

export function HerbatikaLogo({
  className,
  imageClassName,
  size = "md",
}: HerbatikaLogoProps) {
  const marketContext = useMarketContext()
  const [taglineMuted, taglineAccent] = TAGLINE_BY_MARKET[marketContext.code]
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
      <svg
        aria-label="Herbatika"
        className={imageClasses}
        fill="none"
        height={64}
        role="img"
        viewBox="0 0 280 64"
        width={280}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="herbatikaLeafGradientA"
            x1="5"
            x2="41"
            y1="5"
            y2="41"
          >
            <stop stopColor="#62BA46" />
            <stop offset="1" stopColor="#009869" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="herbatikaLeafGradientB"
            x1="12"
            x2="34"
            y1="12"
            y2="34"
          >
            <stop stopColor="#009869" />
            <stop offset="1" stopColor="#62BA46" />
          </linearGradient>
        </defs>

        <circle cx="23" cy="23" fill="#F2FBF7" r="22" />

        <g fill="url(#herbatikaLeafGradientA)">
          <ellipse
            cx="23"
            cy="6.5"
            rx="3.2"
            ry="2.1"
            transform="rotate(-8 23 6.5)"
          />
          <ellipse
            cx="13"
            cy="9"
            rx="3.1"
            ry="2"
            transform="rotate(-32 13 9)"
          />
          <ellipse
            cx="6.5"
            cy="17"
            rx="3.1"
            ry="2"
            transform="rotate(-60 6.5 17)"
          />
          <ellipse
            cx="6.5"
            cy="29"
            rx="3.1"
            ry="2"
            transform="rotate(62 6.5 29)"
          />
          <ellipse
            cx="13"
            cy="37"
            rx="3.1"
            ry="2"
            transform="rotate(30 13 37)"
          />
          <ellipse
            cx="23"
            cy="39.5"
            rx="3.2"
            ry="2.1"
            transform="rotate(8 23 39.5)"
          />
          <ellipse
            cx="33"
            cy="37"
            rx="3.1"
            ry="2"
            transform="rotate(-30 33 37)"
          />
          <ellipse
            cx="39.5"
            cy="29"
            rx="3.1"
            ry="2"
            transform="rotate(-62 39.5 29)"
          />
          <ellipse
            cx="39.5"
            cy="17"
            rx="3.1"
            ry="2"
            transform="rotate(60 39.5 17)"
          />
          <ellipse cx="33" cy="9" rx="3.1" ry="2" transform="rotate(32 33 9)" />
        </g>

        <g fill="url(#herbatikaLeafGradientB)">
          <ellipse
            cx="23"
            cy="14"
            rx="2.7"
            ry="1.8"
            transform="rotate(-10 23 14)"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="2.7"
            ry="1.8"
            transform="rotate(-35 16 16)"
          />
          <ellipse
            cx="11.5"
            cy="22.5"
            rx="2.7"
            ry="1.8"
            transform="rotate(-68 11.5 22.5)"
          />
          <ellipse
            cx="14"
            cy="30.5"
            rx="2.7"
            ry="1.8"
            transform="rotate(30 14 30.5)"
          />
          <ellipse
            cx="22.5"
            cy="33"
            rx="2.7"
            ry="1.8"
            transform="rotate(4 22.5 33)"
          />
          <ellipse
            cx="30.5"
            cy="30.5"
            rx="2.7"
            ry="1.8"
            transform="rotate(-30 30.5 30.5)"
          />
          <ellipse
            cx="35"
            cy="22.5"
            rx="2.7"
            ry="1.8"
            transform="rotate(68 35 22.5)"
          />
          <ellipse
            cx="30"
            cy="16"
            rx="2.7"
            ry="1.8"
            transform="rotate(35 30 16)"
          />
        </g>

        <text
          fill="#3B3A3C"
          fontFamily="Verdana, Arial, sans-serif"
          fontSize="20"
          fontWeight="700"
          x="55"
          y="28"
        >
          herbatica
        </text>
        <text
          fontFamily="Open Sans, Arial, sans-serif"
          fontSize="11"
          x="55"
          y="44"
        >
          <tspan fill="#4D4D4D" fontWeight="600">
            {taglineMuted}
          </tspan>
          <tspan dx="4" fill="#009869" fontWeight="700">
            {taglineAccent}
          </tspan>
        </text>
      </svg>
    </Link>
  )
}
