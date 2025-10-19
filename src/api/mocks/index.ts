import { setupServer } from 'msw/node';
import { printJobHandlers } from './print-job-handlers';
import { sessionHandlers } from './session-handlers';

export const mockServer = setupServer(...sessionHandlers, ...printJobHandlers);
