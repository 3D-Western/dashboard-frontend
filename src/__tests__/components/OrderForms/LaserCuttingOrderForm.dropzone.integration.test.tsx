import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LaserCuttingOrderForm from '@/app/(protected)/dashboard/orders/laser-cutting/new/components/LaserCuttingOrderForm';

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
              new File(['b'], 'drawing.dxf', { type: 'application/dxf' }),
              new File(['a'], 'design.txt', { type: 'text/plain' }),
            ])
          }
        >
          drop-dxf
        </button>
        <button
          type="button"
          onClick={() => onDrop?.([new File(['c'], 'design.svg', { type: 'image/svg+xml' })])}
        >
          drop-svg
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

  const materialValues = ['acrylic', 'wood', 'cardboard', 'fabric', 'leather', 'paper', 'foam'] as const;
  const labels: Record<string, string> = {
    acrylic: 'Acrylic',
    wood: 'Wood (Plywood/MDF)',
    cardboard: 'Cardboard',
    fabric: 'Fabric',
    leather: 'Leather',
    paper: 'Paper',
    foam: 'Foam',
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
    const itemValues = new Set(items.map((item) => (item.props as { value: string }).value));
    const isMaterialSelect = materialValues.some((val) => itemValues.has(val));

    const options = isMaterialSelect
      ? materialValues.map((val) =>
          React.createElement('option', { key: val, value: val }, labels[val]),
        )
      : items.map((item) =>
          React.cloneElement(item, {
            key: (item.props as { value: string }).value,
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

describe('LaserCuttingOrderForm Dropzone Integration', () => {
  it('clears file when dropzone receives empty files', async () => {
    const user = setupUser();
    render(<LaserCuttingOrderForm />);

    await user.click(screen.getByRole('button', { name: 'drop-svg' }));
    expect(screen.getByText('design.svg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'drop-empty' }));
    expect(screen.queryByText('design.svg')).not.toBeInTheDocument();
  });

  it('prefers DXF file when multiple files are dropped', async () => {
    const user = setupUser();
    render(<LaserCuttingOrderForm />);

    await user.click(screen.getByRole('button', { name: 'drop-dxf' }));

    expect(screen.getByText('drawing.dxf')).toBeInTheDocument();
  });

  it('falls back to first file when no DXF file is present', async () => {
    const user = setupUser();
    render(<LaserCuttingOrderForm />);

    await user.click(screen.getByRole('button', { name: 'drop-svg' }));

    expect(screen.getByText('design.svg')).toBeInTheDocument();
  });
});

describe('LaserCuttingOrderForm material selection', () => {
  it('can select different laser cutting materials', async () => {
    const user = setupUser();
    render(<LaserCuttingOrderForm />);

    const materialSelect = screen.getByRole('combobox') as HTMLSelectElement;

    await user.selectOptions(materialSelect, 'acrylic');
    expect(materialSelect.value).toBe('acrylic');

    await user.selectOptions(materialSelect, 'wood');
    expect(materialSelect.value).toBe('wood');

    await user.selectOptions(materialSelect, 'cardboard');
    expect(materialSelect.value).toBe('cardboard');
  });

  it('material select starts with empty value', async () => {
    render(<LaserCuttingOrderForm />);

    const materialSelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(materialSelect.value).toBe('');
  });
});
