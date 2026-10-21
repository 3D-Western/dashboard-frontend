import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CardDateLine, ResponsiveTable, RowCard } from './index';

const DESKTOP_WIDTH = window.innerWidth;

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

const items = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Bravo' },
];

function Harness({ list = items }: { list?: typeof items }) {
  return (
    <ResponsiveTable
      items={list}
      getKey={(item) => item.id}
      emptyMessage="Nothing here."
      renderCard={(item) => (
        <RowCard title={item.name} actions={<button>Open {item.name}</button>} />
      )}
    >
      <table>
        <tbody>
          <tr>
            <td>Desktop table</td>
          </tr>
        </tbody>
      </table>
    </ResponsiveTable>
  );
}

describe('ResponsiveTable', () => {
  afterEach(() => setViewportWidth(DESKTOP_WIDTH));

  it('shows the table, and no cards, at md and up', () => {
    setViewportWidth(1024);
    render(<Harness />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows one card per item below md, with its actions, and no table', () => {
    setViewportWidth(390);
    render(<Harness />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Alpha')).toBeInTheDocument();
    expect(within(cards[1]).getByRole('button', { name: 'Open Bravo' })).toBeInTheDocument();
  });

  it('shows the empty message below md when there are no items', () => {
    setViewportWidth(390);
    render(<Harness list={[]} />);

    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('RowCard', () => {
  it('renders the title, the actions in their own slot, the details and the footer', () => {
    render(
      <RowCard
        title="Jordan Lee"
        actions={<button>Actions for Jordan Lee</button>}
        footer={<button>Re-score</button>}
      >
        <p>jordan@uwo.ca</p>
      </RowCard>,
    );

    expect(screen.getByText('Jordan Lee')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions for Jordan Lee' })).toBeInTheDocument();
    expect(screen.getByText('jordan@uwo.ca')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Re-score' })).toBeInTheDocument();
  });
});

describe('CardDateLine', () => {
  it('shows the label and the date when there is one', () => {
    render(<CardDateLine label="Print date" date="2026-10-01T10:00:00Z" />);
    expect(screen.getByText(/Print date:/)).toBeInTheDocument();
  });

  it('renders nothing at all when there is no date, not a blank "Print date:"', () => {
    const { container } = render(<CardDateLine label="Print date" date="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
