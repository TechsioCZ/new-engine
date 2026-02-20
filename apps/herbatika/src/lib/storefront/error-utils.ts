const resolveObjectErrorMessage = (error: unknown) => {
  if (!(error && typeof error === "object")) {
    return null;
  }

  if (!("message" in error)) {
    return null;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return null;
  }

  return message;
};

export const resolveErrorMessage = (
  error: unknown,
  fallbackMessage = "An unknown error occurred.",
) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  const objectMessage = resolveObjectErrorMessage(error);
  if (objectMessage) {
    return objectMessage;
  }

  return fallbackMessage;
};
