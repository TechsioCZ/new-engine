"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Popover } from "@techsio/ui-kit/molecules/popover";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { useAuthController } from "@/components/auth/use-auth-controller";

export function HerbatikaAccountPopover() {
  const controller = useAuthController({ mode: "login" });
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
        className="px-0 py-0 text-icon-2xl text-fg-secondary hover:text-primary"
        href="/account"
        icon="token-icon-user"
        size="current"
        theme="unstyled"
        variant="secondary"
      />
    );
  }

  return (
    <Popover.Root
      gutter={12}
      id="herbatika-login-popover"
      onOpenChange={({ open }) => setIsPopoverOpen(open)}
      open={isPopoverOpen}
      placement="bottom-end"
      shadow={false}
    >
      <Popover.Trigger className="px-0 py-0 text-3xl hover:bg-transparent data-[state=open]:bg-transparent">
        <span className="sr-only">Prihlásenie</span>
        <Icon
          className="text-3xl text-fg-secondary hover:text-primary"
          icon="token-icon-user"
        />
      </Popover.Trigger>

      <Popover.Positioner>
        <Popover.Content className="w-[22rem] max-w-[calc(100vw-2rem)]">
          <Popover.Arrow />
          <Popover.Title>Prihlásenie</Popover.Title>
          <LoginForm
            defaultValues={controller.loginDefaultValues}
            isBusy={controller.isBusy}
            onSubmit={controller.handleLoginSubmit}
            registerHref={controller.registerHref}
            forgotPasswordHref={controller.forgotPasswordHref}
          />
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
