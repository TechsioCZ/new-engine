import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";

interface HerbatikaLogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function HerbatikaLogo({
  className,
  href = "/",
  size = "md",
}: HerbatikaLogoProps) {
  const sizeClass =
    size === "sm" ? "h-11 w-auto" : size === "lg" ? "h-[4.5rem] w-auto" : "h-13 w-auto";

  return (
    <Link as={NextLink} className={className} href={href}>
      <Image
        alt="Herbatika"
        className={sizeClass}
        src="/herbatika-logo.svg"
      />
    </Link>
  );
}
