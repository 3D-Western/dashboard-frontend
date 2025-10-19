export function getBaseUrl() {
  // Server-side: use the API URL (MSW will intercept if mocking is enabled)
  if (typeof window === "undefined") {
    return process.env.API_URL || "http://localhost:8000";
  }
  // Client-side: use the API URL (MSW will intercept if mocking is enabled)
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}
