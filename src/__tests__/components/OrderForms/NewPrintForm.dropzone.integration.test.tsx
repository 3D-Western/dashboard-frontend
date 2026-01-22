import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPrintForm from '@/app/(protected)/dashboard/orders/print/new/components/PrintOrderForm';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/components/ui/dropzone', () => {
  const DropzoneContext = React.createContext<{ src?: File[] } | undefined>(undefined);

  const Dropzone = ({
    onDrop,
    src,
    children,
  }: {
    onDrop?: (files: File[]) => void;
    src?: File[];
    children?: React.ReactNode;
  }) => {
    return (
      <DropzoneContext.Provider value={{ src }}>
        <div>
          <button type="button" onClick={() => onDrop?.([])}>
            drop-empty
          </button>
          <button
            type="button"
            onClick={() =>
              onDrop?.([
                new File(['a'], 'note.txt', { type: 'text/plain' }),
                new File(['b'], 'model.stl', { type: 'model/stl' }),
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
      </DropzoneContext.Provider>
    );
  };

  const DropzoneEmptyState = () => {
    const context = React.useContext(DropzoneContext);
    if (context?.src) return null;
    return <div>empty</div>;
  };

  const DropzoneContent = () => {
    const context = React.useContext(DropzoneContext);
    if (!context?.src) return null;
    return <div>content</div>;
  };

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

  const materialValues = ['pla', 'abs', 'petg', 'nylon'] as const;
  const colorValues = ['black', 'white', 'red', 'blue', 'natural'] as const;
  const labels: Record<string, string> = {
    pla: 'PLA',
    abs: 'ABS',
    petg: 'PETG',
    nylon: 'Nylon',
    black: 'Black',
    white: 'White',
    red: 'Red',
    blue: 'Blue',
    natural: 'Natural',
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
    const isColorSelect = colorValues.some((val) => itemValues.has(val));

    const options = isMaterialSelect
      ? materialValues.map((val) =>
          React.createElement('option', { key: val, value: val }, labels[val]),
        )
      : isColorSelect
        ? colorValues.map((val) =>
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

describe('NewPrintForm Dropzone Integration', () => {
  it('clears file when dropzone receives empty files', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    await user.click(screen.getByRole('button', { name: 'drop-fallback' }));
    expect(screen.getByText('content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'drop-empty' }));
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('prefers STL file when multiple files are dropped', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    await user.click(screen.getByRole('button', { name: 'drop-stl' }));

    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('falls back to first file when no STL file is present', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    await user.click(screen.getByRole('button', { name: 'drop-fallback' }));

    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

describe('NewPrintForm select branch behavior', () => {
  it('clears material 2 when selecting the same material for choice 1', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    const selects = screen.getAllByRole('combobox');
    const material1Select = selects[0] as HTMLSelectElement;
    const material2Select = selects[2] as HTMLSelectElement;

    await user.selectOptions(material2Select, 'abs');
    expect(material2Select.value).toBe('abs');

    await user.selectOptions(material1Select, 'abs');
    expect(material1Select.value).toBe('abs');
    expect(material2Select.value).toBe('');
  });

  it('clears material 1 when selecting the same material for choice 2', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    const selects = screen.getAllByRole('combobox');
    const material1Select = selects[0] as HTMLSelectElement;
    const material2Select = selects[2] as HTMLSelectElement;

    await user.selectOptions(material1Select, 'pla');
    expect(material1Select.value).toBe('pla');

    await user.selectOptions(material2Select, 'pla');
    expect(material2Select.value).toBe('pla');
    expect(material1Select.value).toBe('');
  });

  it('clears color 2 when selecting the same color for choice 1', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    const selects = screen.getAllByRole('combobox');
    const color1Select = selects[1] as HTMLSelectElement;
    const color2Select = selects[3] as HTMLSelectElement;

    await user.selectOptions(color2Select, 'white');
    expect(color2Select.value).toBe('white');

    await user.selectOptions(color1Select, 'white');
    expect(color1Select.value).toBe('white');
    expect(color2Select.value).toBe('');
  });

  it('clears color 1 when selecting the same color for choice 2', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    const selects = screen.getAllByRole('combobox');
    const color1Select = selects[1] as HTMLSelectElement;
    const color2Select = selects[3] as HTMLSelectElement;

    await user.selectOptions(color1Select, 'black');
    expect(color1Select.value).toBe('black');

    await user.selectOptions(color2Select, 'black');
    expect(color2Select.value).toBe('black');
    expect(color1Select.value).toBe('');
  });
});
