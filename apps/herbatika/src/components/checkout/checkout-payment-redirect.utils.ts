const PAYMENT_URL_KEYS = [
  "payment_url",
  "paymentUrl",
  "checkout_url",
  "checkoutUrl",
  "gw_url",
  "gwUrl",
  "redirect_url",
  "redirectUrl",
  "url",
] as const;

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const resolvePaymentUrlFromRecord = (
  record: Record<string, unknown>,
): string | null => {
  for (const key of PAYMENT_URL_KEYS) {
    const value = record[key];
    if (typeof value === "string" && isRedirectUrl(value)) {
      return value;
    }
  }

  const data = record.data;
  if (isObject(data)) {
    return resolvePaymentUrlFromRecord(data);
  }

  return null;
};

const resolveSelectedSession = (sessions: unknown[]) => {
  return (
    sessions.find(
      (session) =>
        isObject(session) &&
        (session.is_selected === true || session.selected === true),
    ) ?? sessions[0]
  );
};

export const resolvePaymentRedirectUrl = (value: unknown): string | null => {
  if (!isObject(value)) {
    return null;
  }

  const directPaymentUrl = resolvePaymentUrlFromRecord(value);
  if (directPaymentUrl) {
    return directPaymentUrl;
  }

  const paymentSessions = value.payment_sessions;
  if (Array.isArray(paymentSessions) && paymentSessions.length > 0) {
    const selectedSession = resolveSelectedSession(paymentSessions);
    if (isObject(selectedSession)) {
      const sessionPaymentUrl = resolvePaymentUrlFromRecord(selectedSession);
      if (sessionPaymentUrl) {
        return sessionPaymentUrl;
      }
    }
  }

  const payments = value.payments;
  if (Array.isArray(payments)) {
    for (const payment of payments) {
      if (!isObject(payment)) {
        continue;
      }

      const paymentUrl = resolvePaymentUrlFromRecord(payment);
      if (paymentUrl) {
        return paymentUrl;
      }
    }
  }

  return null;
};

function isRedirectUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
