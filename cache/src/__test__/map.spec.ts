/**
 * @file This file contains unit tests for functionality in file `../map.ts`.
 */

import test from "ava";
import * as spec from "../map";

test("Validate that successful value is cached", async (c) => {
  c.plan(4);
  const calls: CacheCalls = [];
  const { cache } = createTestCacheForStaticOutput({ calls }, OUTPUT);
  c.deepEqual(
    await cache.getValue(INPUT),
    OUTPUT,
    "Initial call must return given value",
  );
  c.deepEqual(calls, [[INPUT]], "Initial call input must be recorded");
  c.deepEqual(
    await cache.getValue(INPUT),
    OUTPUT,
    "Subsequent call with same input must resolve to same output.",
  );
  c.deepEqual(
    calls,
    [[INPUT]],
    "Returning already cached value must not result in call of underlying async function",
  );
});

test("Validate that caching same input twice concurrently only results in one actual call", async (c) => {
  c.plan(2);
  const calls: CacheCalls = [];
  let canResolve = false;
  const { cache } = createTestCache({ calls }, async () => {
    while (!canResolve) {
      await sleep(50);
    }
    return OUTPUT;
  });

  const [initialResult, delayedResult] = await Promise.all([
    // Initial result: get value immediately
    cache.getValue(INPUT),
    // Delayed result: sleep 50, then try get value
    (async () => {
      await sleep(50);
      return cache.getValue(INPUT);
    })(),
    // Trigger: sleep 100 to ensure delayed result starts, then allow value getter to proceed
    (async () => {
      await sleep(100);
      canResolve = true;
    })(),
  ]);
  c.deepEqual(initialResult, delayedResult, "Results must be same");
  c.deepEqual(calls, [[INPUT]], "Callback must've been called only once");
});

test("Validate that caching same input twice concurrently only results in one actual call also with error", async (c) => {
  c.plan(2);
  const calls: CacheCalls = [];
  let canResolve = false;
  const error = new Error("This error will be thrown");
  const { cache } = createTestCache({ calls }, async () => {
    while (!canResolve) {
      await sleep(50);
    }
    throw error;
  });

  await c.throwsAsync(
    async () =>
      await Promise.all([
        // Initial result: get value immediately
        cache.getValue(INPUT),
        // Delayed result: sleep 50, then try get value
        (async () => {
          await sleep(50);
          return cache.getValue(INPUT);
        })(),
        // Trigger: sleep 100 to ensure delayed result starts, then allow value getter to proceed
        (async () => {
          await sleep(100);
          canResolve = true;
        })(),
      ]),
    { is: error },
    "Results must be same",
  );
  c.deepEqual(calls, [[INPUT]], "Callback must've been called only once");
});

test("Validate that error propagates from cache", async (c) => {
  c.plan(4);
  const calls: CacheCalls = [];
  const error = new Error("Error to be thrown");
  const { cache } = createTestCache({ calls }, () => {
    throw error;
  });
  // Try access once
  await c.throwsAsync(
    async () => await cache.getValue(INPUT),
    { is: error },
    "The error thrown by callback must propagate.",
  );
  c.deepEqual(calls, [[INPUT]], "The callback must've been called");
  // Try access again
  await c.throwsAsync(
    async () => await cache.getValue(INPUT),
    { is: error },
    "The error saved from previous call must propagate.",
  );
  c.deepEqual(calls, [[INPUT]], "The callback must not have been called");
});

test("Validate that invalidating cache entry causes callback to be called again", async (c) => {
  c.plan(4);
  const calls: CacheCalls = [];
  const { cache, admin } = createTestCacheForStaticOutput({ calls }, OUTPUT);
  // Populate cache
  c.deepEqual(await cache.getValue(INPUT), OUTPUT);
  c.deepEqual(calls, [[INPUT]]);
  // Invalidate entry
  admin.invalidate(INPUT);
  // Invoke again
  c.deepEqual(await cache.getValue(INPUT), OUTPUT);
  c.deepEqual(calls, [[INPUT], [INPUT]]);
});

test("Validate that bidirectional cache works", async (c) => {
  c.plan(4);
  const callsGetValue: CacheCalls = [];
  const callsGetKey: CacheCalls = [];
  const trackingInfo = { callsGetValue, callsGetKey };
  const { cache } = createTestBiDiCacheForStaticValues(
    trackingInfo,
    OUTPUT,
    INPUT,
  );
  c.deepEqual(
    await cache.getValue(INPUT),
    OUTPUT,
    "The value must've been retrieved",
  );
  c.deepEqual(
    trackingInfo,
    { callsGetValue: [[INPUT]], callsGetKey: [] },
    "Exactly one call must've been made",
  );
  c.deepEqual(await cache.getKey(OUTPUT), INPUT, "The key must be cached");
  c.deepEqual(
    trackingInfo,
    { callsGetValue: [[INPUT]], callsGetKey: [] },
    "No new calls must've been made by the cache",
  );
});

