import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { Mock } from 'vitest';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { TrainingProvider } from '@/components/TrainingAdmin/TrainingContext';
import { UserProvider } from '@/providers/user-provider';
import type { AdminTraining } from '@/types/training-admin';
import type { User } from '@/types/user';
import { createMockUser, perm } from './mockFactories';
import { createAdminTraining } from './trainingAdminFactories';

/** A signed-in user holding the given training permissions (any scope). */
export const trainingUser = (...keys: ('training:author' | 'training:publish')[]): User =>
  createMockUser({ permissions: keys.map((key) => perm(key)) });

export const authorUser = () => trainingUser('training:author');
export const publisherUser = () => trainingUser('training:author', 'training:publish');

/**
 * Renders [ui] inside the signed-in user and the training context, as the real pages are. The
 * test file must mock `@/api/client/training-admin`; this loads the training through that mock.
 */
export async function renderInTraining(
  ui: ReactElement,
  options: { training?: AdminTraining; user?: User | null } = {},
) {
  const training = options.training ?? createAdminTraining();
  (trainingAdminAPI.getTraining as unknown as Mock).mockResolvedValue(training);
  const view = render(
    <UserProvider user={options.user === undefined ? publisherUser() : options.user}>
      <TrainingProvider trainingId={training.id}>{ui}</TrainingProvider>
    </UserProvider>,
  );
  // A dialog opened by [ui] hides the page behind it from the accessibility tree.
  await screen.findByRole('heading', { name: training.title, hidden: true });
  return view;
}
