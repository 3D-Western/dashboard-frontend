import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CardDateLine, ResponsiveTable, RowCard } from './index';

const items = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Bravo' },
];

function Harness({
  list = items,
  cardsBelow,
  renderCard = (item: (typeof items)[number]) => (
    <RowCard title={item.name} actions={<button>Open {item.name}</button>} />
  ),
}: {
  list?: typeof items;
  cardsBelow?: 'md' | 'lg' | 'xl';
  renderCard?: (item: (typeof items)[number]) => ReactNode;
}) {
  return (
    <ResponsiveTable
      items={list}
      getKey={(item) => item.id}
      emptyMessage="Nothing here."
      cardsBelow={cardsBelow}
      renderCard={renderCard}
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

// jsdom does not load Tailwind, so the layout is checked through the classes that CSS acts on.
describe('ResponsiveTable', () => {
  it('renders the cards and the table, and CSS shows one of them (md)', () => {
    render(<Harness />);

    expect(screen.getByRole('list').parentElement).toHaveClass('md:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'md:block');
  });

  it('renders one card per item, with its actions', () => {
    render(<Harness />);

    const cards = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Alpha')).toBeInTheDocument();
    expect(within(cards[1]).getByRole('button', { name: 'Open Bravo' })).toBeInTheDocument();
  });

  it('renders each item card once, so the rows are not built twice', () => {
    const renderCard = vi.fn((item: (typeof items)[number]) => <RowCard title={item.name} />);
    render(<Harness renderCard={renderCard} />);

    expect(renderCard).toHaveBeenCalledTimes(items.length);
  });

  it('switches at lg and xl when asked', () => {
    const { unmount } = render(<Harness cardsBelow="lg" />);
    expect(screen.getByRole('list').parentElement).toHaveClass('lg:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'lg:block');
    unmount();

    render(<Harness cardsBelow="xl" />);
    expect(screen.getByRole('list').parentElement).toHaveClass('xl:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'xl:block');
  });

  it('shows the empty message in the card layout, and still renders the table', () => {
    render(<Harness list={[]} />);

    const message = screen.getByText('Nothing here.');
    expect(message.parentElement).toHaveClass('md:hidden');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('Desktop table')).toBeInTheDocument();
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
