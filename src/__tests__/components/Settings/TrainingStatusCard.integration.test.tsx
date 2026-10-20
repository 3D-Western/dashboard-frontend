import { describe, it, expect } from 'vitest';
import { render } from '@test/utils/render';
import { TrainingStatusCard } from '@/app/(protected)/dashboard/settings/components/TrainingStatusCard';

describe('TrainingStatusCard Integration', () => {
  it('renders nothing until real certifications are shown', () => {
    const { container } = render(<TrainingStatusCard />);

    expect(container).toBeEmptyDOMElement();
  });
});
