import type * as spec from "../factory";
import type * as api from "../api";

export const recordCreates =
  <T>(array: Array<T>, resource: T): spec.ResourceCreate<T> =>
  () => {
    array.push(resource);
    return Promise.resolve(resource);
  };

export const recordDestroys =
  <T>(array: Array<T>): spec.ResourceDestroy<T> =>
  (resource) => {
    array.push(resource);
    return Promise.resolve();
  };

export type Resource = string;

export const noResourcesEvicted: api.EvictionResult = {
  resourcesDeleted: 0,
  errors: [],
};

export const successfulResourcesEviction = (
  resourcesDeleted: number,
): api.EvictionResult => ({
  resourcesDeleted,
  errors: [],
});
