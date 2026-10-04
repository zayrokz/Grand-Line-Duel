import { HttpsError } from 'firebase-functions/https';
import type { FunctionsErrorCode } from 'firebase-functions/https';
import type { ApiErrorReason } from '@gld/engine';

/** Erreur métier : code HTTP standard + raison stable traduite par le client. */
export class ApiError extends Error {
  constructor(
    public readonly code: FunctionsErrorCode,
    public readonly reason: ApiErrorReason,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(reason);
    this.name = 'ApiError';
  }

  toHttpsError(): HttpsError {
    return new HttpsError(this.code, this.reason, { reason: this.reason, ...this.extra });
  }
}

export function fail(
  code: FunctionsErrorCode,
  reason: ApiErrorReason,
  extra?: Record<string, unknown>,
): never {
  throw new ApiError(code, reason, extra);
}
