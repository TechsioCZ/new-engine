import NextLink from "next/link";
import type { StorefrontRoute } from "@/lib/route-paths";

type TextActionLinkProps = {
  href: StorefrontRoute;
  text?: string;
};

export function TextActionLink({
  href,
  text = "Zobraziť všetky",
}: TextActionLinkProps) {
  return (
    <NextLink
      className="shrink-0 font-verdana text-support leading-snug text-fg-strong underline decoration-1 underline-offset-2 hover:text-primary"
      href={href}
    >
      {text}
    </NextLink>
  );
}
