"use client";

import type { ImageProps } from "next/image";
import { FallbackImage } from "@/components/fallback-image";

const BLOG_IMAGE_FALLBACK_SRC =
  "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=1200&q=80";

type BlogImageProps = Omit<ImageProps, "src"> & {
  fallbackSrc?: ImageProps["src"];
  src: ImageProps["src"] | null | undefined;
};

const isLocalPayloadMediaSrc = (src: ImageProps["src"] | null | undefined) => {
  if (typeof src !== "string") {
    return false;
  }

  try {
    const url = new URL(src);

    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname.startsWith("/api/media/file/")
    );
  } catch {
    return false;
  }
};

export function BlogImage({
  fallbackSrc = BLOG_IMAGE_FALLBACK_SRC,
  src,
  ...props
}: BlogImageProps) {
  return (
    <FallbackImage
      {...props}
      fallbackSrc={fallbackSrc}
      src={src}
      unoptimized={props.unoptimized ?? isLocalPayloadMediaSrc(src)}
    />
  );
}
