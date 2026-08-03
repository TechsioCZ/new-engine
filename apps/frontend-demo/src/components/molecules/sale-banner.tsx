import { Image } from "@techsio/ui-kit/atoms/image"
import type { Route } from "next"
import Link from "next/link"

interface SaleBannerProps {
  title: string
  subtitle: string
  backgroundImage: string
  linkText: string
  linkHref: Route
}

export function SaleBanner({
  title,
  subtitle,
  backgroundImage,
  linkText,
  linkHref,
}: SaleBannerProps) {
  return (
    <section className="py-banner-section-y">
      <div className="mx-auto max-w-banner-max-w px-banner-container-x">
        <div className="relative overflow-hidden rounded-banner-radius bg-banner-bg">
          <div className="absolute inset-0">
            <Image
              alt="Sale banner"
              className="h-full w-full object-cover opacity-banner-image-opacity brightness-60"
              src={backgroundImage}
            />
          </div>
          <div className="relative flex flex-col items-center gap-banner-content-gap px-banner-content-x py-banner-content-y text-center text-banner-text md:px-banner-content-x-md md:py-banner-content-y-md">
            <h2 className="font-bold text-banner-title-size md:text-banner-title-size-md">
              {title}
            </h2>
            <p className="text-banner-subtitle text-banner-subtitle-size">
              {subtitle}
            </p>
            <Link
              className="inline-block rounded-banner-button-radius bg-banner-button-bg px-banner-button-x py-banner-button-y font-medium text-banner-button-text transition-colors hover:bg-banner-button-hover"
              href={linkHref}
            >
              {linkText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
