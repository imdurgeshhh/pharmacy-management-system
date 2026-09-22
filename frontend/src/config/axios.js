import axios from 'axios';
import useStore from '../store/useStore';

let rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!rawBaseUrl) {
    throw new Error('Missing VITE_API_BASE_URL in your .env file.');
}

// Normalize: remove trailing slashes and ensure /api endpoint suffix
rawBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const apiBaseUrl = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

const api = axios.create({
    baseURL: apiBaseUrl,
    timeout: 30000, // 30s timeout to allow for PaaS cold-starts (e.g. Render spin-up)
});

/**
 * Module-level token store.
 * App.jsx (ClerkTokenSync) calls setAuthToken() whenever Clerk's session token
 * changes. The request interceptor below reads it on every outgoing request.
 */
let _clerkToken = null;

export function setAuthToken(token) {
    _clerkToken = token;
    // Keep in sync with useStore for backward compatibility and testing
    if (useStore.getState().token !== token) {
        useStore.setState({ token });
    }
}

export function clearAuthToken() {
    _clerkToken = null;
    if (useStore.getState().token !== null) {
        useStore.setState({ token: null });
    }
}

// Attach token to every outgoing request (synchronous for test compatibility)
api.interceptors.request.use(
    (config) => {
        const token = _clerkToken || useStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: auto-refreshes expired Clerk token or redirects to /login on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.warn('[API] 401 Unauthorized — Clerk session token may be missing or expired.');
            const originalRequest = error.config;

            // Attempt silent token refresh and retry once if Clerk session is active in browser
            if (originalRequest && !originalRequest._retry && typeof window !== 'undefined' && window.Clerk?.session) {
                originalRequest._retry = true;
                try {
                    const freshToken = await window.Clerk.session.getToken({ skipCache: true });
                    if (freshToken) {
                        setAuthToken(freshToken);
                        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
                        return api(originalRequest);
                    }
                } catch (refreshErr) {
                    console.warn('[API] Token refresh retry failed:', refreshErr);
                }
            }

            // If refresh fails or user has no session, clear store and redirect to /login
            const logout = useStore.getState().logout;
            if (typeof logout === 'function') {
                logout();
            }
            useStore.setState({ user: null, token: null });

            if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
