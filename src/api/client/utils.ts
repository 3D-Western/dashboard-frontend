export function getBaseUrl() {
  // Server-side: use the API URL so MSW can intercept it
  if (typeof window === 'undefined') {
    // Always use API_URL on server side (MSW intercepts this)
    return process.env.API_URL || 'http://localhost:8000';
  }
  // Client-side: use relative URL (empty string)
  return '';
}
