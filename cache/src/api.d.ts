/* eslint-disable @typescript-eslint/no-unused-vars */
export type GetValue<TOutput> = (input: string) => Promise<TOutput>;

export type InMemoryAsyncCache<TName extends string, TOutput> = {
  [P in TName]: (input: string) => Promise<TOutput>;
};

export type InMemoryAsyncBiDiCache<
  TKeyToValue extends string,
  TValueToKey extends string,
> = InMemoryAsyncCache<TKeyToValue, string> &
  InMemoryAsyncCache<TValueToKey, string>;

export type InMemoryCacheAccessor<TCache extends TInMemoryCacheBase> =
  TCache extends InMemoryAsyncCache<infer TAccessor, infer _>
    ? TAccessor
    : never;
export type InMemoryCacheOutput<TCache extends TInMemoryCacheBase> =
  TCache extends InMemoryAsyncCache<infer _, infer TOutput> ? TOutput : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TInMemoryCacheBase = InMemoryAsyncCache<string, any>;

export interface InMemoryCacheAdministration<TInvalidationInfo> {
  invalidate: (info: TInvalidationInfo) => void;
  clear: () => void;
  // TODO similar eviction method as in @ty-ras-extras/resource-pool-fp-ts
}

export type InMemoryCacheWithAdministration<TCache, TInvalidationInfo> = {
  cache: TCache;
  admin: InMemoryCacheAdministration<TInvalidationInfo>;
};

export type InMemoryCacheWithAdministrationOneDirectional<
  TName extends string,
  TOutput,
> = InMemoryCacheWithAdministration<InMemoryAsyncCache<TName, TOutput>, string>;

export type InMemoryCacheWithAdministrationBiDirectional<
  TKeyToValue extends string,
  TValueToKey extends string,
  TInvalidationKey extends string,
  TInvalidationValue extends string,
> = InMemoryCacheWithAdministration<
  InMemoryAsyncBiDiCache<TKeyToValue, TValueToKey>,
  { [P in TInvalidationKey]: string } | { [P in TInvalidationValue]: string }
>;

export type InMemoryCacheWithAdministrationRaw<
  TCacheWithAdministration extends object,
  TRawName extends string,
  TRawValue,
> = TCacheWithAdministration & { [P in TRawName]: TRawValue };
