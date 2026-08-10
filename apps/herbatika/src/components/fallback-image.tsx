"use client"

import NextImage from "next/image"
import type { ImageProps } from "next/image"
import { useState } from "react"

import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"

type FallbackImageProps = Omit<ImageProps, "src"> & {
  fallbackSrc?: ImageProps["src"]
  src: ImageProps["src"] | null | undefined
}

const resolveImageSrc = (
  src: FallbackImageProps["src"],
  fallbackSrc: ImageProps["src"],
) => src ?? fallbackSrc

export const FallbackImage = ({
  fallbackSrc = FALLBACK_IMAGE_SRC,
  onError,
  src,
  ...props
}: FallbackImageProps) => {
  const resolvedSrc = resolveImageSrc(src, fallbackSrc)
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null)
  const imageSrc = failedSrc === resolvedSrc ? fallbackSrc : resolvedSrc

  const handleError: NonNullable<ImageProps["onError"]> = (event) => {
    onError?.(event)
    setFailedSrc(resolvedSrc)
  }

  return <NextImage {...props} onError={handleError} src={imageSrc} />
}
