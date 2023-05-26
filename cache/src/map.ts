/**
 * @file This file contains code to implement {@link api.InMemoryAsyncCache} and {@link api.InMemoryAsyncBiDiCache} using {@link Map} as cache storage.
 */

import type * as api from "./api.types";

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types */

/**
 * Creates new {@link InMemoryBiDiCacheWithAdministrationUsingMap} using given inputs.
 * @param name The name of the function used by {@link api.InMemoryAsyncCache} for clients to use.
 * @param functionality The {@link api.GetValue} callback to asynchronously fetch the value given cache key.
 * @returns New {@link InMemoryCacheWithAdministrationUsingMap}.
 */
export function createInMemoryAsyncCache<TOutput, TName extends string>(
  name: TName,
  functionality: api.GetValue<TOutput>,
): InMemoryCacheWithAdministrationUsingMap<TOutput, TOutput, TName>;

/**
 * Creates new {@link InMemoryBiDiCacheWithAdministrationUsingMap} using given inputs, with callback to transform newly cached values.
 * @param name The name of the function used by {@link api.InMemoryAsyncCache} for clients to use.
 * @param functionality The {@link api.GetValue} callback to asynchronously fetch the value given cache key.
 * @param getVisibleOutput The callback to transform the actual value returned by `functionality` into the value visible to users of the cache.
 * @returns New {@link InMemoryCacheWithAdministrationUsingMap}.
 */
export function createInMemoryAsyncCache<
  TOutput,
  TName extends string,
  TVisibleOutput,
>(
  name: TName,
  functionality: api.GetValue<TOutput>,
  getVisibleOutput: (output: TOutput) => TVisibleOutput,
): InMemoryCacheWithAdministrationUsingMap<TOutput, TVisibleOutput, TName>;

/**
 * Creates new {@link InMemoryBiDiCacheWithAdministrationUsingMap} using given inputs, with optional callback to transform newly cached values.
 * @param name The name of the function used by {@link api.InMemoryAsyncCache} for clients to use.
 * @param functionality The {@link api.GetValue} callback to asynchronously fetch the value given cache key.
 * @param getVisibleOutput The optional callback to transform the actual value returned by `functionality` into the value visible to users of the cache.
 * @returns New {@link InMemoryCacheWithAdministrationUsingMap}.
 */
export function createInMemoryAsyncCache<
  TOutput,
  TName extends string,
  TVisibleOutput,
>(
  name: TName,
  functionality: api.GetValue<TOutput>,
  getVisibleOutput?: (output: TOutput) => TVisibleOutput,
): InMemoryCacheWithAdministrationUsingMap<TOutput, TVisibleOutput, TName> {
  const cache = new Map<string, CacheableValue<TOutput>>();
  const getOutput = cachePromise(functionality, cache);
  return {
    cache: {
      [name]: async (input: string) => {
        const output = await getOutput(input);
        return getVisibleOutput ? getVisibleOutput(output) : output;
      },
    } as api.InMemoryAsyncCache<TName, TVisibleOutput>,
    admin: {
      invalidate: (info) => cache.delete(info),
      clear: () => cache.clear(),
    },
    map: cache,
  };
}

/**
 * Creates new bi-directional {@link InMemoryBiDiCacheWithAdministrationUsingMap} with given input.
 * @param keyToValue The name of the function to get value based on key.
 * @param keyToValueFunctionality The callback to get value based on key.
 * @param valueToKey The name of the function to get key based on value.
 * @param valueToKeyFunctiuonality The callback to get key based on value.
 * @param invalidateKey The name of the property signifying that key should be used when invalidating cache entry.
 * @param invalidateValue The name of the property signifying that value should be used when invalidating cache entry.
 * @returns A new bi-directional {@link InMemoryBiDiCacheWithAdministrationUsingMap} with given input.
 */
export const createInMemoryBiDiAsyncCache = <
  TKeyToValue extends string,
  TValueToKey extends string,
  TInvalidationKey extends string,
  TInvalidationValue extends string,
>(
  keyToValue: TKeyToValue,
  keyToValueFunctionality: api.GetValue<string>,
  valueToKey: TValueToKey,
  valueToKeyFunctiuonality: api.GetValue<string>,
  invalidateKey: TInvalidationKey,
  invalidateValue: TInvalidationValue,
): InMemoryBiDiCacheWithAdministrationUsingMap<
  TKeyToValue,
  TValueToKey,
  TInvalidationKey,
  TInvalidationValue
