import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockLessonCard } from '@test/utils/pipelineFactories';
import type { PartHighlight } from '@/lib/part-viewer';
import { ConsequentialCards } from './LessonCards';
import { PartFocusProvider } from './PartFocus';
import { PartViewerSlot } from './PartViewerSlot';

const env = vi.hoisted(() => ({
  webgl: true,
  askFirst: false,
  outcome: 'ready' as 'ready' | 'error',
  highlights: [] as PartHighlight[],
  focused: [] as (string | null)[],
}));

vi.mock('@/lib/part-viewer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/part-viewer')>()),
  isWebGLAvailable: () => env.webgl,
  shouldAskBeforeLoading: () => env.askFirst,
}));

// The real canvas needs WebGL; this stands in for it and talks to the page the same way.
vi.mock('./PartViewer/PartViewerCanvas', async () => {
  const React = await import('react');
  const { usePartFocus } = await import('./PartFocus');
  return {
    default: function FakeCanvas({ onStatus }: { onStatus: (s: unknown) => void }) {
      const focus = usePartFocus();
      const { setLinked } = focus;
      React.useEffect(() => {
        if (env.outcome === 'error') {
          onStatus({ state: 'error', reason: 'boom' });
          return;
        }
        setLinked(env.highlights.map((h) => h.code));
        onStatus({ state: 'ready', highlights: env.highlights });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      React.useEffect(() => {
        if (focus.nonce) env.focused.push(focus.code);
      }, [focus.nonce, focus.code]);
      return (
        <div data-testid="fake-canvas" data-focus={focus.code ?? ''}>
          <button type="button" onClick={() => focus.focus('overhang.supports_added', 'viewer')}>
            tap region
          </button>
        </div>
      );
    },
  };
});

const supports: PartHighlight = {
  code: 'overhang.supports_added',
  severity: 'adjusted',
  label: 'Supports under the arm',
  faces: null,
  bboxMm: [10, 0, 5, 40, 12, 18],
};

const cards = [
  createMockLessonCard({ code: 'overhang.supports_added', title: 'We added supports' }),
  createMockLessonCard({ code: 'surface.other', title: 'Plain card', region: null }),
];

function ScreenWithCards() {
  return (
    <PartFocusProvider>
      <PartViewerSlot
        previewUrl="/preview.png"
        modelUrl="https://files.example/part.glb?sig=1"
        highlightsUrl="https://files.example/h.json?sig=1"
        highlights={cards}
      />
      <ConsequentialCards cards={cards} />
    </PartFocusProvider>
  );
}

beforeEach(() => {
  env.webgl = true;
  env.askFirst = false;
  env.outcome = 'ready';
  env.highlights = [supports];
  env.focused = [];
  // Everything is "near the screen" in a test.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe() {
        this.callback([{ isIntersecting: true }]);
      }
      disconnect() {}
      unobserve() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Part viewer wording', () => {
  it('speaks to the student about "your part" by default', () => {
    render(<PartViewerSlot previewUrl="/preview.png" highlights={cards} />);
    expect(screen.getByAltText('Preview of your part on the print plate')).toBeVisible();
    expect(screen.getByText('1 area of your part is flagged below.')).toBeVisible();
  });

  it('speaks about "the part" on a staff screen', () => {
    render(<PartViewerSlot previewUrl="/preview.png" highlights={cards} audience="staff" />);
    expect(screen.getByAltText("Preview of the student's part on the print plate")).toBeVisible();
    expect(screen.getByText('1 area of the part is flagged.')).toBeVisible();
    expect(document.body.textContent).not.toMatch(/your part/i);
  });

  it('does not tell a student about an area flagged by a staff hold, but tells staff', () => {
    const held = [createMockLessonCard({ code: 'held', severity: 'hold', region: { faces: [1] } })];
    const { rerender } = render(<PartViewerSlot previewUrl="/preview.png" highlights={held} />);
    expect(screen.queryByText(/flagged/i)).not.toBeInTheDocument();

    rerender(<PartViewerSlot previewUrl="/preview.png" highlights={held} audience="staff" />);
    expect(screen.getByText('1 area of the part is flagged.')).toBeVisible();
  });

  it('counts several flagged areas for staff', () => {
    render(
      <PartViewerSlot
        previewUrl="/preview.png"
        highlights={[...cards, { ...cards[0], code: 'second.region' }]}
        audience="staff"
      />,
    );
    expect(screen.getByText('2 areas of the part are flagged.')).toBeVisible();
  });
});

describe('Part viewer fallbacks', () => {
  it('shows only the preview image when the plan has no model', () => {
    render(<PartViewerSlot previewUrl="/preview.png" highlights={cards} />);
    expect(screen.getByAltText(/preview of your part/i)).toBeVisible();
    expect(screen.queryByTestId('fake-canvas')).toBeNull();
    expect(screen.getByText('1 area of your part is flagged below.')).toBeVisible();
  });

  it('keeps the preview image when WebGL is unavailable, and never loads the viewer', () => {
    env.webgl = false;
    const { container } = render(
      <PartViewerSlot previewUrl="/preview.png" modelUrl="/part.glb" highlights={cards} />,
    );
    expect(screen.getByAltText(/preview of your part/i)).toBeVisible();
    expect(screen.queryByTestId('fake-canvas')).toBeNull();
    expect(container.querySelector('[data-slot="part-viewer"]')).toHaveAttribute(
      'data-viewer',
      'preview',
    );
  });

  it('falls back to the preview image when the model fails to load', async () => {
    env.outcome = 'error';
    const { container } = render(
      <PartViewerSlot previewUrl="/preview.png" modelUrl="/part.glb" highlights={cards} />,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-slot="part-viewer"]')).toHaveAttribute(
        'data-viewer',
        'failed',
      ),
    );
    expect(screen.getByAltText(/preview of your part/i)).toBeVisible();
    expect(screen.queryByTestId('fake-canvas')).toBeNull();
    expect(screen.getByText('1 area of your part is flagged below.')).toBeVisible();
  });

  it('shows the preview first and the 3D view once it has loaded, with a labelled legend', async () => {
    const { container } = render(
      <PartViewerSlot previewUrl="/preview.png" modelUrl="/part.glb" highlights={cards} />,
    );
    expect(screen.getByAltText(/preview of your part/i)).toBeInTheDocument();
    expect(await screen.findByTestId('fake-canvas')).toBeInTheDocument();
    await waitFor(() =>
      expect(container.querySelector('[data-slot="part-viewer"]')).toHaveAttribute(
        'data-viewer',
        'ready',
      ),
    );
    expect(screen.getByRole('button', { name: /supports under the arm/i })).toBeVisible();
  });

  it('waits for a tap before loading when Data Saver is on', async () => {
    env.askFirst = true;
    const user = userEvent.setup();
    render(<PartViewerSlot previewUrl="/preview.png" modelUrl="/part.glb" />);
    expect(screen.queryByTestId('fake-canvas')).toBeNull();
    await user.click(screen.getByRole('button', { name: /load the 3d view/i }));
    expect(await screen.findByTestId('fake-canvas')).toBeInTheDocument();
  });
});

