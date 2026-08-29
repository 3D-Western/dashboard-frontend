import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@test/utils/render';
import { CheckboxGroupField } from '@/components/CheckboxGroupField';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('CheckboxGroupField Integration', () => {
  it('renders all options', () => {
    render(<CheckboxGroupField options={options} value={[]} onChange={vi.fn()} />);

    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('calls onChange with the value added when an unchecked option is clicked', () => {
    const onChange = vi.fn();
    render(<CheckboxGroupField options={options} value={['a']} onChange={onChange} />);

    screen.getAllByRole('checkbox')[1].click();

    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('calls onChange with the value removed when a checked option is clicked', () => {
    const onChange = vi.fn();
    render(<CheckboxGroupField options={options} value={['a', 'b']} onChange={onChange} />);

    screen.getAllByRole('checkbox')[0].click();

    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('reflects checked state from the value prop', () => {
    render(<CheckboxGroupField options={options} value={['a']} onChange={vi.fn()} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });
});
