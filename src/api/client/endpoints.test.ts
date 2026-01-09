import { describe, it, expect } from 'vitest';
import { endpoints } from './endpoints';

describe('endpoints', () => {
  describe('auth endpoints', () => {
    it('defines login endpoint', () => {
      expect(endpoints.auth.login).toBe('/api/v1/auth/login');
    });

    it('defines logout endpoint', () => {
      expect(endpoints.auth.logout).toBe('/api/v1/auth/logout');
    });

    it('defines refresh endpoint', () => {
      expect(endpoints.auth.refresh).toBe('/api/v1/auth/refresh');
    });

    it('defines signup endpoint', () => {
      expect(endpoints.auth.signup).toBe('/api/v1/auth/signup');
    });
  });

  describe('session endpoints', () => {
    it('defines current session endpoint', () => {
      expect(endpoints.session.current).toBe('/api/v1/session/current');
    });
  });

  describe('passwordReset endpoints', () => {
    it('defines request endpoint', () => {
      expect(endpoints.passwordReset.request).toBe('/api/v1/password-reset/request');
    });

    it('defines verify endpoint', () => {
      expect(endpoints.passwordReset.verify).toBe('/api/v1/password-reset/verify');
    });

    it('defines complete endpoint', () => {
      expect(endpoints.passwordReset.complete).toBe('/api/v1/password-reset/complete');
    });
  });

  describe('users endpoints', () => {
    it('defines me endpoint', () => {
      expect(endpoints.users.me).toBe('/api/v1/users/me');
    });

    it('defines list endpoint', () => {
      expect(endpoints.users.list).toBe('/api/v1/users');
    });

    it('generates byId endpoint with user ID', () => {
      expect(endpoints.users.byId(123)).toBe('/api/v1/users/123');
      expect(endpoints.users.byId(251000001)).toBe('/api/v1/users/251000001');
    });
  });

  describe('orders endpoints', () => {
    it('defines list endpoint', () => {
      expect(endpoints.orders.list).toBe('/api/v1/orders');
    });

    it('defines create endpoint', () => {
      expect(endpoints.orders.create).toBe('/api/v1/orders');
    });

    it('generates byId endpoint with order ID', () => {
      expect(endpoints.orders.byId('abc123')).toBe('/api/v1/orders/abc123');
      expect(endpoints.orders.byId('order-456')).toBe('/api/v1/orders/order-456');
    });

    it('generates cancel endpoint with order ID', () => {
      expect(endpoints.orders.cancel('abc123')).toBe('/api/v1/orders/active/cancel/abc123');
      expect(endpoints.orders.cancel('order-456')).toBe('/api/v1/orders/active/cancel/order-456');
    });
  });

  describe('files endpoints', () => {
    it('defines upload endpoint', () => {
      expect(endpoints.files.upload).toBe('/api/v1/files/upload');
    });

    it('defines list endpoint', () => {
      expect(endpoints.files.list).toBe('/api/v1/files');
    });

    it('generates byId endpoint with file ID', () => {
      expect(endpoints.files.byId('file123')).toBe('/api/v1/files/file123');
      expect(endpoints.files.byId('abc-def-456')).toBe('/api/v1/files/abc-def-456');
    });

    it('generates delete endpoint with file ID', () => {
      expect(endpoints.files.delete('file123')).toBe('/api/v1/files/file123');
      expect(endpoints.files.delete('abc-def-456')).toBe('/api/v1/files/abc-def-456');
    });

    it('generates download endpoint with file ID', () => {
      expect(endpoints.files.download('file123')).toBe('/api/v1/files/file123/download');
      expect(endpoints.files.download('abc-def-456')).toBe('/api/v1/files/abc-def-456/download');
    });
  });

  describe('mfa endpoints', () => {
    it('defines verifyEmail endpoint', () => {
      expect(endpoints.mfa.verifyEmail).toBe('/api/v1/mfa/email/verify');
    });

    it('generates resendEmail endpoint with challenge ID', () => {
      expect(endpoints.mfa.resendEmail(1)).toBe('/api/v1/mfa/email/challenge/1/resend');
      expect(endpoints.mfa.resendEmail(12345)).toBe('/api/v1/mfa/email/challenge/12345/resend');
    });
  });

  describe('endpoint structure', () => {
    it('has all required top-level categories', () => {
      expect(endpoints).toHaveProperty('auth');
      expect(endpoints).toHaveProperty('session');
      expect(endpoints).toHaveProperty('passwordReset');
      expect(endpoints).toHaveProperty('users');
      expect(endpoints).toHaveProperty('orders');
      expect(endpoints).toHaveProperty('files');
      expect(endpoints).toHaveProperty('mfa');
    });

    it('all auth endpoints are strings', () => {
      expect(typeof endpoints.auth.login).toBe('string');
      expect(typeof endpoints.auth.logout).toBe('string');
      expect(typeof endpoints.auth.refresh).toBe('string');
      expect(typeof endpoints.auth.signup).toBe('string');
    });

    it('all session endpoints are strings', () => {
      expect(typeof endpoints.session.current).toBe('string');
    });

    it('all passwordReset endpoints are strings', () => {
      expect(typeof endpoints.passwordReset.request).toBe('string');
      expect(typeof endpoints.passwordReset.verify).toBe('string');
      expect(typeof endpoints.passwordReset.complete).toBe('string');
    });

    it('users.byId is a function', () => {
      expect(typeof endpoints.users.byId).toBe('function');
    });

    it('orders.byId and orders.cancel are functions', () => {
      expect(typeof endpoints.orders.byId).toBe('function');
      expect(typeof endpoints.orders.cancel).toBe('function');
    });

    it('file endpoint functions are defined', () => {
      expect(typeof endpoints.files.byId).toBe('function');
      expect(typeof endpoints.files.delete).toBe('function');
      expect(typeof endpoints.files.download).toBe('function');
    });

    it('mfa.resendEmail is a function', () => {
      expect(typeof endpoints.mfa.resendEmail).toBe('function');
    });
  });
});
