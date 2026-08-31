import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { ProjectPurposeField } from './ProjectPurposeField';

const setupUser = () => userEvent.setup({ pointerEventsCheck: 0 });

function TestHost() {
  const form = useForm({ defaultValues: { purpose: '' } });
  return (
    <Form {...form}>
      <ProjectPurposeField />
    </Form>
  );
}

describe('ProjectPurposeField', () => {
  it('renders the label and rate-limiting disclaimer', () => {
    render(<TestHost />);

    expect(screen.getByText('Project Purpose')).toBeInTheDocument();
    const disclaimer = screen.getByText(
      /Non-entrepreneurial projects are subject to heavy rate limiting\./i,
    );
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveClass('text-destructive');
  });

  it('starts with the placeholder and no purpose selected', () => {
    render(<TestHost />);

    expect(screen.getByText('Select a purpose')).toBeInTheDocument();
  });

  it('lists every purpose option, including Entrepreneurial Project', async () => {
    const user = setupUser();
    render(<TestHost />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');

    for (const label of [
      'Casual / Recreation',
      'Personal Project',
      'School Project',
      'Academic Research',
      'Charity / Community',
      'Product Development',
      'Entrepreneurial Project',
    ]) {
      expect(within(listbox).getByRole('option', { name: label })).toBeInTheDocument();
    }
  });

  it('selecting Entrepreneurial Project updates the trigger', async () => {
    const user = setupUser();
    render(<TestHost />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: 'Entrepreneurial Project' }));

    expect(screen.getByRole('combobox')).toHaveTextContent('Entrepreneurial Project');
  });
});
