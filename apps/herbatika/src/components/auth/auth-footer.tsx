import NextLink from "next/link";
import type { StorefrontRoute } from "@/lib/route-paths";

type AuthFooterProps = {
  text: string;
  href: StorefrontRoute;
  linkText: string;
};

export const AuthFooter = ({ text, href, linkText }: AuthFooterProps) => {
  return (
    <div className="mt-400 border-t border-border-secondary pt-300 text-center">
      <p className="text-sm text-fg-secondary">
        {`${text} `}
        <NextLink
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={href}
          onMouseDown={(event) => event.preventDefault()}
        >
          {linkText}
        </NextLink>
      </p>
    </div>
  );
};
