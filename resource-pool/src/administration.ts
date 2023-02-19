import * as api from "./api";
import * as common from "./common";
import * as pool from "./pool";

export const createRunEviction =
  <TResource>(
    state: pool.ResourcePoolState<TResource>,
    destroy: pool.ResourceDestroyTask<TResource>,
  ): api.ResourcePoolAdministration<TResource>["runEviction"] =>
  async (resourceIdleTime) => {
    const shouldEvict: api.ResourceIdleTimeCustomizationFunction<TResource> =
      typeof resourceIdleTime === "number"
        ? ({ returnedAt, now }) => now - returnedAt >= resourceIdleTime
        : resourceIdleTime;
    const { toBeEvicted, toBeRetained } = state.resources.reduce<
      EvictReduceState<TResource>
    >(
      (reduceState, r, idx) => {
        if (
          idx >= state.minCount &&
          r &&
          r.returnedAt !== undefined &&
          shouldEvict({
            now: reduceState.now,
            returnedAt: r.returnedAt,
            resource: r.resource,
          })
        ) {
          reduceState.toBeEvicted.push(r.resource);
        } else if (r !== null) {
          reduceState.toBeRetained.push(r);
        }
        return reduceState;
      },
      {
        now: Date.now(),
        toBeEvicted: [],
        toBeRetained: [],
      },
    );

    state.resources = toBeRetained;
    const destroyResults = await Promise.all(
      toBeEvicted.map(async (r) => {
        try {
          await destroy(r);
        } catch (error) {
          return common.toError(error);
        }
      }),
    );
    return {
      resourcesDeleted: destroyResults.length,
      errors: destroyResults.filter(
        (maybeError): maybeError is Error => maybeError !== undefined,
      ),
    };
  };

interface EvictReduceState<T> {
  now: number;
  toBeEvicted: Array<T>;
  toBeRetained: Array<pool.Resource<T> | undefined>;
}
