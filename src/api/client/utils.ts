export function getBaseUrl() {
  // Server-side: use the internal Docker network URL
  if (typeof window === 'undefined') {
    if (process.env.MOCK_ENABLED === 'true') {
      // If mock server is enabled, server will just use the public URL
      return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
    } else {
      // If mock server is not enabled, use the API URL from environment variables
      return process.env.API_URL || 'http://localhost:3000';
    }
  }
  // Client-side: use relative URL (empty string)
  return '';
}
