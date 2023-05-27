/**
 * @file This file contains code related to errors used by resource pool functionality.
 */

/**
 * This error is used during resource acquire operation, when pool no longer has room to acquire new resources.
 * Notice that only type information about this class is exported from this library.
 * @see isResourcePoolFullError
 */
export class ResourcePoolFullError extends Error {}

/**
 * This error is used during resource release operation, when the given resource is not part of the pool where it is being returned.
 * Notice that only type information about this class is exported from this library.
 * @see isResourceNotPartOfPoolError
 */
export class ResourceNotPartOfPoolError extends Error {}

/**
 * This error is used during resource acquire operaton, when pool has been configured with max limit for resources, and also augmented with retry logic, but the resource still couldn't be acquired.
 * Notice that only type information about this class is exported from this library.
 * @see isNoMoreRetriesLeftError
 */
export class NoMoreRetriesLeftError extends Error {
  /**
   * Creates new instance of this class.
   * @param attemptCount How many times it was attempted to acquire the resource.
   * @param lastError The last error that occurred.
   */
  public constructor(
    public readonly attemptCount: number,
    public readonly lastError: Error,
  ) {
    super(`Error after attempting ${attemptCount} times.`, {
      cause: lastError,
    });
  }
}

/**
 * Checks whether given `error` is {@link ResourcePoolFullError}.
 * @param error The error that occurred.
 * @returns `true` if given `error` is {@link ResourcePoolFullError}, `false` otherwise.
 */
export const isResourcePoolFullError = (
  error: unknown,
): error is ResourcePoolFullError => error instanceof ResourcePoolFullError;

/**
 * Checks whether given `error` is {@link ResourceNotPartOfPoolError}.
 * @param error The error that occurred.
 * @returns `true` if given `error` is {@link ResourceNotPartOfPoolError}, `false` otherwise.
 */
export const isResourceNotPartOfPoolError = (
  error: unknown,
): error is ResourceNotPartOfPoolError =>
  error instanceof ResourceNotPartOfPoolError;

/**
 * Checks whether given `error` is {@link NoMoreRetriesLeftError}.
 * @param error The error that occurred.
 * @returns `true` if given `error` is {@link NoMoreRetriesLeftError}, `false` otherwise.
 */
export const isNoMoreRetriesLeftError = (
  error: unknown,
): error is NoMoreRetriesLeftError => error instanceof NoMoreRetriesLeftError;
