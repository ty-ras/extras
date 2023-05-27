/**
 * @file This file contains code shared by internal parts of this library.
 */

/**
 * Creates new {@link Error} from something which might be an existing {@link Error}.
 * @param maybeError Object which might be {@link Error}.
 * @returns The {@link Error}, either as-is, or with message wrapping actual value.
 */
export const toError = (maybeError: unknown) =>
  maybeError instanceof Error ? maybeError : new Error(`Error: ${maybeError}`);
