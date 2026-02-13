"use client";

import { useSearchParams } from "next/navigation";
import { StorefrontAuthControls } from "@/components/storefront-auth-controls";

type StorefrontAuthPageContentProps = {
  mode: "login" | "register";
};

const resolveNextHref = (value: string | null) => {
  if (typeof value === "string") {
    return value;
  }

  return "/account";
};

export function StorefrontAuthPageContent({
  mode,
}: StorefrontAuthPageContentProps) {
  const searchParams = useSearchParams();
  const afterAuthHref = resolveNextHref(searchParams.get("next"));

  return <StorefrontAuthControls afterAuthHref={afterAuthHref} mode={mode} />;
}
