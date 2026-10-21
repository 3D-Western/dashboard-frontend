import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import LoginPage from './page';

vi.mock('./login-form', () => ({ LoginForm: () => null }));

describe('LoginPage layout', () => {
  it('starts the form at the top on phones so the keyboard does not cover Login, centred from md up', async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(container.firstElementChild).toHaveClass('justify-start', 'pt-16', 'md:justify-center');
  });
});
