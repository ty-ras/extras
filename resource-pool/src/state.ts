/**
 * @file This file contains internal types of the resource pool state.
 */

import type * as api from "./api.types";

/**
 * This interface contains properties of the internal state of {@link api.ResourcePool}.
 */
export interface ResourcePoolState<T> {
  /**
   * The currently allocated resources.
   * @see ResourcePoolStateArrayItem
   */
  resources: Array<ResourcePoolStateArrayItem<T>>;

  /**
   * The minimum count of the resources for this resource pool.
   */
  minCount: number;

  /**
   * The optional maximum count of the resource for this resource pool.
   */
  maxCount: number | undefined;

  /**
   * The callback to check for equality of the resources.
   */
  equality: api.Equality<T>;
}

/**
 * This type represents the possible values of {@link ResourcePoolState#resources}.
 *
 * - If {@link Resource}, then it is previously created resource now idling within the pool.
 * - If `undefined`, then this slot has been reserved for resource currently being created.
 * - If `null`, then the creation has failed, and this slot is free to use by next resource.
 */
export type ResourcePoolStateArrayItem<T> = Resource<T> | undefined | null;

/**
 * This class is a holder for resource and information when it was returned to pool.
 */
export class Resource<T> {
  /**
   * Creates new instance of this class with given parameters.
   * @param resource The resource.
   * @param returnedAt When it was returned to pool, as returned by {@link Date#valueOf}. If `undefined`, then it means that resource is currently in use, and not available for acquiring.
   */
  public constructor(
    public readonly resource: T,
    public returnedAt: number | undefined = undefined, // undefined - currently in use. Otherwise timestamp in ms.
  ) {}
}
