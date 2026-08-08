"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { useTranslations } from "next-intl"
import { useState } from "react"

import NextLink from "@/components/app-link"
import { LoginForm } from "@/components/auth/login-form"
import { useAuthController } from "@/components/auth/use-auth-controller"

type AuthController = ReturnType<typeof useAuthController>

interface LoginAccountPopoverProps {
  controller: AuthController
  title: string
}

const LoginAccountPopover = ({
  controller,
  title,
}: LoginAccountPopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  return (
    <Popover.Root
      gutter={12}
      id="herbatika-login-popover"
      onOpenChange={({ open }) => {
        setIsPopoverOpen(open)
      }}
      open={isPopoverOpen}
      placement="bottom-end"
      shadow={false}
    >
      <Popover.Trigger className="px-0 py-0 text-3xl hover:bg-transparent data-[state=open]:bg-transparent">
        <span className="sr-only">{title}</span>
        <Icon
          className="text-3xl text-fg-secondary hover:text-primary"
          icon="token-icon-user"
        />
      </Popover.Trigger>

      <Popover.Positioner>
        <Popover.Content className="w-account-popover max-w-popover-viewport">
          <Popover.Arrow />
          <Popover.Title>{title}</Popover.Title>
          <LoginForm
            defaultValues={controller.loginDefaultValues}
            forgotPasswordHref={controller.forgotPasswordHref}
            isBusy={controller.isBusy}
            onSubmit={controller.handleLoginSubmit}
            registerHref={controller.registerHref}
          />
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}

export const HerbatikaAccountPopover = () => {
  const tAuth = useTranslations("auth")
  const controller = useAuthController({ mode: "login" })

  if (controller.authQuery.isAuthenticated) {
    return (
      <LinkButton
        aria-label={tAuth("account_label")}
        as={NextLink}
        className="px-0 py-0 text-fg-secondary text-icon-2xl hover:text-primary"
        href="/account"
        icon="token-icon-user"
        size="current"
        theme="unstyled"
        variant="secondary"
      />
    )
  }

  return (
    <LoginAccountPopover
      controller={controller}
      title={tAuth("login.short_title")}
    />
  )
}
