"use client";

import { useCallback, useState } from "react";
import { useLogout } from "./auth";
import { cartStorage } from "./cart-storage";
import { resolveErrorMessage } from "./error-utils";

type UseLogoutActionOptions = {
  onSuccess?: () => void | Promise<void>;
};

type LogoutActionResult =
  | {
    ok: true;
  }
  | {
    ok: false;
    error: string;
  };

export const useLogoutAction = (
  options?: UseLogoutActionOptions,
) => {
  const logoutMutation = useLogout();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const onSuccess = options?.onSuccess;

  const clearLogoutError = useCallback(() => {
    setLogoutError(null);
  }, []);

  const handleLogout = useCallback(async (): Promise<LogoutActionResult> => {
    clearLogoutError();

    try {
      await logoutMutation.mutateAsync();
      cartStorage.clearCartId();
      await onSuccess?.();

      return { ok: true };
    } catch (error) {
      const resolvedError = resolveErrorMessage(error);
      setLogoutError(resolvedError);

      return {
        ok: false,
        error: resolvedError,
      };
    }
  }, [clearLogoutError, logoutMutation, onSuccess]);

  return {
    clearLogoutError,
    handleLogout,
    logoutError,
    logoutMutation,
  };
};
