"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Popover } from "@techsio/ui-kit/molecules/popover";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { StorefrontLoginForm } from "@/components/auth/storefront-login-form";
import { useStorefrontAuthController } from "@/components/auth/use-storefront-auth-controller";

export function HerbatikaAccountPopover() {
  const controller = useStorefrontAuthController({ mode: "login" });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (!controller.authQuery.isAuthenticated) {
      return;
    }

    setIsPopoverOpen(false);
  }, [controller.authQuery.isAuthenticated]);

  if (controller.authQuery.isAuthenticated) {
    return (
      <LinkButton
        aria-label="Účet"
        as={NextLink}
        className="px-0 py-0 text-3xl text-fg-secondary hover:text-primary"
        href="/account"
        icon="token-icon-user"
        size="current"
        theme="unstyled"
        variant="secondary"
      />
    );
  }

  return (
    <Popover
      contentClassName="w-[22rem] max-w-[calc(100vw-2rem)]"
      gutter={12}
      id="herbatika-login-popover"
      onOpenChange={({ open }) => setIsPopoverOpen(open)}
      open={isPopoverOpen}
      placement="bottom-end"
      shadow={false}
      title="Prihlásenie"
      trigger={
        <>
          <span className="sr-only">Prihlásenie</span>
          <Icon
            className="text-3xl text-fg-secondary hover:text-primary"
            icon="token-icon-user"
          />
        </>
      }
      triggerClassName="px-0 py-0 text-3xl hover:bg-transparent data-[state=open]:bg-transparent"
    >
      <StorefrontLoginForm
        defaultValues={controller.loginDefaultValues}
        isBusy={controller.isBusy}
        onSubmit={controller.handleLoginSubmit}
        registerHref={controller.registerHref}
      />
    </Popover>
  );
}