test("Validate that bidirectional cache administration works", async (c) => {
  c.plan(6);
  const callsGetValue: CacheCalls = [];
  const callsGetKey: CacheCalls = [];
  const trackingInfo = { callsGetValue, callsGetKey };
  const { admin, cache } = createTestBiDiCacheForStaticValues(
    trackingInfo,
    OUTPUT,
    INPUT,
  );
  c.deepEqual(
    await cache.getValue(INPUT),
    OUTPUT,
    "The value must've been retrieved",
  );
  c.deepEqual(
    trackingInfo,
    { callsGetValue: [[INPUT]], callsGetKey: [] },
    "Exactly one call must've been made",
  );
  // Invalidate our entry
  admin.invalidate({ key: INPUT });
  // Re-acquire
  c.deepEqual(
    await cache.getValue(INPUT),
    OUTPUT,
    "The value must've been retrieved again",
  );
  c.deepEqual(
    trackingInfo,
    { callsGetValue: [[INPUT], [INPUT]], callsGetKey: [] },
    "The getKey must've been called",
  );
  // Invalidate and re-acquire again, but this time in other direction
  admin.invalidate({ value: OUTPUT });
  // Re-acquire, but this time via getKey
  c.deepEqual(
    await cache.getKey(OUTPUT),
    INPUT,
    "The key must be re-retrieved",
  );
  c.deepEqual(
    trackingInfo,
    {
      callsGetValue: [[INPUT], [INPUT]],
      callsGetKey: [[OUTPUT]],
    },
    "Call after invalidation must've been resulted in underlying callback being invoked",
  );
});

test("Validate that cache clearing works", async (c) => {
  c.plan(4);
  const callsGetValue: CacheCalls = [];
  const callsGetKey: CacheCalls = [];
  const trackingInfo = { callsGetValue, callsGetKey };
  const { cache, admin, maps } = createTestBiDiCacheForStaticValues(
    trackingInfo,
    OUTPUT,
    INPUT,
  );
  const seed = [0, 1, 2, 3, 4, 5];
  await Promise.all(seed.map((v) => cache.getValue(`${v}`)));
  c.deepEqual(new Set(callsGetValue), new Set(seed.map((v) => [`${v}`])));
  c.deepEqual(callsGetKey.length, 0);
  admin.clear();
  c.deepEqual(maps.keyToValueCache.size, 0);
  c.deepEqual(maps.valueToKeyCache.size, 0);
});

test("Validate that bidirectional cache clearing works", async (c) => {
  c.plan(2);
  const calls: CacheCalls = [];
  let val = 0;
  const { cache, admin, map } = createTestCache({ calls }, () =>
    Promise.resolve(++val),
  );
  const seed = [0, 1, 2, 3, 4, 5];
  await Promise.all(seed.map((v) => cache.getValue(`${v}`)));
  c.deepEqual(new Set(calls), new Set(seed.map((v) => [`${v}`])));
  admin.clear();
  c.deepEqual(map.size, 0);
});

// This is useful when there are two levels of caches, since we want to internally keep cache + its administration,
// but we don't want to expose inner administration to outer cache users
test("Validate that output transformation works", async (c) => {
  c.plan(2);
  const { cache, map } = spec.createInMemoryAsyncCache(
    "getValue",
    () => Promise.resolve({ value: OUTPUT }),
    ({ value }) => value,
  );
  c.deepEqual(
    await cache.getValue(INPUT),
    OUTPUT,
    "The exposed value must be the one returned by transformation callback.",
  );
  c.deepEqual(
    (map.get(INPUT) as spec.CacheableValueSucceeded<{ value: string }>).result,
    { value: OUTPUT },
    "The internal value must be the one returned by acquirement callback.",
  );
});

test("Validate that even non-Error class thrown objects are catched", async (c) => {
  c.plan(1);
  const { cache } = spec.createInMemoryAsyncCache("getValue", () => {
    throw 42;
  });
  // Notice that we can't use c.throwsAsync as it doesn't like non-Error throwables
  let seenError: unknown;
  try {
    await cache.getValue(INPUT);
  } catch (error) {
    seenError = error;
  }
  c.deepEqual(seenError, 42);
});

const createTestCacheForStaticOutput = (
  trackingInfo: TrackingInformation,
  output: string,
) => createTestCache(trackingInfo, () => Promise.resolve(output));

const createTestCache = <T>(
  trackingInfo: TrackingInformation,
  getValue: (input: string) => Promise<T>,
) =>
  spec.createInMemoryAsyncCache("getValue", (input) => {
    trackingInfo.calls.push([input]);
    return getValue(input);
  });

const createTestBiDiCacheForStaticValues = (
  trackingInfo: TrackingInformationBiDi,
  output: string,
  input: string,
) =>
  createTestBiDiCache(
    trackingInfo,
    () => Promise.resolve(output),
    () => Promise.resolve(input),
  );

const createTestBiDiCache = (
  trackingInfo: TrackingInformationBiDi,
  getValue: (key: string) => Promise<string>,
  getKey: (value: string) => Promise<string>,
) =>
  spec.createInMemoryBiDiAsyncCache(
    "getValue",
    (key) => {
      trackingInfo.callsGetValue.push([key]);
      return getValue(key);
    },
    "getKey",
    (value) => {
      trackingInfo.callsGetKey.push([value]);
      return getKey(value);
    },
    "key",
    "value",
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TrackingInformation<TKey extends string = "calls"> = {
  [P in TKey]: CacheCalls;
};

type TrackingInformationBiDi = TrackingInformation<
  "callsGetValue" | "callsGetKey"
>;

type CacheCalls = Array<[string]>;

const INPUT = "input";
const OUTPUT = "output";

const sleep = async (delay: number) =>
  await new Promise((resolve) => setTimeout(resolve, delay));
