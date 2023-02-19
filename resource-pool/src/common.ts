export const toError = (maybeError: unknown) =>
  maybeError instanceof Error ? maybeError : new Error("");
