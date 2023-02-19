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
