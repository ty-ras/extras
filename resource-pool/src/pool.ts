/**
 * @file This file contains internal code related to functionality of resource pools.
 */

import type * as api from "./api.types";
import * as errors from "./errors";
import * as state from "./state";

/**
 * Creates {@link api.ResourceAcquire} that can be used as {@link api.ResourcePool#acquire}.
 * @param poolState The {@link ResourcePoolState}.
 * @param create The {@link ResourceCreateTask} to use to create resources.
 * @returns The {@link api.ResourceAcquire} that can be used as {@link api.ResourcePool#acquire}.
 */
export const createAcquire =
  <TResource>(
    poolState: state.ResourcePoolState<TResource>,
    create: api.ResourceCreate<TResource>,
  ): api.ResourceAcquire<TResource, void> =>
  () => {
    let retVal: Promise<TResource>;
    // Find index of first resource, which is available to use.
    const existingIndex = poolState.resources.findIndex(
      (r) => r && r.returnedAt !== undefined,
    );
    if (existingIndex >= 0) {
      // If found, then mark as reserved
      const existing =
        poolState.resources[existingIndex] ??
        /* c8 ignore next 3 */
        doThrow(
          "Internal error: found suitable resource index, but element at index was not suitable after all.",
        );
      existing.returnedAt = undefined;
      retVal = Promise.resolve(existing.resource);
    } else {
      // If not found, then start process of creating new one
      if (!isRoomForResource(poolState.maxCount, poolState.resources)) {
        // The pool maximum resource count is reached
        throw new errors.ResourcePoolFullError(
          "Resource pool max capacity reached",
        );
      }
      // Deduce the actual index where we put the resource
      let thisIndex = poolState.resources.indexOf(null);
      if (thisIndex < 0) {
        thisIndex = poolState.resources.length;
      }
      // Before doing async, mark that we have reserved this array slot for future use
      poolState.resources[thisIndex] = undefined;
      // Invoke asynchronous callback to create the resource and save it to state
      retVal = acquireAsync(poolState, create, thisIndex);
    }

    return retVal;
  };

/**
 * Creates {@link api.ResourceRelease} that can be used as {@link api.ResourcePool#release}.
 * @param poolState The {@link ResourcePoolState}.
 * @returns The {@link api.ResourceRelease} that can be used as {@link api.ResourcePool#release}.
 */
export const createRelease =
  <TResource>(
    poolState: state.ResourcePoolState<TResource>,
  ): api.ResourceRelease<TResource> =>
  (resource) => {
    // Find the resource from state
    const resourceObject = poolState.resources.find(
      (r) =>
        r &&
        r.returnedAt === undefined &&
        poolState.equality(r.resource, resource),
    );
    // Throw error if not found
    if (!resourceObject) {
      throw new errors.ResourceNotPartOfPoolError(
        "Given resource was not part of this pool",
      );
    }
    // Remember when it was returned
    resourceObject.returnedAt = Date.now();
    return Promise.resolve();
  };

const isRoomForResource = (
  maxCount: number | undefined,
  array: ReadonlyArray<state.ResourcePoolStateArrayItem<unknown>>,
) =>
  maxCount === undefined ||
  array.length < maxCount ||
  getCurrentResourceCount(array) < maxCount;

/**
 * Gets the amount of resources (idle and acquired) of the pool.
 * @param array The array from {@link state.ResourcePoolState#resources}.
 * @returns The amount of resources (values other than `null`) in the given array.
 */
export const getCurrentResourceCount = (
  array: ReadonlyArray<state.ResourcePoolStateArrayItem<unknown>>,
) => array.reduce((nonNullCount, r) => nonNullCount + (r === null ? 0 : 1), 0);

const acquireAsync = async <TResource>(
  poolState: state.ResourcePoolState<TResource>,
  create: api.ResourceCreate<TResource>,
  currentIndex: number,
) => {
  try {
    const resource = await create();
    poolState.resources[currentIndex] = new state.Resource(resource);
    return resource;
  } catch (e) {
    // Mark the resource as failed.
    poolState.resources[currentIndex] = null;
    throw e;
  }
};

/* c8 ignore next 3 */
const doThrow = (msg: string) => {
  throw new Error(msg);
};
