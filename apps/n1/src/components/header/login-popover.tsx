"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { PopoverTemplate as Popover } from "@techsio/ui-kit/templates/popover"
import Link from "next/link"
import { LoginForm } from "../forms/login-form"
import { useHeaderContext } from "./store/header-context"

export const LoginPopover = () => {
  const { isLoginFormOpen, toggleLoginForm, isAuthenticated } =
    useHeaderContext()

  const handleToggle = () => {
    toggleLoginForm()
  }

  return (
    <>
      {isAuthenticated ? (
        <Link className="grid items-center" href="/ucet/profil">
          <Icon
            className="text-3xl text-primary"
            icon="icon-[mdi--account-outline]"
          />
        </Link>
      ) : (
        <Popover
          contentClassName="w-sm max-w-mobile-w"
          gutter={12}
          id="login-popover"
          onOpenChange={toggleLoginForm}
          open={isLoginFormOpen}
          placement="bottom-end"
          shadow={false}
          title="Přihlášení"
          trigger={
            <Icon
              className="text-fg-reverse hover:text-primary"
              icon="icon-[mdi--account-outline]"
            />
          }
          triggerClassName="text-3xl px-0 py-0 hover:bg-transparent"
        >
          <LoginForm
            onSuccess={handleToggle}
            showForgotPasswordLink
            showRegisterLink
            toggle={handleToggle}
          />
        </Popover>
      )}
    </>
  )
}
