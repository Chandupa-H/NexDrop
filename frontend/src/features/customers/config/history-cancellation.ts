/**
 * Keep history cancellation disabled until authenticated ownership is enforced
 * by the backend and its mock-success fallbacks are resolved. This is deliberately
 * not controlled by URL parameters, browser storage, props, or public environment variables.
 * Both the drawer and the history server action check this policy.
 */
export const historyCancellationPolicy = {
  enabled: false,
  message: "Live cancellation is unavailable until the backend verifies customer ownership. You can review the confirmation, but cannot submit it.",
} as const;
