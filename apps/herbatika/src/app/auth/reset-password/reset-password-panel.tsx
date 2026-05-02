"use client";

import { useState } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

const LOGIN_HREF = "/auth/login";

type ResetPasswordPanelProps = {
  token: string | null;
  email: string | null;
};

export const ResetPasswordPanel = ({ token, email }: ResetPasswordPanelProps) => {
  const [isBusy, setIsBusy] = useState(false);
  const hasToken = Boolean(token);

  // TODO: wire up to sdk.auth.updateProvider("customer", "emailpass",
  // { password }, token) once Medusa email provider (Resend) is configured on
  // the backend. For now we resolve successfully so the UI flow can be tested
  // end-to-end.
  const handleSubmit = async (_values: {
    password: string;
    confirm_password: string;
  }) => {
    setIsBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setIsBusy(false);
    return null;
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
