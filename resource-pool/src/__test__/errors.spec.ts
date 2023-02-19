import test from "ava";
import * as spec from "../errors";

test("Validate that ResourcePoolFullError is detected correctly", (c) => {
  c.plan(4);
  c.true(spec.isResourcePoolFullError(new spec.ResourcePoolFullError()));
  c.false(spec.isResourcePoolFullError(new spec.ResourceNotPartOfPoolError()));
  c.false(
    spec.isResourcePoolFullError(
      new spec.NoMoreRetriesLeftError(0, new Error()),
    ),
  );
  c.false(spec.isResourcePoolFullError(new Error()));
});

test("Validate that ResourceNotPartOfPoolError is detected correctly", (c) => {
  c.plan(4);
  c.true(
    spec.isResourceNotPartOfPoolError(new spec.ResourceNotPartOfPoolError()),
  );
  c.false(spec.isResourceNotPartOfPoolError(new spec.ResourcePoolFullError()));
  c.false(
    spec.isResourceNotPartOfPoolError(
      new spec.NoMoreRetriesLeftError(0, new Error()),
    ),
  );
  c.false(spec.isResourceNotPartOfPoolError(new Error()));
});

test("Validate that NoMoreRetriesLeftError is detected correctly", (c) => {
  c.plan(4);
  c.true(
    spec.isNoMoreRetriesLeftError(
      new spec.NoMoreRetriesLeftError(0, new Error()),
    ),
  );
  c.false(spec.isNoMoreRetriesLeftError(new spec.ResourcePoolFullError()));
  c.false(spec.isNoMoreRetriesLeftError(new spec.ResourceNotPartOfPoolError()));
  c.false(spec.isNoMoreRetriesLeftError(new Error()));
});
