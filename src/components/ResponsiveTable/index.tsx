'use client';

import type { ReactNode } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { useBelowWidth } from '@/hooks/useBelowWidth';
import { useLocalTime } from '@/hooks/useLocalTime';

/** Tailwind breakpoints, in px, at which a table takes over from cards. */
const CARDS_BELOW_PX = { md: 768, lg: 1024, xl: 1280 } as const;

export type CardsBelow = keyof typeof CARDS_BELOW_PX;

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
 * Below `cardsBelow` (default md, 768 px) each item is a card; from there up the table is shown.
 * The switch is made in JS so the table is not in the DOM on phones at all (no duplicate buttons
 * or dialogs). Server rendering and first paint use the table, then the cards appear after
 * hydration.
 */
export function ResponsiveTable<T>({
  items,
  getKey,
  renderCard,
  emptyMessage,
  cardsBelow = 'md',
  children,
}: ResponsiveTableProps<T>) {
  const showCards = useBelowWidth(CARDS_BELOW_PX[cardsBelow]);

  if (!showCards) {
    return <>{children}</>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={getKey(item)}>{renderCard(item)}</li>
      ))}
    </ul>
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
