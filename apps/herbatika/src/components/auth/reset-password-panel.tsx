"use client";

import { useState } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { routes } from "@/lib/routes";
import { requestPasswordUpdateProxy } from "@/lib/storefront/auth/proxy";

const LOGIN_HREF = routes.auth.login;

type ResetPasswordPanelProps = {
  token: string | null;
  email: string | null;
};

export const ResetPasswordPanel = ({ token, email }: ResetPasswordPanelProps) => {
  const [isBusy, setIsBusy] = useState(false);
  const hasToken = Boolean(token);

  const handleSubmit = async (values: {
    password: string;
    confirm_password: string;
  }) => {
    if (!token) {
      return "Tento odkaz je neplatný alebo už vypršal.";
    }

    setIsBusy(true);
    try {
      await requestPasswordUpdateProxy({
        password: values.password,
        token,
      });
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Nepodarilo sa obnoviť heslo.";
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="space-y-400 max-w-max-w mx-auto p-400">
      <header className="space-y-200">
        <h1 className="text-lg font-semibold">Obnova hesla</h1>
        <p className="text-sm text-fg-secondary">
          {email
            ? `Nastavte nové heslo pre účet ${email}.`
            : "Zadajte nové heslo pre váš účet."}
        </p>
      </header>

      <ResetPasswordForm
        defaultValues={{ password: "", confirm_password: "" }}
        hasToken={hasToken}
        isBusy={isBusy}
        loginHref={LOGIN_HREF}
        onSubmit={handleSubmit}
      />
    </section>
  );
};
