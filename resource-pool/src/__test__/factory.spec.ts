/**
 * @file This file contains unit tests for functionality in file `../factory.ts`.
 */

import test from "ava";
import * as spec from "../factory";
import * as retry from "../retry";

test("Validate that factory takes retry arguments into account", (c) => {
  c.plan(2);
  const opts: spec.ResourcePoolCreationOptions<string> = {
    create: () => Promise.resolve("resource"),
    destroy: () => Promise.resolve(undefined),
  };
  c.false(
    retry.poolIsWithRetryFunctionality(
      spec.createSimpleResourcePool(opts).pool,
    ),
  );
  c.true(
    retry.poolIsWithRetryFunctionality(
      spec.createSimpleResourcePool({
        ...opts,
        retry: { retryCount: 1, waitBeforeRetryMs: 0 },
      }).pool,
    ),
  );
});

test("Validate that maxCount is checked for sensitibility", (c) => {
  c.plan(2);
  const opts: spec.ResourcePoolCreationOptions<string> = {
    create: () => Promise.resolve("resource"),
    destroy: () => Promise.resolve(undefined),
  };
  // Notice that this is "OK" -> sometimes the user might want this (pool which never actually allocates).
  c.notThrows(() => spec.createSimpleResourcePool({ ...opts, maxCount: 0 }));

  // However, this does not make sense
  c.throws(() =>
    spec.createSimpleResourcePool({ ...opts, minCount: 1, maxCount: 0 }),
  );
});
