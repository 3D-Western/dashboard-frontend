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

    it('defines dashboard user settings route', () => {
      expect(Routes.dashboardUserSettings).toBe('/dashboard/settings');
    });

    it('defines jobs home route', () => {
      expect(Routes.jobs.home).toBe('/dashboard/jobs');
    });
  });

  describe('admin routes', () => {
    it('defines admin users management route', () => {
      expect(Routes.adminUsersManagement).toBe('/admin/users');
    });

    it('defines admin jobs management route', () => {
      expect(Routes.adminJobsManagement).toBe('/admin/jobs');
    });

    it('defines admin bookings management route', () => {
      expect(Routes.adminBookingsManagement).toBe('/admin/bookings');
    });

    it('defines admin booking requests route', () => {
      expect(Routes.adminBookingRequests).toBe('/admin/requests');
    });

    it('defines admin equipment management route', () => {
      expect(Routes.adminEquipmentManagement).toBe('/admin/equipment');
    });
  });

  describe('route structure', () => {
    it('has all required routes', () => {
      expect(Routes).toHaveProperty('dashboard');
      expect(Routes).toHaveProperty('login');
      expect(Routes).toHaveProperty('signup');
      expect(Routes).toHaveProperty('mfa');
      expect(Routes).toHaveProperty('dashboardUserSettings');
      expect(Routes).toHaveProperty('forgotPassword');
      expect(Routes).toHaveProperty('resetPassword');
      expect(Routes).toHaveProperty('adminUsersManagement');
      expect(Routes).toHaveProperty('adminJobsManagement');
      expect(Routes).toHaveProperty('adminBookingsManagement');
      expect(Routes).toHaveProperty('adminBookingRequests');
      expect(Routes).toHaveProperty('adminEquipmentManagement');
      expect(Routes).toHaveProperty('jobs');
    });

    // Helper to get all string routes (flattens nested objects)
    const getAllRoutes = (obj: Record<string, unknown>, prefix = ''): string[] => {
      const routes: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          routes.push(value);
        } else if (typeof value === 'object' && value !== null) {
          routes.push(...getAllRoutes(value as Record<string, unknown>, `${prefix}${key}.`));
        }
      }
      return routes;
    };

    it('all routes are strings', () => {
      const allRoutes = getAllRoutes(Routes);
      allRoutes.forEach((route) => {
        expect(typeof route).toBe('string');
      });
    });

    it('all routes start with forward slash', () => {
      const allRoutes = getAllRoutes(Routes);
      allRoutes.forEach((route) => {
        expect(route).toMatch(/^\//);
      });
    });

    it('admin routes start with /admin', () => {
      expect(Routes.adminUsersManagement).toMatch(/^\/admin/);
      expect(Routes.adminJobsManagement).toMatch(/^\/admin/);
    });

    it('dashboard routes start with /dashboard', () => {
      expect(Routes.dashboard).toMatch(/^\/dashboard/);
      expect(Routes.dashboardUserSettings).toMatch(/^\/dashboard/);
    });
  });
});
