// Cesium Ion Configuration
export const CESIUM_CONFIG = {
    tokenName: 'first',
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZmVlY2ZkMC05NGVmLTQyMDAtYTg4OS1lMzJlNmE5OWIzOTQiLCJpZCI6MjUzODE2LCJpYXQiOjE3NjMxNDg5MDF9.Lx_sgH5AYLgtDEedYhONCEwItsyH0rDIIaKCd1tPFVU'
};

// OpenRouteService Configuration
// For Vercel: uses /api/isochrones proxy (API key handled server-side)
// For local dev: uses direct API with API key below
export const ORS_CONFIG = {
    apiKey: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ3YzRjNGQ4ZDZhNzRhNGU5ZDdkMzY4OTg1ZGRlMzM0IiwiaCI6Im11cm11cjY0In0=', // Used for local dev
    url: 'https://api.openrouteservice.org/v2/isochrones/foot-walking' // Direct API URL
};

// Debug: Log config values
console.log('ORS_CONFIG loaded:', {
    url: ORS_CONFIG.url,
    usingProxy: ORS_CONFIG.url.startsWith('/api/'),
    note: 'API key is handled server-side via proxy'
});

