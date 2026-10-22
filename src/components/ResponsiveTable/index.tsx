'use client';

import type { ReactNode } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { useLocalTime } from '@/hooks/useLocalTime';

export type CardsBelow = 'md' | 'lg' | 'xl';

/**
 * Which layout shows at each width: the cards below the breakpoint, the table from it up. The
 * class names are written out in full so Tailwind generates them.
 */
const LAYOUT_CLASSES: Record<CardsBelow, { cards: string; table: string }> = {
  md: { cards: 'md:hidden', table: 'hidden md:block' },
  lg: { cards: 'lg:hidden', table: 'hidden lg:block' },
  xl: { cards: 'xl:hidden', table: 'hidden xl:block' },
};

/** Renders one column's cell for a row, the same way the desktop table does. */
export function renderCell<TData>(row: Row<TData>, columnId: string): ReactNode {
  const cell = row.getVisibleCells().find((candidate) => candidate.column.id === columnId);
  return cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null;
}

interface ResponsiveTableProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderCard: (item: T) => ReactNode;
  emptyMessage: string;
  /**
   * Cards below this breakpoint, the table from it up. Use the width the table needs beside the
   * sidebar, not the screen: `xl` for a wide table, `lg` for one that fits from 1024 px.
   */
  cardsBelow?: CardsBelow;
  /** The desktop table. */
  children: ReactNode;
}

/**
 * Both layouts are in the markup and CSS shows one of them, so the first paint (server render
 * included) is already right and the table never flashes before the cards. Each item's card is
 * rendered once from the same list the table uses, so nothing is fetched twice. The hidden copy
 * is display:none, so its buttons and dialogs are not reachable or announced.
 */
export function ResponsiveTable<T>({
  items,
  getKey,
  renderCard,
  emptyMessage,
  cardsBelow = 'md',
  children,
}: ResponsiveTableProps<T>) {
  const layout = LAYOUT_CLASSES[cardsBelow];

  return (
    <>
      <div className={layout.cards}>
        {items.length === 0 ? (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={getKey(item)}>{renderCard(item)}</li>
            ))}
          </ul>
        )}
      </div>
      <div className={layout.table}>{children}</div>
    </>
  );
}

interface RowCardProps {
  /** Line one: the main text and any badge. */
  title: ReactNode;
  /** Top-right corner, normally the row's actions button (44 px on phones). */
  actions?: ReactNode;
  /** Detail lines under the title. */
  children?: ReactNode;
  /** Full-width row at the bottom, for example buttons. */
  footer?: ReactNode;
}

/** A date on a card's detail line, shown in the user's time zone. */
export function CardDateLine({ label, date }: { label: string; date: string }) {
  const localTime = useLocalTime(date, 'MMM d, yyyy');
  // A record with no date shows no line at all, rather than a blank "Print date:"
  if (!date || !localTime) return null;
  return (
    <p>
      {label}: <time dateTime={date}>{localTime}</time>
    </p>
  );
}

/** A table row on a phone: a bordered card with the key fields and the row actions. */
export function RowCard({ title, actions, children, footer }: RowCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{title}</div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-2 space-y-1 text-sm text-muted-foreground">{children}</div>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
