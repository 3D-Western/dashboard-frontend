import { describe, it, expect } from 'vitest';
import { Routes } from './routes';

describe('Routes', () => {
  describe('public routes', () => {
    it('defines login route', () => {
      expect(Routes.login).toBe('/login');
    });

    it('defines signup route', () => {
      expect(Routes.signup).toBe('/signup');
    });

    it('defines mfa route', () => {
      expect(Routes.mfa).toBe('/mfa');
    });

    it('defines forgot password route', () => {
      expect(Routes.forgotPassword).toBe('/forgot-password');
    });

    it('defines reset password route', () => {
      expect(Routes.resetPassword).toBe('/reset-password');
    });
  });

  describe('user dashboard routes', () => {
    it('defines dashboard route', () => {
      expect(Routes.dashboard).toBe('/dashboard');
    });

    it('defines prints route', () => {
      expect(Routes.prints).toBe('/print');
    });

    it('defines dashboard user settings route', () => {
      expect(Routes.dashboardUserSettings).toBe('/dashboard/settings');
    });
  });

  describe('admin routes', () => {
    it('defines admin users management route', () => {
      expect(Routes.adminUsersManagement).toBe('/admin/users');
    });

    it('defines admin prints management route', () => {
      expect(Routes.adminPrintsManagement).toBe('/admin/prints');
    });
  });

  describe('route structure', () => {
    it('has all required routes', () => {
      expect(Routes).toHaveProperty('dashboard');
      expect(Routes).toHaveProperty('prints');
      expect(Routes).toHaveProperty('login');
      expect(Routes).toHaveProperty('signup');
      expect(Routes).toHaveProperty('mfa');
      expect(Routes).toHaveProperty('dashboardUserSettings');
      expect(Routes).toHaveProperty('forgotPassword');
      expect(Routes).toHaveProperty('resetPassword');
      expect(Routes).toHaveProperty('adminUsersManagement');
      expect(Routes).toHaveProperty('adminPrintsManagement');
    });

    it('all routes are strings', () => {
      Object.values(Routes).forEach((route) => {
        expect(typeof route).toBe('string');
      });
    });

    it('all routes start with forward slash', () => {
      Object.values(Routes).forEach((route) => {
        expect(route).toMatch(/^\//);
      });
    });

    it('admin routes start with /admin', () => {
      expect(Routes.adminUsersManagement).toMatch(/^\/admin/);
      expect(Routes.adminPrintsManagement).toMatch(/^\/admin/);
    });

    it('dashboard routes start with /dashboard', () => {
      expect(Routes.dashboard).toMatch(/^\/dashboard/);
      expect(Routes.dashboardUserSettings).toMatch(/^\/dashboard/);
    });
  });
});
