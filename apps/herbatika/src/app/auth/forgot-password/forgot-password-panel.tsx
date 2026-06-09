"use client";

import { useState } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { requestPasswordResetProxy } from "@/lib/storefront/auth/proxy";

const LOGIN_HREF = "/auth/login";

export const ForgotPasswordPanel = () => {
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (values: { email: string }) => {
    setIsBusy(true);
    try {
      await requestPasswordResetProxy(values.email);
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Nepodarilo sa odoslať odkaz na obnovu hesla.";
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="space-y-400 max-w-max-w mx-auto p-400">
      <header className="space-y-200">
        <h1 className="text-lg font-semibold">Zabudnuté heslo</h1>
        <p className="text-sm text-fg-secondary">
          Zadajte e-mailovú adresu, na ktorú máte vytvorený účet. Pošleme vám
          odkaz na obnovu hesla.
        </p>
      </header>

      <ForgotPasswordForm
        defaultValues={{ email: "" }}
        isBusy={isBusy}
        loginHref={LOGIN_HREF}
        onSubmit={handleSubmit}
      />
    </section>
  );
};