> => {
  const keyToValueCache = new Map<string, CacheableValue<string>>();
  const valueToKeyCache = new Map<string, CacheableValue<string>>();
  const keyToValueFunctionalityBiDi = registerToInverseMap(
    cachePromise(keyToValueFunctionality, keyToValueCache),
    keyToValueCache,
    valueToKeyCache,
  );
  const valueToKeyFunctionalityBiDi = registerToInverseMap(
    cachePromise(valueToKeyFunctiuonality, valueToKeyCache),
    valueToKeyCache,
    keyToValueCache,
  );
  return {
    cache: {
      [keyToValue]: keyToValueFunctionalityBiDi,
      [valueToKey]: valueToKeyFunctionalityBiDi,
    } as api.InMemoryAsyncBiDiCache<TKeyToValue, TValueToKey>,
    admin: {
      invalidate: (info) => {
        let str: string;
        let thisMap: Map<string, CacheableValue<string>>;
        let otherMap: Map<string, CacheableValue<string>>;
        if (invalidateKey in info) {
          str = info[invalidateKey as keyof typeof info];
          thisMap = keyToValueCache;
          otherMap = valueToKeyCache;
        } else {
          str = info[invalidateValue as keyof typeof info];
          thisMap = valueToKeyCache;
          otherMap = keyToValueCache;
        }
        const existingOther = thisMap.get(str);
        thisMap.delete(str);
        if (
          existingOther !== undefined &&
          existingOther.kind === CACHEABLE_VALUE_SUCCEEDED
        ) {
          otherMap.delete(existingOther.result);
        }
      },
      clear: () => {
        keyToValueCache.clear();
        valueToKeyCache.clear();
      },
    },
    maps: {
      keyToValueCache,
      valueToKeyCache,
    },
  };
};

const cachePromise =
  <TOutput>(
    getValue: api.GetValue<TOutput>,
    map: Map<string, CacheableValue<TOutput>>,
  ): api.GetValue<TOutput> =>
  (input) => {
    const existing = map.get(input);
    if (existing) {
      switch (existing.kind) {
        case CACHEABLE_VALUE_SUCCEEDED:
          return Promise.resolve(existing.result);
        case CACHEABLE_VALUE_IN_PROGRESS:
          return new Promise((resolve, reject) =>
            existing.onCompletion.addNotify((value) =>
              value.kind === CACHEABLE_VALUE_ERRORED
                ? reject(value.error)
                : resolve(value.result),
            ),
          );
        case CACHEABLE_VALUE_ERRORED:
          return Promise.reject(existing.error);
      }
    } else {
      const value: CacheableValueInProgress<TOutput> = {
        kind: CACHEABLE_VALUE_IN_PROGRESS,
        onCompletion: createNotifyList(),
        startedAt: Date.now(),
      };
      map.set(input, value);
      return wrapGetValue(getValue, input, map, value);
    }
  };

const wrapGetValue = async <TOutput>(
  getValue: api.GetValue<TOutput>,
  input: string,
  map: Map<string, CacheableValue<TOutput>>,
  value: CacheableValueInProgress<TOutput>,
) => {
  let completed: CacheableValueCompleted<TOutput> | undefined;
  try {
    const result = await getValue(input);
    completed = {
      kind: CACHEABLE_VALUE_SUCCEEDED,
      result,
      completedAt: Date.now(),
    };
    return result;
  } catch (catchedError) {
    completed = {
      kind: CACHEABLE_VALUE_ERRORED,
      error:
        catchedError instanceof Error
          ? catchedError
          : new Error(`Error: ${catchedError}.`),
      completedAt: Date.now(),
    };
    throw catchedError;
  } finally {
    if (!completed) {
      /* c8 ignore start */
      completed = {
        kind: CACHEABLE_VALUE_ERRORED,
        error: new Error(`Error while creating error object (!).`),
        completedAt: Date.now(),
      };
    }
    /* c8 ignore stop */
    // This check is in case invalidate has been called while awaiting on result
    const currentlyExisting = map.get(input);
    if (currentlyExisting?.kind === CACHEABLE_VALUE_IN_PROGRESS) {
      map.set(input, completed);
    }
    // In any case - we must notify all listeners
    value.onCompletion.callNotifiesAndInvalidateThisList(completed);
  }
};

const registerToInverseMap =
  (
    getValue: api.GetValue<string>,
    thisMap: Map<string, CacheableValue<string>>,
    reverseMap: Map<string, CacheableValue<string>>,
  ): api.GetValue<string> =>
  async (input) => {
    const retVal = await getValue(input);
    if (thisMap.has(input) && !reverseMap.has(retVal)) {
      reverseMap.set(retVal, {
        kind: CACHEABLE_VALUE_SUCCEEDED,
        result: input,
        completedAt: Date.now(),
      });
    }
    return retVal;
  };

/**
 * The return type of {@link createInMemoryAsyncCache}, exposing the {@link api.InMemoryCacheWithAdministrationOneDirectional} with additional Map-related functionality.
 */
