import * as api from "./api";
import * as errors from "./errors";
import * as common from "./common";

/**
 * If `retryFunctionality` is of type {@link StaticRetryFunctionality}, and its `retryCount` property is `0` or less, then the returned function will be a no-op.
 * And if the `waitBeforeRetryMs` property is `0` or less, there will be no waiting, but retry logic will commence immediately.
 * @param retryFunctionality The retry logic, either as static object, or as a callback.
 * @returns A callback which can be used to augment any {@link api.ResourcePool} with retry logic.
 * @see StaticRetryFunctionality
 * @see DynamicRetryFunctionality
 */
export const augmentWithRetry = <TResource, TAcquireParameters>(
  pool: api.ResourcePool<TResource, TAcquireParameters>,
  retryFunctionality: RetryFunctionality,
): api.ResourcePool<TResource, TAcquireParameters> => {
  const getRetryInfo: DynamicRetryFunctionality | undefined =
    typeof retryFunctionality === "function"
      ? retryFunctionality
      : dynamicFromStatic(retryFunctionality);
  return getRetryInfo
    ? new PoolWithRetryFunctionality(getOriginalPool(pool), getRetryInfo)
    : pool;
};

export const poolIsWithRetryFunctionality = <TResource, TAcquireParameters>(
  pool: api.ResourcePool<TResource, TAcquireParameters>,
) => pool instanceof PoolWithRetryFunctionality;

export type RetryFunctionality =
  | StaticRetryFunctionality
  | DynamicRetryFunctionality;

export interface RetryParameters {
  waitBeforeRetryMs: number;
}

/**
 * Describes the retry logic using some variables.
 * Notice that the retry logic created from these variables will only react if the error thrown by `acquire` of {@link api.ResourcePool} is of type {@link errors.ResourcePoolFullError}.
 * If more complex retry logic is needed, consider using {@link DynamicRetryFunctionality}.
 */
export type StaticRetryFunctionality = RetryParameters & { retryCount: number };

/**
 * Callback to decide whether to retry again or not, whenever acquiring a resource "throws" an error.
 * The result of this callback should be {@link Error} if no more retrying should be done.
 * Otherwise, an object {@link RetryParameters} should be returned to instruct how long to wait until retrying again.
 */
export type DynamicRetryFunctionality = (
  args: DynamicRetryFunctionalityArgs,
) => RetryParameters | Error;

export interface DynamicRetryFunctionalityArgs {
  error: Error;
  /**
   * Notice! This count is 1-based!
   * So on the first call, the value of this will be 1.
   */
  attemptCount: number;
}

const acquireWithRetry = async <TResource, TAcquireParameters>(
  acquire: api.ResourceAcquire<TResource, TAcquireParameters>,
  args: TAcquireParameters,
  retryFunctionality: DynamicRetryFunctionality,
  // eslint-disable-next-line sonarjs/cognitive-complexity
) => {
  let maybeResource: ResourceWrapper<TResource> | Error;
  let retryParams: RetryParameters | Error | undefined;
  let attemptCount = 0;
  do {
    ++attemptCount;
    try {
      maybeResource = { wrapped: await acquire(args) };
    } catch (thrownError) {
      maybeResource = common.toError(thrownError);
    }
    retryParams =
      maybeResource instanceof Error
        ? retryFunctionality({ error: maybeResource, attemptCount })
        : undefined;
    if (retryParams) {
      if (retryParams instanceof Error) {
        maybeResource = retryParams;
        retryParams = undefined;
      } else {
        const timeout = retryParams.waitBeforeRetryMs;
        if (timeout > 0) {
          // Avoid extra setTimeout calls
          await new Promise<void>((resolve) => setTimeout(resolve, timeout));
        }
      }
    }
  } while (retryParams !== undefined);
  if (maybeResource instanceof Error) {
    throw maybeResource;
  }
  return maybeResource.wrapped;
};

const dynamicFromStatic = ({
  waitBeforeRetryMs,
  ...args
}: StaticRetryFunctionality): DynamicRetryFunctionality | undefined => {
  const retryCount = Math.max(args.retryCount, 0);
  return retryCount > 0
    ? ({ attemptCount, error }) =>
        error instanceof errors.ResourcePoolFullError
          ? attemptCount > retryCount
            ? new errors.NoMoreRetriesLeftError(attemptCount, error)
            : { waitBeforeRetryMs }
          : error
    : undefined;
};

class PoolWithRetryFunctionality<TResource, TAcquireParameters>
  implements api.ResourcePool<TResource, TAcquireParameters>
{
  public constructor(
    public readonly __originalPool: api.ResourcePool<
      TResource,
      TAcquireParameters
    >,
    retryFunctionality: DynamicRetryFunctionality,
  ) {
    const { acquire, release } = __originalPool;
    this.acquire = async (args) =>
      await acquireWithRetry(acquire, args, retryFunctionality);
    this.release = release;
  }
  acquire: api.ResourceAcquire<TResource, TAcquireParameters>;
  release: api.ResourceRelease<TResource>;
}

const getOriginalPool = <TResource, TAcquireParameters>(
  pool: api.ResourcePool<TResource, TAcquireParameters>,
): api.ResourcePool<TResource, TAcquireParameters> =>
  pool instanceof PoolWithRetryFunctionality ? pool.__originalPool : pool;

type ResourceWrapper<T> = { wrapped: T };
