import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render, userEvent } from '@test/utils/render';
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from './sidebar';

function renderShell() {
  return render(
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <a href="/somewhere">Somewhere</a>
        </SidebarContent>
      </Sidebar>
      <SidebarTrigger />
    </SidebarProvider>,
  );
}

const originalWidth = window.innerWidth;

describe('Sidebar breakpoint', () => {
  afterEach(() => {
    window.innerWidth = originalWidth;
  });

  it.each([390, 768, 820, 844, 1023])(
    'is a drawer at %i px: closed until the trigger is tapped',
    async (width) => {
      window.innerWidth = width;
      renderShell();

      expect(screen.queryByRole('link', { name: 'Somewhere' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
      expect(await screen.findByRole('link', { name: 'Somewhere' })).toBeInTheDocument();
    },
  );

  it.each([1024, 1180, 1280, 1920])('is permanent at %i px', (width) => {
    window.innerWidth = width;
    const { container } = renderShell();

    expect(screen.getByRole('link', { name: 'Somewhere' })).toBeInTheDocument();
    const sidebar = container.querySelector('[data-slot="sidebar"]');
    // CSS shows it from lg (1024 px), matching useIsCompactShell
    expect(sidebar).toHaveClass('hidden', 'lg:block');
    expect(sidebar?.querySelector('[data-slot="sidebar-container"]')).toHaveClass(
      'hidden',
      'lg:flex',
    );
  });

  it('gives the sidebar list a scroll cue', () => {
    window.innerWidth = 1280;
    renderShell();

    const content = document.querySelector('[data-slot="sidebar-content"]');
    expect(content).toHaveClass('scroll-shadow-y', 'overflow-auto');
  });
});
