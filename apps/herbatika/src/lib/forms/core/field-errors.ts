type FieldErrorMeta = {
  errors: unknown[];
  isBlurred: boolean;
  errorMap: {
    onBlur?: unknown;
    onChange?: unknown;
    onDynamic?: unknown;
    onSubmit?: unknown;
    onServer?: unknown;
  };
};

type ResolveVisibleFieldErrorOptions = {
  hasChangedSinceBlur?: boolean;
  meta: FieldErrorMeta;
  submissionAttempts: number;
  validationMode?: "none" | "blur";
};

type FieldValidationSource = keyof FieldErrorMeta["errorMap"];
type FieldValidateStatus = "default" | "error";

type VisibleFieldFeedback = {
  errorText: string | undefined;
  validateStatus: FieldValidateStatus;
};

type ResolvedFieldValidationResult = {
  errorText: string | undefined;
  matchedSource: boolean;
};

export const toFieldErrorText = (error: unknown): string | undefined => {
  if (typeof error === "string" || typeof error === "number") {
    return String(error);
  }

  if (Array.isArray(error) && error.length > 0) {
    return toFieldErrorText(error[0]);
  }

  return undefined;
};

const hasValidationResult = (
  meta: FieldErrorMeta,
  source: FieldValidationSource,
) => {
  return Object.prototype.hasOwnProperty.call(meta.errorMap, source);
};

const hasValidationResultFromSources = (
  meta: FieldErrorMeta,
  sources: readonly FieldValidationSource[],
) => {
  return sources.some((source) => hasValidationResult(meta, source));
};

const resolveErrorFromValidationSources = (
  meta: FieldErrorMeta,
  sources: readonly FieldValidationSource[],
) : ResolvedFieldValidationResult => {
  for (const source of sources) {
    if (hasValidationResult(meta, source)) {
      return {
        errorText: toFieldErrorText(meta.errorMap[source]),
        matchedSource: true,
      };
    }
  }

  return {
    errorText: undefined,
    matchedSource: false,
  };
};

const resolveFallbackFieldError = (meta: FieldErrorMeta) => {
  return toFieldErrorText(meta.errors[0]);
};

export const shouldTrackLiveFieldFeedback = ({
  meta,
  submissionAttempts,
}: Pick<ResolveVisibleFieldErrorOptions, "meta" | "submissionAttempts">) => {
  if (meta.isBlurred) {
    return true;
  }

  if (submissionAttempts < 1) {
    return false;
  }

  return (
    hasValidationResultFromSources(meta, ["onServer", "onSubmit", "onBlur"]) ||
    meta.errors.length > 0
  );
};

export const resolveVisibleFieldError = ({
  hasChangedSinceBlur = false,
  meta,
  submissionAttempts,
  validationMode = "blur",
}: ResolveVisibleFieldErrorOptions) => {
  if (validationMode === "none") {
    return undefined;
  }

  if (submissionAttempts > 0) {
    if (hasChangedSinceBlur) {
      const liveResult = resolveErrorFromValidationSources(meta, [
        "onDynamic",
        "onChange",
      ]);

      if (liveResult.matchedSource) {
        return liveResult.errorText;
      }

      return undefined;
    }

    if (meta.isBlurred) {
      const blurredResult = resolveErrorFromValidationSources(meta, [
        "onServer",
        "onSubmit",
        "onDynamic",
        "onChange",
        "onBlur",
      ]);

      if (blurredResult.matchedSource) {
        return blurredResult.errorText;
      }

      return resolveFallbackFieldError(meta);
    }

    const submittedResult = resolveErrorFromValidationSources(meta, [
      "onServer",
      "onSubmit",
      "onBlur",
    ]);

    if (submittedResult.matchedSource) {
      return submittedResult.errorText;
    }

    return hasValidationResultFromSources(meta, ["onDynamic", "onChange"])
      ? undefined
      : resolveFallbackFieldError(meta);
  }

  if (!meta.isBlurred) {
    return undefined;
  }

  if (hasChangedSinceBlur) {
    const liveResult = resolveErrorFromValidationSources(meta, [
      "onDynamic",
      "onChange",
    ]);

    if (liveResult.matchedSource) {
      return liveResult.errorText;
    }

    return undefined;
  }

  const blurredResult = resolveErrorFromValidationSources(meta, [
    "onDynamic",
    "onChange",
    "onBlur",
  ]);

  if (blurredResult.matchedSource) {
    return blurredResult.errorText;
  }

  return resolveFallbackFieldError(meta);
};

export const resolveVisibleFieldFeedback = (
  options: ResolveVisibleFieldErrorOptions,
): VisibleFieldFeedback => {
  const errorText = resolveVisibleFieldError(options);

  return {
    errorText,
    validateStatus: errorText ? "error" : "default",
  };
};
