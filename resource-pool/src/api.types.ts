/**
 * @file This types-only file contains type definitions of resource pools and how to use and administer them.
 */

/**
 * This interface contains necessary functions related to administration of one resource pool.
 *
 * TODO add setters to make it possible to tweak resource pool as time goes (e.g. based on some schedule)
 */
export interface ResourcePoolAdministration<TResource> {
  /**
   * Gets the maximum amount of resources this pool can hold. If unspecified, will return `undefined`.
   * @returns The maximum amount of resources this pool can hold. If unspecified, will return `undefined`.
   */
  getMaxCount: () => number | undefined;

  /**
   * Gets the minimum amount of resources this resource pool should hold, once reaching that count.
   * @returns The minimum amount of resources this resource pool should hold, once reaching that count.
   */
  getMinCount: () => number;

  /**
   * Gets the current amount of resources that this pool holds.
   * @returns The current amount of resources that this pool holds.
   */
  getCurrentResourceCount: () => number;

  /**
   * Runs eviction procedure, freeing up resources as it can.
   * Notice that the resources will never go below result of {@link getMinCount}, if there are more than that in the pool.
   * @param resourceIdleTime The minimum time that the resource must have been unused within this pool before considered eligible to be destroyed.
   * @returns Asynchronously returns {@link EvictionResult}.
   */
  runEviction: (
    resourceIdleTime: ResourceIdleTimeCustomization<TResource>,
  ) => Promise<EvictionResult>;
}

/**
 * This interface contains necessary functions to acquire and release resources from the resource pool.
 */
export interface ResourcePool<TResource, TAcquireParameters = void> {
  /**
   * This function will acquire resource from the resource pool.
   * It will asynchronously return resource or an error.
   * **NOTICE** that it is **responsibility of the caller** to later return the resource to the resource pool.
   *
   * This callback may throw `ResourcePoolFullError`, if the pool has maximum amount of resources configured, the pool has not been augmented with retry logic, and all of the resources are already busy.
   * This callback may throw `NoMoreRetriesLeftError`, if the pool has been augmented with retry logic, and all of the resources were busy during the duration of retry logic.
   */
  acquire: ResourceAcquire<TResource, TAcquireParameters>;

  /**
   * This function will release given resource back to the resource pool.
   * It will asynchronously return nothing or an error.
   *
   * This callback may throw `ResourceNotPartOfPoolError`, if the given resource was not extracted from this pool.
   */
  release: ResourceRelease<TResource>;
}

/**
 * This is callback type to acquire resource from the resource pool.
 * It will asynchronously return resource or an error.
 * **NOTICE** that it is **responsibility of the caller** to later return the resource to the resource pool.
 *
 * This callback may throw `ResourcePoolFullError`, if the pool has maximum amount of resources configured, the pool has not been augmented with retry logic, and all of the resources are already busy.
 * This callback may throw `NoMoreRetriesLeftError`, if the pool has been augmented with retry logic, and all of the resources were busy during the duration of retry logic.
 */
export type ResourceAcquire<TResource, TParameters> = (
  parameters: TParameters,
) => Promise<TResource>;

/**
 * This is callback type for release resource back to the resource pool.
 * It will asynchronously return nothing or an error.
 *
 * This callback may throw `ResourceNotPartOfPoolError`, if the given resource was not extracted from this pool.
 */
export type ResourceRelease<TResource> = (resource: TResource) => Promise<void>;

/**
 * This type defines how resource idle time check can be customized, when running {@link ResourcePoolAdministration#runEviction}.
 * @see ResourceIdleTimeCustomizationFunction
 */
export type ResourceIdleTimeCustomization<T> =
  | number // Milliseconds
  | ResourceIdleTimeCustomizationFunction<T>;

/**
 * This type is the dynamic version of {@link ResourceIdleTimeCustomization}.
 * Notice that it can not be asynchronous, as the resource might be acquired during asynchronous operation.
 * @see ResourceIdleTimeCustomizationFunctionInput
 */
export type ResourceIdleTimeCustomizationFunction<T> = (
  input: ResourceIdleTimeCustomizationFunctionInput<T>,
) => boolean;

/**
 * This is the input for {@link ResourceIdleTimeCustomizationFunction}
 */
export interface ResourceIdleTimeCustomizationFunctionInput<T> {
  /**
   * When was the resource returned at, as returned by {@link Date#valueOf}.
   */
  returnedAt: number;

  /**
   * The time when resource eviction process started, as returned by {@link Date#valueOf}.
   */
  now: number;

  /**
   * The resource being processed.
   */
  resource: T;
}

/**
 * This is return type for {@link ResourcePoolAdministration#runEviction}.
 */
export interface EvictionResult {
  /**
   * How many resources were destroyed.
   */
  resourcesDeleted: number;

  /**
   * Errors encountered during operation.
   */
  errors: ReadonlyArray<Error>;
}

/**
 * The callback for asynchronously creating the resource.
 */
export type ResourceCreate<T> = () => Promise<T>;
/**
 * The callback for asynchronously destroying the resource.
 */
export type ResourceDestroy<T> = (resource: T) => Promise<void>;

/**
 * The callback to compare two resources for equality.
 */
export type Equality<T> = (x: T, y: T) => boolean;
