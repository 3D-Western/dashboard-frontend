import { setupServer } from 'msw/node';
import { jobHandlers } from './print-job-handlers';
import { sessionHandlers } from './session-handlers';
import { passwordResetHandlers } from './password-reset-handlers';
import { fileHandlers } from './file-handlers';
import { userHandlers } from './user-handlers';
import { mfaHandlers } from './mfa-handlers';
import { invitationHandlers } from './invitation-handlers';
import { iamHandlers } from './iam-handlers';
import { FileSystemUtils } from './utils/fileSystem';
import { bookingHandlers } from './booking-handlers';
import { trainingHandlers } from './training-handlers';

// Initialize tmp/ directory when server module loads
FileSystemUtils.initTmpDirectory();

export const mockServer = setupServer(
  ...sessionHandlers,
  ...userHandlers,
  ...jobHandlers,
  ...passwordResetHandlers,
  ...fileHandlers,
  ...mfaHandlers,
  ...invitationHandlers,
  ...iamHandlers,
  ...bookingHandlers,
  ...trainingHandlers,
);
