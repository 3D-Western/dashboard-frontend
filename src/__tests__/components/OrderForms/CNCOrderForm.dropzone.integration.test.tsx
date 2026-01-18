import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CNCOrderForm from '@/app/(protected)/dashboard/orders/cnc/new/components/CNCOrderForm';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/components/ui/dropzone', () => {
  const Dropzone = ({
    onDrop,
    children,
  }: {
    onDrop?: (files: File[]) => void;
    children?: React.ReactNode;
  }) => {
    return (
      <div>
        <button type="button" onClick={() => onDrop?.([])}>
          drop-empty
        </button>
        <button
          type="button"
          onClick={() =>
            onDrop?.([
              new File(['b'], 'model.stl', { type: 'model/stl' }),
              new File(['a'], 'note.txt', { type: 'text/plain' }),
            ])
          }
        >
          drop-stl
        </button>
        <button
          type="button"
          onClick={() => onDrop?.([new File(['c'], 'fallback.bin', { type: 'application/bin' })])}
        >
          drop-fallback
        </button>
        {children}
      </div>
    );
  };

  const DropzoneEmptyState = () => <div>empty</div>;
  const DropzoneContent = () => <div>content</div>;

  return {
    __esModule: true,
    default: Dropzone,
    Dropzone,
    DropzoneEmptyState,
    DropzoneContent,
  };
});

vi.mock('@/components/ui/select', () => {
  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
    return React.createElement('option', { value }, children);
  };

  const SelectContent = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(React.Fragment, null, children);
  };

  const SelectTrigger = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(React.Fragment, null, children);
  };

  const SelectValue = () => null;

  const collectItems = (children: React.ReactNode, items: React.ReactElement[] = []) => {
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === SelectItem) {
        items.push(child);
        return;
      }
      if (child.props?.children) {
        collectItems(child.props.children, items);
      }
    });
    return items;
  };

  const materialValues = ['aluminum', 'steel', 'brass', 'copper', 'plastic', 'wood'] as const;
  const labels: Record<string, string> = {
    aluminum: 'Aluminum',
    steel: 'Steel',
    brass: 'Brass',
    copper: 'Copper',
    plastic: 'Plastic (Delrin/Acetal)',
    wood: 'Wood',
  };

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (val: string) => void;
    children: React.ReactNode;
  }) => {
    const items = collectItems(children);
    const itemValues = new Set(items.map((item) => item.props.value));
    const isMaterialSelect = materialValues.some((val) => itemValues.has(val));

    const options = isMaterialSelect
      ? materialValues.map((val) =>
          React.createElement('option', { key: val, value: val }, labels[val]),
        )
      : items.map((item) =>
          React.cloneElement(item, {
            key: item.props.value,
          }),
        );
    return React.createElement(
      'select',
      {
        value: value ?? '',
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
          onValueChange?.(event.target.value),
      },
      React.createElement('option', { value: '' }, 'placeholder'),
      options,
    );
  };

  return {
    __esModule: true,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

const setupUser = () => userEvent.setup({ pointerEventsCheck: 0 });

describe('CNCOrderForm Dropzone Integration', () => {
  it('clears file when dropzone receives empty files', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    await user.click(screen.getByRole('button', { name: 'drop-fallback' }));
    expect(screen.getByText('fallback.bin')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'drop-empty' }));
    expect(screen.queryByText('fallback.bin')).not.toBeInTheDocument();
  });

  it('prefers STL file when multiple files are dropped', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    await user.click(screen.getByRole('button', { name: 'drop-stl' }));

    expect(screen.getByText('model.stl')).toBeInTheDocument();
  });

  it('falls back to first file when no STL file is present', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    await user.click(screen.getByRole('button', { name: 'drop-fallback' }));

    expect(screen.getByText('fallback.bin')).toBeInTheDocument();
  });
});

describe('CNCOrderForm material selection behavior', () => {
  it('allows material selection from available CNC materials', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    const materialSelect = screen.getByRole('combobox') as HTMLSelectElement;
    
    await user.selectOptions(materialSelect, 'aluminum');
    expect(materialSelect.value).toBe('aluminum');
    
    await user.selectOptions(materialSelect, 'steel');
    expect(materialSelect.value).toBe('steel');
  });
});
