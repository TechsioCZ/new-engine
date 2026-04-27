import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";
import NextImage from "next/image";
import logo from "@/assets/herbatica-logo.avif";

interface HerbatikaLogoProps {
  className?: string;
  href?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function HerbatikaLogo({
  className,
  href = "/",
  imageClassName,
  size = "md",
}: HerbatikaLogoProps) {
  const sizeClass =
    size === "sm" ? "h-11 w-auto" : size === "lg" ? "h-header-logo w-auto" : "h-13 w-auto";
  const imageClasses = imageClassName ? `${sizeClass} ${imageClassName}` : sizeClass;

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
  );
}
