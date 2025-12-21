import { setupServer } from 'msw/node';
import { orderHandlers } from './print-job-handlers';
import { sessionHandlers } from './session-handlers';
import { passwordResetHandlers } from './password-reset-handlers';
import { fileHandlers } from './file-handlers';
import { FileSystemUtils } from './utils/fileSystem';

// Initialize tmp/ directory when server module loads
FileSystemUtils.initTmpDirectory();

export const mockServer = setupServer(
  ...sessionHandlers,
  ...orderHandlers,
  ...passwordResetHandlers,
  ...fileHandlers,
);
