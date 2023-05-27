/**
 * @file This is entrypoint file for this package, exporting all non-internal files.
 */

export type * from "./api.types";
export type * from "./errors";
// Don't export error classes so that only this library can create instances of those error classes.
export {
  isResourcePoolFullError,
  isResourceNotPartOfPoolError,
  isNoMoreRetriesLeftError,
} from "./errors";
export * from "./factory";
export * from "./retry";