export type InMemoryCacheWithAdministrationUsingMap<
  TOutput,
  TVisibleOutput,
  TName extends string,
> = api.InMemoryCacheWithAdministrationRaw<
  api.InMemoryCacheWithAdministrationOneDirectional<TName, TVisibleOutput>,
  "map",
  Map<string, CacheableValue<TOutput>>
>;

/**
 * The return type of {@link createInMemoryBiDiAsyncCache}, exposing the {@link api.InMemoryCacheWithAdministrationBiDirectional} with additional Map-related functionality.
 */
export type InMemoryBiDiCacheWithAdministrationUsingMap<
  TKeyToValue extends string,
  TValueToKey extends string,
  TInvalidationKey extends string,
  TInvalidationValue extends string,
> = api.InMemoryCacheWithAdministrationRaw<
  api.InMemoryCacheWithAdministrationBiDirectional<
    TKeyToValue,
    TValueToKey,
    TInvalidationKey,
    TInvalidationValue
  >,
  "maps",
  {
    keyToValueCache: Map<string, CacheableValue<string>>;
    valueToKeyCache: Map<string, CacheableValue<string>>;
  }
>;

/**
 * The values stored by `Map`s used by caches created by {@link createInMemoryAsyncCache} and {@link createInMemoryBiDiAsyncCache}.
 */
export type CacheableValue<T> =
  | CacheableValueInProgress<T>
  | CacheableValueCompleted<T>;

/**
 * The types for when the cacheable value retrieval completes, either with an error, or successfully.
 */
export type CacheableValueCompleted<T> =
  | CacheableValueErrored
  | CacheableValueSucceeded<T>;

/**
 * This interface signifies that the value is currently being awaited on from asynchronous callback.
 */
export interface CacheableValueInProgress<T> {
  /**
   * Type discriminator property identifying this as {@link CacheableValueInProgress}.
   */
  kind: typeof CACHEABLE_VALUE_IN_PROGRESS;

  /**
   * The list of listeners to invoke when the value has been successfully retrieved.
   */
  onCompletion: NotifyList<T>;

  /**
   * When has asynchronous callback to get the value been started.
   */
  startedAt: number;
}

/**
 * The base interface for {@link CacheableValueErrored} and {@link CacheableValueSucceeded}.
 */
export interface CacheableValueCompletedBase {
  /**
   * When has the value retrieval has been completed, as returned by {@link Date#valueOf}.
   */
  completedAt: number;
}

/**
 * This interface signifies that the cacheable value retrieval has completed with an error.
 */
export interface CacheableValueErrored extends CacheableValueCompletedBase {
  /**
   * Type discriminator property identifying this as {@link CacheableValueErrored}.
   */
  kind: typeof CACHEABLE_VALUE_ERRORED;

  /**
   * The {@link Error} that occurred.
   */
  error: Error;
}

/**
 * This interface signifies that the cacheable value retrieval has completed successfully.
 */
export interface CacheableValueSucceeded<T>
  extends CacheableValueCompletedBase {
  /**
   * Type discriminator property identifying this as {@link CacheableValueSucceeded}.
   */
  kind: typeof CACHEABLE_VALUE_SUCCEEDED;

  /**
   * The result of the cache retrieval.
   */
  result: T;
}

export const CACHEABLE_VALUE_SUCCEEDED = "succeeded";
export const CACHEABLE_VALUE_ERRORED = "errored";
export const CACHEABLE_VALUE_IN_PROGRESS = "inProgress";

/**
 * This is notify list functionality of {@link CacheableValueInProgress}, without exposing raw list.
 */
export interface NotifyList<T> {
  /**
   * Adds given callback to be executed when the value has been retrieved.
   * @param notify The callback to execute when the value has been retrieved.
   * @returns Nothing.
   */
  addNotify: (notify: (value: CacheableValueCompleted<T>) => void) => void;

  /**
   *
   * @param value The cacheable
   * @returns
   */
  callNotifiesAndInvalidateThisList: (
    value: CacheableValueCompleted<T>,
  ) => void;
}

const createNotifyList = <T>(): NotifyList<T> => {
  const list: Array<(value: CacheableValueCompleted<T>) => void> = [];
  let isValid = true;
  return {
    addNotify: (notify) => {
      if (isValid) {
        list.push(notify);
        /* c8 ignore start */
      } else {
        throw new Error("This notify list is no longer valid.");
      }
      /* c8 ignore stop */
    },
    callNotifiesAndInvalidateThisList: (value) => {
      isValid = false;
      for (const notify of list) {
        notify(value);
      }
      list.length = 0;
    },
  };
};
