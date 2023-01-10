import type * as api from "./api";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
export function createInMemoryAsyncCache<TOutput, TName extends string>(
  name: TName,
  functionality: api.GetValue<TOutput>,
): InMemoryCacheWithAdministration<TOutput, TOutput, TName>;
export function createInMemoryAsyncCache<
  TOutput,
  TName extends string,
  TVisibleOutput,
>(
  name: TName,
  functionality: api.GetValue<TOutput>,
  getVisibleOutput: (output: TOutput) => TVisibleOutput,
): InMemoryCacheWithAdministration<TOutput, TVisibleOutput, TName>;
export function createInMemoryAsyncCache<
  TOutput,
  TName extends string,
  TVisibleOutput,
>(
  name: TName,
  functionality: api.GetValue<TOutput>,
  getVisibleOutput?: (output: TOutput) => TVisibleOutput,
): InMemoryCacheWithAdministration<TOutput, TVisibleOutput, TName> {
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
): InMemoryBiDiCacheWithAdministration<
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
        if (existingOther !== undefined && existingOther.kind === succeeded) {
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
        case succeeded:
          return Promise.resolve(existing.result);
        case inProgress:
          return new Promise((resolve, reject) =>
            existing.onCompletion.addNotify((value) =>
              value.kind === errored
                ? reject(value.error)
                : resolve(value.result),
            ),
          );
        case errored:
          return Promise.reject(existing.error);
      }
    } else {
      const value: CacheableValueInProgress<TOutput> = {
        kind: inProgress,
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
      kind: succeeded,
      result,
      completedAt: Date.now(),
    };
    return result;
  } catch (catchedError) {
    completed = {
      kind: errored,
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
        kind: errored,
        error: new Error(`Error while creating error object (!).`),
        completedAt: Date.now(),
      };
    }
    /* c8 ignore stop */
    // This check is in case invalidate has been called while awaiting on result
    const currentlyExisting = map.get(input);
    if (currentlyExisting?.kind === inProgress) {
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
        kind: succeeded,
        result: input,
        completedAt: Date.now(),
      });
    }
    return retVal;
  };

export type InMemoryCacheWithAdministration<
  TOutput,
  TVisibleOutput,
  TName extends string,
> = api.InMemoryCacheWithAdministrationRaw<
  api.InMemoryCacheWithAdministrationOneDirectional<TName, TVisibleOutput>,
  "map",
  Map<string, CacheableValue<TOutput>>
>;

export type InMemoryBiDiCacheWithAdministration<
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

export type CacheableValue<T> =
  | CacheableValueInProgress<T>
  | CacheableValueCompleted<T>;

export interface CacheableValueInProgress<T> {
  kind: typeof inProgress;
  onCompletion: NotifyList<T>;
  startedAt: number;
}

export type CacheableValueCompleted<T> = {
  completedAt: number;
} & (CacheableValueErrored | CacheableValueSucceeded<T>);

export interface CacheableValueErrored {
  kind: typeof errored;
  error: Error;
}

export interface CacheableValueSucceeded<T> {
  kind: typeof succeeded;
  result: T;
}

const succeeded = "succeeded";
const errored = "errored";
const inProgress = "inProgress";

export interface NotifyList<T> {
  addNotify: (notify: (value: CacheableValueCompleted<T>) => void) => void;
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
