import * as api from "./api";
import * as pool from "./pool";
import * as admin from "./administration";
import * as retry from "./retry";

export const createSimpleResourcePool = <T>(
  opts: ResourcePoolCreationOptions<T>,
) => _createResourcePool(Object.assign({}, defaultOptions, opts));

export interface ResourcePoolCreationOptions<T> {
  minCount?: number; // Default 0
  maxCount?: number; // TODO check that >= minCount
  create: ResourceCreate<T>;
  destroy: ResourceDestroy<T>;
  equality?: pool.Equality<T>;
  retry?: retry.RetryFunctionality;
}

export type ResourceCreate<T> = () => Promise<T>;
export type ResourceDestroy<T> = (resource: T) => Promise<void>;

export interface ResourcePoolWithAdministration<T, TAcquireParameters> {
  pool: api.ResourcePool<T, TAcquireParameters>;
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
  const state: pool.ResourcePoolState<TResource> = {
    resources: [],
    minCount,
    maxCount,
    equality: equality ?? defaultEquality(),
  };

  const poolRetVal: api.ResourcePool<TResource> = {
    acquire: pool.createAcquire(state, create),
    release: pool.createRelease(state),
  };

  return {
    pool: retryOpts
      ? retry.augmentWithRetry(poolRetVal, retryOpts)
      : poolRetVal,
    administration: {
      getCurrentResourceCount: () =>
        pool.getCurrentResourceCount(state.resources),
      getMinCount: () => state.minCount,
      getMaxCount: () => state.maxCount,
      runEviction: admin.createRunEviction(state, destroy),
    },
  };
};

const defaultOptions = {
  minCount: 0,
  evictionCheckRunInterval: 1000,
};

type InternalResourcePoolOptions<T> = typeof defaultOptions &
  ResourcePoolCreationOptions<T>;

const defaultEquality =
  <T>(): pool.Equality<T> =>
  (x, y) =>
    x === y;
