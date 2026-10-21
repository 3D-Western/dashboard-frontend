import { apiRequest } from './base';
import { getBaseUrl } from './utils';
import type { PaginatedResponse } from '@/types/common';
import type {
  AccessDevice,
  AccessMachine,
  AccessStudent,
  CardLink,
  CreateDeviceBody,
  DeviceSecret,
  Gatekeeper,
  GatekeeperBody,
  GatekeeperSecret,
  LiveAccess,
  UpdateDeviceBody,
} from '@/types/access-admin';

/** Paths of the admin access API (docs/specs/gatekeeper-contract.md, section 5). All need `access:admin`. */
const ADMIN = '/api/v1/admin/access';
export const accessAdminPaths = {
  gatekeepers: `${ADMIN}/gatekeepers`,
  gatekeeper: (id: number) => `${ADMIN}/gatekeepers/${id}`,
  rotateToken: (id: number) => `${ADMIN}/gatekeepers/${id}/rotate-token`,
  devices: `${ADMIN}/devices`,
  device: (id: number) => `${ADMIN}/devices/${id}`,
  rotateKey: (id: number) => `${ADMIN}/devices/${id}/rotate-key`,
  machines: `${ADMIN}/machines`,
  students: `${ADMIN}/students`,
  live: `${ADMIN}/live`,
  cardLinks: `${ADMIN}/card-links`,
  deactivateCardLink: (id: number) => `${ADMIN}/card-links/${id}/deactivate`,
};

const request = <T>(method: string, path: string, body?: unknown) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

export const accessAdminAPI = {
  listGatekeepers: () => request<Gatekeeper[]>('GET', accessAdminPaths.gatekeepers),
  registerGatekeeper: (body: GatekeeperBody) =>
    request<GatekeeperSecret>('POST', accessAdminPaths.gatekeepers, body),
  updateGatekeeper: (id: number, body: GatekeeperBody) =>
    request<Gatekeeper>('PATCH', accessAdminPaths.gatekeeper(id), body),
  rotateGatekeeperToken: (id: number) =>
    request<GatekeeperSecret>('POST', accessAdminPaths.rotateToken(id)),

  listDevices: () => request<AccessDevice[]>('GET', accessAdminPaths.devices),
  registerDevice: (body: CreateDeviceBody) =>
    request<DeviceSecret>('POST', accessAdminPaths.devices, body),
  updateDevice: (id: number, body: UpdateDeviceBody) =>
    request<AccessDevice>('PATCH', accessAdminPaths.device(id), body),
  rotateDeviceKey: (id: number) => request<DeviceSecret>('POST', accessAdminPaths.rotateKey(id)),

  listMachines: () => request<AccessMachine[]>('GET', accessAdminPaths.machines),
  searchStudents: (search: string) =>
    request<AccessStudent[]>(
      'GET',
      `${accessAdminPaths.students}?search=${encodeURIComponent(search)}`,
    ),
  getLive: () => request<LiveAccess>('GET', accessAdminPaths.live),

  /** Every card link for one student, newest first (closed ones included). */
  listCardLinks: (studentNumber: number) =>
    request<PaginatedResponse<CardLink>>(
      'GET',
      `${accessAdminPaths.cardLinks}?studentId=${studentNumber}&pageSize=100`,
    ),
  deactivateCardLink: (id: number, reason: string) =>
    request<CardLink>('POST', accessAdminPaths.deactivateCardLink(id), { reason }),
};
