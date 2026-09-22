import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from '../axios';
import useStore from '../../store/useStore';

describe('config/axios.js - Interceptor Unit Tests', () => {
  let requestInterceptor;
  let responseSuccessInterceptor;
  let responseErrorInterceptor;
  const originalLocation = window.location;

  beforeEach(() => {
    useStore.setState({ user: null, token: null });

    // Retrieve interceptor handlers registered on api instance
    const reqHandler = api.interceptors.request.handlers[0];
    requestInterceptor = reqHandler.fulfilled;

    const resHandler = api.interceptors.response.handlers[0];
    responseSuccessInterceptor = resHandler.fulfilled;
    responseErrorInterceptor = resHandler.rejected;

    // Mock window.location
    delete window.location;
    window.location = { href: 'http://localhost/' };
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  describe('Request Interceptor', () => {
    it('attaches Bearer token to Authorization header when token exists in store', () => {
      useStore.setState({
        token: 'test-valid-jwt-token',
        user: { id: 1, role: 'admin' },
      });

      const config = { headers: {} };
      const modifiedConfig = requestInterceptor(config);

      expect(modifiedConfig.headers.Authorization).toBe('Bearer test-valid-jwt-token');
    });

    it('does not attach Authorization header when no token is in store', () => {
      useStore.setState({ token: null, user: null });

      const config = { headers: {} };
      const modifiedConfig = requestInterceptor(config);

      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });

    it('preserves existing custom headers', () => {
      useStore.setState({ token: 'xyz123' });

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Client': 'PharmacyApp',
        },
      };
      const modifiedConfig = requestInterceptor(config);

      expect(modifiedConfig.headers['Content-Type']).toBe('application/json');
      expect(modifiedConfig.headers['X-Custom-Client']).toBe('PharmacyApp');
      expect(modifiedConfig.headers.Authorization).toBe('Bearer xyz123');
    });
  });

  describe('Response Interceptor', () => {
    it('passes successful 2xx responses straight through', () => {
      const mockResponse = { status: 200, data: { success: true } };
      const result = responseSuccessInterceptor(mockResponse);
      expect(result).toBe(mockResponse);
    });

    it('handles 401 error by calling store logout and redirecting to /login', async () => {
      const logoutSpy = vi.spyOn(useStore.getState(), 'logout');
      useStore.setState({
        user: { id: 5, role: 'shopkeeper' },
        token: 'expired-token',
      });

      const error401 = {
        response: {
          status: 401,
          data: { error: 'Token expired' },
        },
      };

      await expect(responseErrorInterceptor(error401)).rejects.toEqual(error401);

      expect(useStore.getState().token).toBeNull();
      expect(useStore.getState().user).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('does not trigger logout on other errors (e.g. 500, 404, 403, network failure)', async () => {
      useStore.setState({
        user: { id: 5, role: 'admin' },
        token: 'valid-token',
      });

      const error500 = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };

      await expect(responseErrorInterceptor(error500)).rejects.toEqual(error500);

      // Auth state intact
      expect(useStore.getState().token).toBe('valid-token');
      expect(window.location.href).toBe('http://localhost/');
    });

    it('normalizes and rejects network errors without response object', async () => {
      const networkError = new Error('Network Error');

      await expect(responseErrorInterceptor(networkError)).rejects.toThrow('Network Error');
      expect(window.location.href).toBe('http://localhost/');
    });
  });
});
