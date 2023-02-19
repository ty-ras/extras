export class ResourcePoolFullError extends Error {}
export class ResourceNotPartOfPoolError extends Error {}
export class NoMoreRetriesLeftError extends Error {
  public constructor(
    public readonly attemptCount: number,
    public readonly lastError: Error,
  ) {
    super(`Error after attempting ${attemptCount} times.`, {
      cause: lastError,
    });
  }
}

export const isResourcePoolFullError = (
  error: unknown,
): error is ResourcePoolFullError => error instanceof ResourcePoolFullError;

export const isResourceNotPartOfPoolError = (
  error: unknown,
): error is ResourceNotPartOfPoolError =>
  error instanceof ResourceNotPartOfPoolError;

export const isNoMoreRetriesLeftError = (
  error: unknown,
): error is NoMoreRetriesLeftError => error instanceof NoMoreRetriesLeftError;
