import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import LoginPage from './page';

vi.mock('./login-form', () => ({ LoginForm: () => null }));

describe('LoginPage layout', () => {
  it('starts the form at the top on phones so the keyboard does not cover Login, centred from md up', async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(container.firstElementChild).toHaveClass('justify-start', 'pt-16', 'md:justify-center');
  });

  it('keeps the form at max-w-md until lg, where the logo column appears beside it', async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(container.firstElementChild?.firstElementChild).toHaveClass(
      'max-w-md',
      'lg:max-w-4xl',
      'short:max-w-md',
    );
  });
});
