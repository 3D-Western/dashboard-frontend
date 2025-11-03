export const endpoints = {
  session: {
    current: '/api/v1/session/current',
    login: '/api/v1/session/login',
    logout: '/api/v1/session/logout',
  },
  orders: {
    list: '/api/v1/orders',
    byId: (orderId: string) => `/api/v1/orders/${orderId}`,
    create: '/api/v1/orders',
  },
};
