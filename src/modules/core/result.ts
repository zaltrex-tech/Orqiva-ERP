/**
 * Functional Result Pattern for Enterprise Domain Operations
 * Eliminates silent failures and forces explicit error handling
 */
export type Result<T, E = Error> =
  | { success: true; value: T; error?: never }
  | { success: false; error: E; value?: never };

export const ok = <T>(value: T): Result<T, never> => ({
  success: true,
  value,
});

export const err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});
