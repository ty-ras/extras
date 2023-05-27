/**
 * @file This file contains internal code related to administation of resource pools.
 */

import type * as api from "./api.types";
import * as common from "./common";
import * as state from "./state";

/**
 * Creates implementation for `runEviction` function of {@link api.ResourcePoolAdministration} interface.
 * This function is internal to this library, and not exposed to clients.
 * @param poolState The {@link pool.ResourcePoolState}.
 * @param destroy The callback to destroy one resource.
 * @returns The implementation for `runEviction` function of {@link api.ResourcePoolAdministration} interface.
 */
export const createRunEviction =
  <TResource>(
    poolState: state.ResourcePoolState<TResource>,
    destroy: api.ResourceDestroy<TResource>,
  ): api.ResourcePoolAdministration<TResource>["runEviction"] =>
  async (resourceIdleTime) => {
    const shouldEvict: api.ResourceIdleTimeCustomizationFunction<TResource> =
      typeof resourceIdleTime === "number"
        ? ({ returnedAt, now }) => now - returnedAt >= resourceIdleTime
        : resourceIdleTime;
    const { toBeEvicted, toBeRetained } = poolState.resources.reduce<
      EvictReduceState<TResource>
    >(
      (reduceState, r, idx) => {
        if (
          idx >= poolState.minCount &&
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

    poolState.resources = toBeRetained;
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
  toBeRetained: Array<state.Resource<T> | undefined>;
}
