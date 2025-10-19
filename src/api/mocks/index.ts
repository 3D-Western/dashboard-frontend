import { setupServer } from 'msw/node';
import { sessionHandlers } from './session-handlers';

export const mockServer = setupServer(...sessionHandlers);
