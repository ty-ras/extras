import test from "ava";
import * as spec from "../retry";
import * as api from "../api";
import * as errors from "../errors";

test("Validate that retry works after one failed call", async (c) => {
  c.plan(2);
  const tracker = makeTracker();
  const pool = spec.augmentWithRetry(succeedAfter(1, tracker), {
    retryCount: 1,
    waitBeforeRetryMs: 0,
  });
  c.deepEqual(await pool.acquire(), RESOURCE);
  c.deepEqual(tracker, { acquireCalled: 2 });
});

test("Validate that retry works when all calls fail", async (c) => {
  c.plan(2);
  const tracker = makeTracker();
  const pool = spec.augmentWithRetry(succeedAfter(3, tracker), {
    retryCount: 2,
    waitBeforeRetryMs: 0,
  });
  await c.throwsAsync(async () => await pool.acquire(), {
    instanceOf: errors.NoMoreRetriesLeftError,
    message: "Error after attempting 3 times.",
  });
  c.deepEqual(tracker, { acquireCalled: 3 });
});

test("Validate that retry works even when callback hard-throws an error", async (c) => {
  c.plan(1);
  const message = "This error should be catched";
  const pool = spec.augmentWithRetry<string, void>(
    {
      acquire: () => {
        throw new Error(message);
      },
      release: () => Promise.resolve(),
    },
    { retryCount: 1, waitBeforeRetryMs: 0 },
  );
  await c.throwsAsync(async () => await pool.acquire(), { message });
});

test("Validate that retry works when retry wait time is greater than zero", async (c) => {
  c.plan(2);
  const tracker = makeTracker();
  const pool = spec.augmentWithRetry(succeedAfter(1, tracker), {
    retryCount: 1,
    waitBeforeRetryMs: 10,
  });
  c.deepEqual(await pool.acquire(), RESOURCE);
  c.deepEqual(tracker, { acquireCalled: 2 });
});

test("Validate that poolIsWithRetryFunctionality works", (c) => {
  c.plan(3);
  const normalPool = succeedAfter(0, makeTracker());
  const retryPool = spec.augmentWithRetry(normalPool, {
    retryCount: 1,
    waitBeforeRetryMs: 0,
  });
  c.false(spec.poolIsWithRetryFunctionality(normalPool));
  c.true(spec.poolIsWithRetryFunctionality(retryPool));
  c.false(
    spec.poolIsWithRetryFunctionality(
      spec.augmentWithRetry(normalPool, {
        retryCount: 0,
        waitBeforeRetryMs: 0,
      }),
    ),
  );
});

test("Validate that retry works even when augmenting already retry-augmented pool", async (c) => {
  c.plan(2);
  const tracker = makeTracker();
  const pool = spec.augmentWithRetry(
    spec.augmentWithRetry(succeedAfter(2, tracker), {
      retryCount: 1,
      waitBeforeRetryMs: 10,
    }),
    { retryCount: 2, waitBeforeRetryMs: 0 },
  );
  c.deepEqual(await pool.acquire(), RESOURCE);
  c.deepEqual(tracker, { acquireCalled: 3 });
});

test("Validate that retry works with dynamic retry logic", async (c) => {
  c.plan(3);
  const tracker = makeTracker();
  const retryTracker: Array<spec.DynamicRetryFunctionalityArgs> = [];
  const error = new Error("This is the error");
  const pool = spec.augmentWithRetry(
    succeedAfter(1, tracker, error),
    // Always retry
    (retryArgs) => (retryTracker.push(retryArgs), { waitBeforeRetryMs: 0 }),
  );
  c.deepEqual(await pool.acquire(), RESOURCE);
  c.deepEqual(tracker, { acquireCalled: 2 });
  c.deepEqual(retryTracker, [
    {
      attemptCount: 1,
      error,
    },
  ]);
});

const succeedAfter = (
  count: number,
  track: { acquireCalled: number },
  error?: Error,
): api.ResourcePool<string> => ({
  acquire: () => {
    ++track.acquireCalled;
    const shouldSucceed = --count < 0;
    return shouldSucceed
      ? Promise.resolve(RESOURCE)
      : Promise.reject(error ?? new errors.ResourcePoolFullError());
  },
  release: () => Promise.resolve(),
});

interface AcquireTracker {
  acquireCalled: number;
}

const makeTracker = (): AcquireTracker => ({ acquireCalled: 0 });

const RESOURCE = "resource";
