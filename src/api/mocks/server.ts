// src/api/mocks/server.ts
import { setupServer } from 'msw/node';
import { bookingHandlers } from './booking-handlers';

// This configures a request interception layer for Node environment fetches
export const server = setupServer(...bookingHandlers);