/**
 * Check if dev mode is enabled via NEXT_PUBLIC_DEV_MODE env var.
 * When dev mode is on, mock/seed data is used as fallback in the UI.
 */
export function useDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === "true";
}
