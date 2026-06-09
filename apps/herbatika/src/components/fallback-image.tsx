"use client";

import NextImage, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants";

type FallbackImageProps = Omit<ImageProps, "src"> & {
  fallbackSrc?: ImageProps["src"];
  src: ImageProps["src"] | null | undefined;
};

const resolveImageSrc = (
  src: FallbackImageProps["src"],
  fallbackSrc: ImageProps["src"],
) => src || fallbackSrc;

export function FallbackImage({
  fallbackSrc = FALLBACK_IMAGE_SRC,
  onError,
  src,
  ...props
}: FallbackImageProps) {
  const [imageSrc, setImageSrc] = useState<ImageProps["src"]>(
    resolveImageSrc(src, fallbackSrc),
  );

  useEffect(() => {
    setImageSrc(resolveImageSrc(src, fallbackSrc));
  }, [fallbackSrc, src]);

  const handleError: NonNullable<ImageProps["onError"]> = (event) => {
    onError?.(event);
    setImageSrc((currentImageSrc) =>
      currentImageSrc === fallbackSrc ? currentImageSrc : fallbackSrc,
    );
  };

  return <NextImage {...props} onError={handleError} src={imageSrc} />;
}
