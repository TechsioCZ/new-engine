import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";

interface HerbatikaLogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md";
}

export function HerbatikaLogo({
  className,
  href = "/",
  size = "md",
}: HerbatikaLogoProps) {
  return (
    <Link as={NextLink} className={className} href={href}>
      <Image
        alt="Herbatika"
        className={size === "sm" ? "h-11 w-auto" : "h-13 w-auto"}
        src="/herbatika-logo.svg"
      />
    </Link>
  );
}
