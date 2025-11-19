// Environment configuration for API and Socket.io connections
// In production, these should be set via environment variables

export const config = {
  // API base URL - defaults to current origin in browser, or env var
  apiUrl: import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  
  // Socket.io server URL - defaults to current origin, or env var
  socketUrl: import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
};

