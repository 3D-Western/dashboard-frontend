import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { ApiError } from './errors';
import { accessAdminAPI, accessAdminPaths } from './access-admin';

interface Seen {
  method: string;
  url: URL;
  body: string;
}

let seen: Seen[] = [];

function answer(data: unknown = null, init: { status?: number; error?: object } = {}) {
  mockServer.use(
    http.all('*/api/v1/*', async ({ request }) => {
      seen.push({ method: request.method, url: new URL(request.url), body: await request.text() });
      return HttpResponse.json(
        init.error ? { success: false, data: null, error: init.error } : { success: true, data },
        { status: init.status ?? 200 },
      );
    }),
  );
}

beforeEach(() => {
  seen = [];
});

describe('accessAdminAPI paths and bodies', () => {
  it('calls the endpoints of the contract', async () => {
    answer([]);
    await accessAdminAPI.listGatekeepers();
    await accessAdminAPI.registerGatekeeper({ name: 'PC' });
    await accessAdminAPI.updateGatekeeper(3, { active: false });
    await accessAdminAPI.rotateGatekeeperToken(3);
    await accessAdminAPI.listDevices();
    await accessAdminAPI.rotateDeviceKey(4);
    await accessAdminAPI.listMachines();
    await accessAdminAPI.getLive();

    expect(seen.map((s) => `${s.method} ${s.url.pathname}`)).toEqual([
      'GET /api/v1/admin/access/gatekeepers',
      'POST /api/v1/admin/access/gatekeepers',
      'PATCH /api/v1/admin/access/gatekeepers/3',
      'POST /api/v1/admin/access/gatekeepers/3/rotate-token',
      'GET /api/v1/admin/access/devices',
      'POST /api/v1/admin/access/devices/4/rotate-key',
      'GET /api/v1/admin/access/machines',
      'GET /api/v1/admin/access/live',
    ]);
    expect(JSON.parse(seen[1].body)).toEqual({ name: 'PC' });
    expect(JSON.parse(seen[2].body)).toEqual({ active: false });
  });

  it('sends device bodies as they are', async () => {
    answer({});
    await accessAdminAPI.registerDevice({
      deviceKey: 'k',
      kind: 'KIOSK',
      name: 'Entrance',
      gatekeeperId: 1,
    });
    await accessAdminAPI.updateDevice(9, { maxSessionMinutes: 0 });

    expect(JSON.parse(seen[0].body)).toEqual({
      deviceKey: 'k',
      kind: 'KIOSK',
      name: 'Entrance',
      gatekeeperId: 1,
    });
    expect(seen[1].url.pathname).toBe(accessAdminPaths.device(9));
    expect(JSON.parse(seen[1].body)).toEqual({ maxSessionMinutes: 0 });
  });

  it('encodes the student search and asks for one student’s cards', async () => {
    answer([]);
    await accessAdminAPI.searchStudents('ada l');
    answer({ data: [], pagination: {} });
    await accessAdminAPI.listCardLinks(251234567);

    expect(seen[0].url.searchParams.get('search')).toBe('ada l');
    expect(seen[1].url.pathname).toBe('/api/v1/admin/access/card-links');
    expect(seen[1].url.searchParams.get('studentId')).toBe('251234567');
  });

  it('sends the reason when closing a card link', async () => {
    answer({});
    await accessAdminAPI.deactivateCardLink(70, 'lost card');

    expect(seen[0].method).toBe('POST');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/access/card-links/70/deactivate');
    expect(JSON.parse(seen[0].body)).toEqual({ reason: 'lost card' });
  });

  it('raises an ApiError with the code and details the server sent', async () => {
    answer(null, {
      status: 409,
      error: {
        code: 'NAME_TAKEN',
        message: "A gatekeeper called 'PC' already exists.",
        details: null,
      },
    });

    await expect(accessAdminAPI.registerGatekeeper({ name: 'PC' })).rejects.toMatchObject({
      code: 'NAME_TAKEN',
    });
    await expect(accessAdminAPI.registerGatekeeper({ name: 'PC' })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
