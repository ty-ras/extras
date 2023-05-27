/**
 * @file This file contains code to create new {@link ResourcePoolWithAdministration}.
 */

import type * as api from "./api.types";
import * as pool from "./pool";
import * as state from "./state";
import * as admin from "./administration";
import * as retry from "./retry";

/**
 * Creates new instance of {@link ResourcePoolWithAdministration}, with given options.
 * If the options have value for {@link ResourcePoolCreationOptions#maxCount} but not for {@link ResourcePoolCreationOptions#retry}, the {@link api.ResourcePool} of the return value will behave such that it will immediately return an error if max capacity is reached, __without retrying__.
 * @param opts The {@link ResourcePoolCreationOptions}.
 * @returns The {@link ResourcePoolWithAdministration}.
 * @throws The {@link Error} if {@link ResourcePoolCreationOptions#maxCount} was less than {@link ResourcePoolCreationOptions#minCount}.
 */
export const createSimpleResourcePool = <T>(
  opts: ResourcePoolCreationOptions<T>,
) => _createResourcePool(Object.assign({}, defaultOptions, opts));

/**
 * This interface specifies input for {@link createSimpleResourcePool} function.
 */
export interface ResourcePoolCreationOptions<T> {
  /**
   * The minimum count of the resources.
   * If not specified, will be `0`.
   * Notice that the pool will not fill up the resources to this number during creation, instead this configuration only affects behaviour of {@link api.ResourcePoolAdministration#runEviction}
   */
  minCount?: number;

  /**
   * The optional maximum count of the resources.
   * If omitted, then resource pool __will have no limits__.
   */
  maxCount?: number;

  /**
   * The callback to initialize a new resource.
   */
  create: api.ResourceCreate<T>;

  /**
   * The callback to destroy given resource.
   */
  destroy: api.ResourceDestroy<T>;

  /**
   * The optional custom callback to check for resource equality, if using `===` is not sufficient.
   */
  equality?: api.Equality<T>;

  /**
   * The optional {@link retry.RetryFunctionality} to use.
   */
  retry?: retry.RetryFunctionality;
}

/**
 * This is what is returned by {@link createSimpleResourcePool} function.
 * The {@link api.ResourcePool} and {@link api.ResourcePoolAdministration} can be freely deconstructed and used separately.
 * They are not castable to each other, thus allowing e.g. safe passage of {@link api.ResourcePool} to client code without worrying that it could do something administrative by sneakily casting it to {@link api.ResourcePoolAdministration}.
 */
export interface ResourcePoolWithAdministration<T, TAcquireParameters> {
  /**
   * The {@link api.ResourcePool} that can be used to acquire and destroy resources.
   * Is different object and not castable to {@link administration}.
   */
  pool: api.ResourcePool<T, TAcquireParameters>;

  /**
   * The {@link api.ResourcePoolAdministration} that be used to e.g. periodically invoke {@link api.ResourcePoolAdministration#runEviction} to clean up idle resources.
   * Is different object and not castable to {@link ResourcePoolWithAdministration#pool}.
   */
  administration: api.ResourcePoolAdministration<T>;
}

const _createResourcePool = <TResource>({
  minCount,
  maxCount,
  create,
  destroy,
  equality,
  retry: retryOpts,
}: InternalResourcePoolOptions<TResource>): ResourcePoolWithAdministration<
  TResource,
  void
> => {
  if (maxCount !== undefined && maxCount < minCount) {
    throw new Error(
      `The given maximum count ${maxCount} was less than given min count ${minCount}.`,
    );
  }

  const poolState: state.ResourcePoolState<TResource> = {
    resources: [],
    minCount,
    maxCount,
    equality,
  };

  const poolRetVal: api.ResourcePool<TResource> = {
    acquire: pool.createAcquire(poolState, create),
    release: pool.createRelease(poolState),
  };

  return {
    pool: retryOpts
      ? retry.augmentWithRetry(poolRetVal, retryOpts)
      : poolRetVal,
    administration: {
      getCurrentResourceCount: () =>
        pool.getCurrentResourceCount(poolState.resources),
      getMinCount: () => poolState.minCount,
      getMaxCount: () => poolState.maxCount,
      runEviction: admin.createRunEviction(poolState, destroy),
    },
  };
};

const defaultOptions = {
  minCount: 0,
  equality: (x, y) => x === y,
} as const satisfies Omit<
  ResourcePoolCreationOptions<unknown>,
  "create" | "destroy"
>;

type InternalResourcePoolOptions<T> = typeof defaultOptions &
  ResourcePoolCreationOptions<T>;
