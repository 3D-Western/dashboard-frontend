export const endpoints = {
  session: {
    current: '/api/v1/session/current',
    login: '/api/v1/session/login',
    logout: '/api/v1/session/logout',
  },
  passwordReset: {
    request: '/api/v1/password-reset/request',
    verify: '/api/v1/password-reset/verify',
    complete: '/api/v1/password-reset/complete',
  },
  orders: {
    list: '/api/v1/orders',
    byId: (orderId: string) => `/api/v1/orders/${orderId}`,
    create: '/api/v1/orders',
    cancel: (orderId: string) => `/api/v1/orders/active/cancel/${orderId}`,
  },
  files: {
    upload: '/api/v1/files/upload',
    list: '/api/v1/files',
    byId: (fileId: string) => `/api/v1/files/${fileId}`,
    delete: (fileId: string) => `/api/v1/files/${fileId}`,
    download: (fileId: string) => `/api/v1/files/${fileId}/download`,
  },
};
