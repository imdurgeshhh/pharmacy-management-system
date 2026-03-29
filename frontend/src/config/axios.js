import axios from 'axios';
import useStore from '../store/useStore';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 10000,
});

// Auth interceptor - add token + role headers to every request
api.interceptors.request.use((config) => {
    const state = useStore.getState();
    const token = state.token;
    const user  = state.user;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (user?.role) {
        config.headers['x-user-role'] = user.role.toLowerCase();
    }
    if (user?.id) {
        config.headers['x-user-id'] = user.id;
    }
    return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
