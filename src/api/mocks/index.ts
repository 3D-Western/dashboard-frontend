import { setupServer } from 'msw/node';
import { orderHandlers } from './print-job-handlers';
import { sessionHandlers } from './session-handlers';

export const mockServer = setupServer(...sessionHandlers, ...orderHandlers);
