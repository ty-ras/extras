/**
 * @file This is types-only file, exposing all types related to asynchronous in-memory cache, its administation and usage.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * This is callback type used when constructing in-memory async cache.
 * It is supposed to asynchronously compute the value given certain text input.
 */
export type GetValue<TOutput> = (input: string) => Promise<TOutput>;

/**
 * This is generic type specialized by {@link InMemoryAsyncBiDiCache}, representing the cache which can be queried for values.
 * The cache will remember the new values it fetches.
 */
export type InMemoryAsyncCache<TName extends string, TOutput> = {
  [P in TName]: (input: string) => Promise<TOutput>;
};

/**
 * This is generic type for bi-directional cache, where both keys and values are `string`, and they have `1:1` correlation.
 * For example, in certain environments, these could be user email and user ID.
 */
export type InMemoryAsyncBiDiCache<
  TKeyToValue extends string,
  TValueToKey extends string,
> = InMemoryAsyncCache<TKeyToValue, string> &
  InMemoryAsyncCache<TValueToKey, string>;

/**
 * Helper type to extract first generic argument of given {@link InMemoryAsyncCache}.
 */
export type InMemoryCacheAccessor<TCache extends TInMemoryCacheBase> =
  TCache extends InMemoryAsyncCache<infer TAccessor, infer _>
    ? TAccessor
    : never;

/**
 * Helper type to extract second generic argument of given {@link InMemoryAsyncCache}.
 */
export type InMemoryCacheOutput<TCache extends TInMemoryCacheBase> =
  TCache extends InMemoryAsyncCache<infer _, infer TOutput> ? TOutput : never;

/**
 * This is base type for {@link InMemoryCacheAccessor} and {@link InMemoryCacheOutput} generic parameters.
 */
export type TInMemoryCacheBase = InMemoryAsyncCache<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * This interface contains functionality for administrating some {@link InMemoryAsyncCache}.
 */
export interface InMemoryCacheAdministration<TInvalidationInfo> {
  /**
   * Invalidates the value for given input, if the cache has it.
   * @param info Given input (e.g. cache key, or more complex input for {@link InMemoryAsyncBiDiCache}), invalidate the value.
   * @returns Nothing.
   */
  invalidate: (info: TInvalidationInfo) => void;

  /**
   * Removes all cached values from the cache.
   * @returns Nothing.
   */
  clear: () => void;
  // TODO similar eviction method as in @ty-ras-extras/resource-pool-fp-ts
}

/**
 * This type binds together {@link InMemoryAsyncCache} or {@link InMemoryAsyncBiDiCache} together with {@link InMemoryCacheAdministration}.
 * Typically is used as return value of factory method.
 */
export type InMemoryCacheWithAdministration<TCache, TInvalidationInfo> = {
  /**
   * The cache.
   * Is different object and not castable to {@link admin}.
   */
  cache: TCache;

  /**
   * The administrative {@link InMemoryCacheAdministration} to manage the {@link cache}.
   * Is different object and not castable to {@link cache}.
   */
  admin: InMemoryCacheAdministration<TInvalidationInfo>;
};

/**
 * This is specialized type for {@link InMemoryCacheAdministration} when first generic argument is {@link InMemoryAsyncCache}.
 */
export type InMemoryCacheWithAdministrationOneDirectional<
  TName extends string,
  TOutput,
> = InMemoryCacheWithAdministration<InMemoryAsyncCache<TName, TOutput>, string>;

/**
 * This is specialized type for {@link InMemoryCacheAdministration} when generic argument is {@link InMemoryAsyncBiDiCache}.
 */
export type InMemoryCacheWithAdministrationBiDirectional<
  TKeyToValue extends string,
  TValueToKey extends string,
  TInvalidationKey extends string,
  TInvalidationValue extends string,
> = InMemoryCacheWithAdministration<
  InMemoryAsyncBiDiCache<TKeyToValue, TValueToKey>,
  { [P in TInvalidationKey]: string } | { [P in TInvalidationValue]: string }
>;

/**
 * This is helper type to augment some type with given property name and value.
 * Typically used to augment {@link InMemoryCacheWithAdministration}.
 */
export type InMemoryCacheWithAdministrationRaw<
  TCacheWithAdministration extends object,
  TRawName extends string,
  TRawValue,
> = TCacheWithAdministration & { [P in TRawName]: TRawValue };
