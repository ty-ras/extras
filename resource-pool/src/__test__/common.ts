/**
 * @file This file contains utilities used by unit tests of this library.
 */

import type * as api from "../api.types";

/* eslint-disable jsdoc/require-jsdoc */
export const recordCreates =
  <T>(array: Array<T>, resource: T): api.ResourceCreate<T> =>
  () => {
    array.push(resource);
    return Promise.resolve(resource);
  };

export const recordDestroys =
  <T>(array: Array<T>): api.ResourceDestroy<T> =>
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
