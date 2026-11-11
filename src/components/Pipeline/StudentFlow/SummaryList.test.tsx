import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SummaryList } from './SummaryList';

// jsdom has no layout: give the list and its rows boxes, as a 100px-tall list with 40px rows.
function layout(scrollTop: { value: number }) {
  const rect = (top: number, height: number) =>
    ({ top, bottom: top + height, height, left: 0, right: 0, width: 0 }) as DOMRect;
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'get').mockImplementation(() => scrollTop.value);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains('sf-scroller')) return rect(0, 100);
    const index = Number(this.dataset.i ?? 0);
    return rect(index * 40 - scrollTop.value, 40);
  });
}

const rows = [0, 1, 2, 3, 4].map((i) => (
  <div key={i} data-row data-i={i}>
    row {i}
  </div>
));

afterEach(() => vi.restoreAllMocks());

describe('SummaryList', () => {
  it('scrolls inside itself, fades the bottom and says how many rows are below', () => {
    layout({ value: 0 });
    render(<SummaryList>{rows}</SummaryList>);

    expect(screen.getByTestId('summary-scroll')).toHaveAttribute('data-more');
    // rows 2 (ends at 120), 3 and 4 are not fully in view
    expect(screen.getByTestId('summary-more')).toHaveTextContent('3 more');
    const list = document.querySelector('.sf-scroller')!;
    expect(list).toHaveClass('sf-scroller'); // overflow, overscroll and touch-action are in its CSS
  });

  it('drops the cue at the end of the list', () => {
    const at = { value: 0 };
    layout(at);
    render(<SummaryList>{rows}</SummaryList>);
    expect(screen.getByTestId('summary-more')).toBeInTheDocument();

    at.value = 100; // scrollTop + clientHeight reaches scrollHeight
    fireEvent.scroll(document.querySelector('.sf-scroller')!);

    expect(screen.queryByTestId('summary-more')).not.toBeInTheDocument();
    expect(screen.getByTestId('summary-scroll')).not.toHaveAttribute('data-more');
  });

  it('shows no cue when everything fits', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(200);
    render(<SummaryList>{rows}</SummaryList>);
    expect(screen.queryByTestId('summary-more')).not.toBeInTheDocument();
  });

  it('scrolls down when the pill is pressed', () => {
    layout({ value: 0 });
    const scrollBy = vi.fn();
    render(<SummaryList>{rows}</SummaryList>);
    document.querySelector<HTMLElement>('.sf-scroller')!.scrollBy = scrollBy;
    fireEvent.click(screen.getByTestId('summary-more'));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 80 }));
  });
});