describe('Lesson cards and regions', () => {
  it('points the viewer at the region when a consequential card is tapped', async () => {
    const user = userEvent.setup();
    render(<ScreenWithCards />);
    await screen.findByTestId('fake-canvas');

    const card = screen.getByText('We added supports').closest('article')!;
    await user.click(card);

    expect(screen.getByTestId('fake-canvas')).toHaveAttribute(
      'data-focus',
      'overhang.supports_added',
    );
    expect(card).toHaveAttribute('data-active', 'true');
  });

  it('points the viewer again when the same card is tapped twice', async () => {
    const user = userEvent.setup();
    render(<ScreenWithCards />);
    await screen.findByTestId('fake-canvas');
    const card = screen.getByText('We added supports').closest('article')!;
    await user.click(card);
    await user.click(card);
    expect(env.focused).toEqual(['overhang.supports_added', 'overhang.supports_added']);
  });

  it('can be used from the keyboard through the "Show on your part" button', async () => {
    const user = userEvent.setup();
    render(<ScreenWithCards />);
    await screen.findByTestId('fake-canvas');
    const button = await screen.findByRole('button', { name: /show on your part/i });
    button.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('fake-canvas')).toHaveAttribute(
      'data-focus',
      'overhang.supports_added',
    );
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves cards without a region on the part as plain cards', async () => {
    render(<ScreenWithCards />);
    await screen.findByTestId('fake-canvas');
    const plain = screen.getByText('Plain card').closest('article')!;
    expect(within(plain).queryByRole('button')).toBeNull();
  });

  it('shows no link at all when the 3D view is not available', () => {
    env.webgl = false;
    render(<ScreenWithCards />);
    expect(screen.queryByRole('button', { name: /show on your part/i })).toBeNull();
  });

  it('scrolls to the card when a region on the part is tapped', async () => {
    const user = userEvent.setup();
    render(<ScreenWithCards />);
    const card = screen.getByText('We added supports').closest('article')!;
    // The card is well below the screen.
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ top: 4000, bottom: 4200 } as DOMRect);
    await user.click(await screen.findByRole('button', { name: 'tap region' }));

    await waitFor(() => expect(card).toHaveAttribute('data-active', 'true'));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(
      vi.mocked(Element.prototype.scrollIntoView).mock.contexts.some((el) => el === card),
    ).toBe(true);
  });

  it('leaves the page where it is when the card is already in view', async () => {
    const user = userEvent.setup();
    render(<ScreenWithCards />);
    const card = screen.getByText('We added supports').closest('article')!;
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 300 } as DOMRect);
    await user.click(await screen.findByRole('button', { name: 'tap region' }));
    await waitFor(() => expect(card).toHaveAttribute('data-active', 'true'));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('highlights from the legend focus the region too', async () => {
    const user = userEvent.setup();
    render(<ScreenWithCards />);
    await user.click(await screen.findByRole('button', { name: /supports under the arm/i }));
    expect(screen.getByTestId('fake-canvas')).toHaveAttribute(
      'data-focus',
      'overhang.supports_added',
    );
  });
});
