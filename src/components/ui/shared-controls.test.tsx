import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { Button } from './button';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { Select, SelectTrigger, SelectValue } from './select';

// Phones (the default) get 44 px tap targets and 16 px text fields; from md up the original
// desktop sizes come back. These tests pin the class names that carry those sizes.
describe('shared controls on phones and desktop', () => {
  it('gives default buttons a 44 px phone height and keeps the 32 px desktop height', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toHaveClass('[--btn-h:2.75rem]', 'fine:[--btn-h:2rem]');
    expect(button.className).not.toContain('md:[--btn-h');
  });

  it('gives icon and small buttons 44 px on phones with their desktop heights from md', () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button size="icon-sm" aria-label="Icon small" />
        <Button size="lg">Large</Button>
        <Button size="icon-lg" aria-label="Icon large" />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass(
      '[--btn-h:2.75rem]',
      'fine:[--btn-h:1.75rem]',
    );
    expect(screen.getByRole('button', { name: 'Icon small' })).toHaveClass(
      '[--btn-h:2.75rem]',
      'fine:[--btn-h:1.75rem]',
    );
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass(
      '[--btn-h:2.75rem]',
      'fine:[--btn-h:2.25rem]',
    );
    expect(screen.getByRole('button', { name: 'Icon large' })).toHaveClass(
      '[--btn-h:2.75rem]',
      'fine:[--btn-h:2.25rem]',
    );
  });

  it('gives text inputs 16 px text and a 44 px phone height', () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole('textbox', { name: 'Name' });

    expect(input).toHaveClass('text-base', '[--input-h:2.75rem]', 'fine:[--input-h:2rem]');
  });

  it('makes checkboxes 20 px on phones and 16 px from md, with a 44 px hit area', () => {
    render(<Checkbox aria-label="Accept" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Accept' });

    expect(checkbox).toHaveClass(
      'size-5',
      'fine:size-4',
      'after:-inset-3',
      'fine:after:-inset-x-3',
      'fine:after:-inset-y-2',
    );
  });

  it('makes select triggers 44 px on phones and 32 px from md', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Faculty">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Faculty' });

    expect(trigger).toHaveClass('data-[size=default]:h-11', 'fine:data-[size=default]:h-8');
  });
});
