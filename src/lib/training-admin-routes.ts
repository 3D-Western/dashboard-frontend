/** Pages of the admin training editor (`/admin/training`). Kept apart from `Routes` on purpose. */
export const TrainingAdminRoutes = {
  home: '/admin/training',
  equipment: '/admin/training/equipment',
  import: '/admin/training/import',
  auditLog: '/admin/training/audit-log',
  detail: (trainingId: number) => `/admin/training/${trainingId}`,
  draft: (trainingId: number) => `/admin/training/${trainingId}/draft`,
  questions: (trainingId: number) => `/admin/training/${trainingId}/questions`,
  settings: (trainingId: number) => `/admin/training/${trainingId}/settings`,
  report: (trainingId: number) => `/admin/training/${trainingId}/report`,
  preview: (trainingId: number, versionId: number) =>
    `/admin/training/${trainingId}/preview/${versionId}`,
} as const;
