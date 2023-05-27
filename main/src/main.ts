/**
 * @file This file contains functionality related to invoking asynchronous functions as program main functions, calling `process.exit` as necessary after they have completed.
 */

/**
 * Calls given asynchronous callback `await` on result.
 * Once it is done, calls `process.exit` with exit code:
 * - `0` if no error was thrown, or
 * - `1` if error was thrown.
 * @param main The callback to get `Promise` to `await` on.
 * @returns Asynchronously returns nothing.
 */
export function invokeMain<T>(main: () => Promise<T>): Promise<void>;

/**
 * Calls given asynchronous callback `await` on result.
 * Once it is done, calls `process.exit` only if the error is thrown.
 * Otherwise, returns the exit code.
 * @param main The callback to get `Promise` to `await` on.
 * @param dontCallProcessExit Set to `true` in order to skip calling `process.exit` on successful invocations (no error is thrown).
 * @returns Asynchronously returns either `0` or `1`. The value `0` is returned if there were no errors thrown. Returns `1` otherwise.
 */
export function invokeMain<T>(
  main: () => Promise<T>,
  dontCallProcessExit: true,
): Promise<1 | 0>;

/* c8 ignore start */

/**
 * Calls given asynchronous callback `await` on result.
 * Once it is done, calls `process.exit` only if the error is thrown.
 * Otherwise, returns the exit code.
 * @param main The callback to get `Promise` to `await` on.
 * @param dontCallProcessExit Set to `true` in order to skip calling `process.exit` on successful invocations (no error is thrown).
 * @returns Asynchronously returns either `0` or `1`. The value `0` is returned if there were no errors thrown. Returns `1` otherwise.
 */
export async function invokeMain<T>(
  main: () => Promise<T>,
  dontCallProcessExit?: boolean,
): Promise<void | 1 | 0> {
  const { callProcessExit, exitCode } = await invokeMainAndGetInfo(
    main,
    dontCallProcessExit,
  );
  if (callProcessExit) {
    process.exit(exitCode);
  }
  return exitCode;
}
/* c8 ignore stop */

/**
 * Auxiliary function to call given callback to get a Promise and `await` on it, and return information indicating exit code and whether `process.exit` should be called.
 * @param main The callback to get `Promise` to `await` on.
 * @param dontCallProcessExit Set to `true` in order to result `callProcessExit` to be `false` even when there are no errors.
 * @returns Information used by {@link invokeMain}
 */
export const invokeMainAndGetInfo = async <TResult>(
  main: () => Promise<TResult>,
  dontCallProcessExit?: boolean,
) => {
  let exitCode: 1 | 0 = 1;
  try {
    await main();
    exitCode = 0;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error", e);
  }
  return {
    callProcessExit: dontCallProcessExit !== true || exitCode !== 0,
    exitCode,
  };
};
