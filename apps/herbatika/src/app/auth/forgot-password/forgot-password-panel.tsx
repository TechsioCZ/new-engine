"use client";

import { useState } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

const LOGIN_HREF = "/auth/login";

export const ForgotPasswordPanel = () => {
  const [isBusy, setIsBusy] = useState(false);

  // TODO: wire up to sdk.auth.resetPassword once Medusa email provider (Resend)
  // is configured on the backend. For now we resolve successfully so the UI
  // flow can be tested end-to-end.
  const handleSubmit = async (_values: { email: string }) => {
    setIsBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setIsBusy(false);
    return null;
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
