import type { SmartSuggestError } from '@techsio/smart-suggest-core';
import { Option, Schema } from 'effect';
import {
  SmartSuggestBadRequestError,
  SmartSuggestBadRequestErrorSchema,
  SmartSuggestForbiddenError,
  SmartSuggestForbiddenErrorSchema,
  SmartSuggestInternalError,
  SmartSuggestInternalErrorSchema,
  SmartSuggestRateLimitError,
  SmartSuggestRateLimitErrorSchema,
  SmartSuggestUnauthorizedError,
  SmartSuggestUnauthorizedErrorSchema,
} from '../shared/api.ts';

export const serverError = () =>
  new SmartSuggestInternalError({
    errors: [
      {
        code: 'internal-error',
        message: 'Smart Suggest request failed.',
        retryable: true,
      } satisfies SmartSuggestError,
    ],
    message: 'Smart Suggest request failed.',
  });

export const badRequestError = (message: string, field?: string) => {
  const error =
    field === undefined
      ? {
          code: 'bad-request' as const,
          message,
        }
      : {
          code: 'bad-request' as const,
          field,
          message,
        };

  return new SmartSuggestBadRequestError({
    errors: [error],
    message,
  });
};

export const unauthorizedError = (message: string) =>
  new SmartSuggestUnauthorizedError({
    errors: [
      {
        code: 'unauthorized',
        message,
        retryable: false,
      },
    ],
    message,
  });

export const forbiddenError = (message: string) =>
  new SmartSuggestForbiddenError({
    errors: [
      {
        code: 'forbidden',
        message,
        retryable: false,
      },
    ],
    message,
  });

export const rateLimitError = (message = 'Smart Suggest request rate limit exceeded.') =>
  new SmartSuggestRateLimitError({
    errors: [
      {
        code: 'rate-limit',
        message,
        retryable: true,
      },
    ],
    message,
  });

export const isSmartSuggestBadRequestError = Schema.is(SmartSuggestBadRequestErrorSchema);
export const isSmartSuggestForbiddenError = Schema.is(SmartSuggestForbiddenErrorSchema);
export const isSmartSuggestInternalError = Schema.is(SmartSuggestInternalErrorSchema);
export const isSmartSuggestRateLimitError = Schema.is(SmartSuggestRateLimitErrorSchema);
export const isSmartSuggestUnauthorizedError = Schema.is(SmartSuggestUnauthorizedErrorSchema);

export type SmartSuggestApiError =
  | SmartSuggestBadRequestError
  | SmartSuggestForbiddenError
  | SmartSuggestInternalError
  | SmartSuggestRateLimitError
  | SmartSuggestUnauthorizedError;

export type SmartSuggestSuggestError = SmartSuggestBadRequestError | SmartSuggestInternalError;

export const isSmartSuggestApiError = (error: unknown): error is SmartSuggestApiError =>
  isSmartSuggestBadRequestError(error) ||
  isSmartSuggestForbiddenError(error) ||
  isSmartSuggestInternalError(error) ||
  isSmartSuggestRateLimitError(error) ||
  isSmartSuggestUnauthorizedError(error);

export const normalizeApiError = (error: unknown): SmartSuggestApiError =>
  isSmartSuggestApiError(error) ? error : serverError();

export const normalizeSuggestError = (error: unknown): SmartSuggestSuggestError => {
  const badRequest = Option.getOrUndefined(
    Schema.decodeUnknownOption(SmartSuggestBadRequestErrorSchema)(error),
  );

  if (badRequest !== undefined) {
    return badRequest;
  }

  const internal = Option.getOrUndefined(
    Schema.decodeUnknownOption(SmartSuggestInternalErrorSchema)(error),
  );

  if (internal !== undefined) {
    return internal;
  }

  return serverError();
};
