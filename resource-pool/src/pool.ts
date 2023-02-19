import type * as api from "./api";
import * as errors from "./errors";

export const createAcquire =
  <TResource>(
    state: ResourcePoolState<TResource>,
    create: ResourceCreateTask<TResource>,
  ): api.ResourceAcquire<TResource, void> =>
  () => {
    let retVal: Promise<TResource>;
    // Find index of first resource, which is available to use.
    const existingIndex = state.resources.findIndex(
      (r) => r && r.returnedAt !== undefined,
    );
    if (existingIndex >= 0) {
      // If found, then mark as reserved
      const existing =
        state.resources[existingIndex] ??
        /* c8 ignore next 3 */
        doThrow(
          "Internal error: found suitable resource index, but element at index was not suitable after all.",
        );
      existing.returnedAt = undefined;
      retVal = Promise.resolve(existing.resource);
    } else {
      // If not found, then start process of creating new one
      if (!isRoomForResource(state.maxCount, state.resources)) {
        // The pool maximum resource count is reached
        throw new errors.ResourcePoolFullError(
          "Resource pool max capacity reached",
        );
      }
      // Deduce the actual index where we put the resource
      let thisIndex = state.resources.indexOf(null);
      if (thisIndex < 0) {
        thisIndex = state.resources.length;
      }
      // Before doing async, mark that we have reserved this array slot for future use
      state.resources[thisIndex] = undefined;
      // Invoke asynchronous callback to create the resource and save it to state
      retVal = acquireAsync(state, create, thisIndex);
    }

    return retVal;
  };

export const createRelease =
  <TResource>(
    state: ResourcePoolState<TResource>,
  ): api.ResourceRelease<TResource> =>
  (resource) => {
    // Find the resource from state
    const resourceObject = state.resources.find(
      (r) =>
        r && r.returnedAt === undefined && state.equality(r.resource, resource),
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

export interface ResourcePoolState<T> {
  resources: Array<ResourcePoolStateArrayItem<T>>;
  minCount: number;
  maxCount: number | undefined;
  equality: Equality<T>;
}
export type ResourcePoolStateArrayItem<T> =
  // Class wrapping whatever resource we are pooling
  | Resource<T>
  // Undefined means that we are reserved the slot, and are awaiting on the asynchronous creation callback to complete
  | undefined
  // Null means that asynchronous creation callback failed, and this slot is free to take
  | null;
export type ResourceCreateTask<T> = () => Promise<T>;
export type ResourceDestroyTask<T> = (resource: T) => Promise<void>;
export type Equality<T> = (x: T, y: T) => boolean;

export class Resource<T> {
  public constructor(
    public readonly resource: T,
    public returnedAt: number | undefined = undefined, // undefined - currently in use. Otherwise timestamp in ms.
  ) {}
}

export class EmptySlot {}

const isRoomForResource = (
  maxCount: number | undefined,
  array: ReadonlyArray<ResourcePoolStateArrayItem<unknown>>,
) =>
  maxCount === undefined ||
  array.length < maxCount ||
  getCurrentResourceCount(array) < maxCount;

export const getCurrentResourceCount = (
  array: ReadonlyArray<ResourcePoolStateArrayItem<unknown>>,
) => array.reduce((nonNullCount, r) => nonNullCount + (r === null ? 0 : 1), 0);

const acquireAsync = async <TResource>(
  state: ResourcePoolState<TResource>,
  create: ResourceCreateTask<TResource>,
  currentIndex: number,
) => {
  try {
    const resource = await create();
    state.resources[currentIndex] = new Resource(resource);
    return resource;
  } catch (e) {
    // Mark the resource as failed.
    state.resources[currentIndex] = null;
    throw e;
  }
};

/* c8 ignore next 3 */
const doThrow = (msg: string) => {
  throw new Error(msg);
};
