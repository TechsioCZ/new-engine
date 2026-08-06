"use client"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Image from "next/image"
import type { StaticImageData } from "next/image"
import Link from "next/link"

interface HeroProps {
  title: string
  subtitle?: string
  backgroundImage: string | StaticImageData
  primaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

export const Hero = ({
  title,
  subtitle,
  backgroundImage,
  primaryAction,
  secondaryAction,
}: HeroProps) => (
  <section className="relative h-hero-height overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0">
      <Image
        alt="Pozadí hero sekce"
        className="h-full w-full object-cover"
        fill
        sizes="100vw"
        placeholder="blur"
        priority
        src={backgroundImage}
      />
      <div className="absolute inset-0 bg-hero-overlay" />
    </div>

    {/* Content */}
    <div className="relative flex h-full items-center">
      <div className="mx-auto w-full max-w-hero-max-w px-hero-container-x sm:px-hero-container-x-sm lg:px-hero-container-x-lg">
        <div className="flex w-full max-w-hero-content-max-w flex-col gap-hero-content-gap">
          <h1 className="font-hero-title text-hero-fg text-hero-title-size tracking-tight sm:text-hero-title-size-sm md:text-hero-title-size-md">
            {title}
          </h1>
          {subtitle !== undefined && (
            <p className="max-w-hero-subtitle-max-w text-hero-fg text-hero-subtitle-size">
              {subtitle}
            </p>
          )}
          {(primaryAction !== undefined || secondaryAction !== undefined) && (
            <div className="flex w-fit flex-col gap-hero-button-gap md:flex-row">
              {primaryAction !== undefined && (
                <LinkButton
                  as={Link}
                  className="h-fit py-xs lg:px-hero-button-x lg:py-hero-button-y"
                  href="/products"
                  size="lg"
                  theme="solid"
                  variant="primary"
                >
                  {primaryAction.label}
                </LinkButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </section>
)
