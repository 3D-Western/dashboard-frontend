export const endpoints = {
  session: {
    current: '/api/v1/session/current',
    login: '/api/v1/session/login',
    logout: '/api/v1/session/logout',
  },
  jobs: {
    listAllActiveJobs: '/api/v1/jobs',
    updateStatus: (jobId: string) => `/api/v1/jobs/${jobId}/status`,
    delete: (jobId: string) => `/api/v1/jobs/${jobId}`,
  },
};
