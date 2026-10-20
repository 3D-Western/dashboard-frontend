import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from './index';

describe('Markdown', () => {
  it('renders headings, paragraphs and lists', () => {
    render(
      <Markdown>
        {`# Title

A paragraph
that wraps.

- one
- two

1. first
2. second`}
      </Markdown>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText(/A paragraph/)).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'one',
      'two',
      'first',
      'second',
    ]);
  });

  it('renders bold, italic and code inline', () => {
    render(<Markdown>{'Wear **safety glasses**, *always*, and run `M30`.'}</Markdown>);

    expect(screen.getByText('safety glasses').tagName).toBe('STRONG');
    expect(screen.getByText('always').tagName).toBe('EM');
    expect(screen.getByText('M30').tagName).toBe('CODE');
  });

  it('renders GFM tables and task lists', () => {
    render(
      <Markdown>
        {'| Tool | PPE |\n| --- | --- |\n| Laser | Glasses |\n\n- [x] done\n- [ ] todo'}
      </Markdown>,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'PPE' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('renders safe links in a new tab', () => {
    render(<Markdown>{'See [the guide](https://example.com/guide).'}</Markdown>);

    const link = screen.getByRole('link', { name: 'the guide' });
    expect(link).toHaveAttribute('href', 'https://example.com/guide');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  describe('cannot be used to inject script', () => {
    const hrefs = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');

    it.each([
      ['plain javascript: link', '[x](javascript:alert(1))'],
      ['mixed case', '[x](JaVaScRiPt:alert(1))'],
      ['decimal entity in the scheme', '[x](java&#115;cript:alert(1))'],
      ['hex entity in the scheme', '[x](java&#x73;cript:alert(1))'],
      ['named entity colon', '[x](javascript&colon;alert(1))'],
      ['leading whitespace entity', '[x](&#32;javascript:alert(1))'],
      ['tab inside the scheme', '[x](java\tscript:alert(1))'],
      ['data URL', '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)'],
      ['vbscript', '[x](vbscript:msgbox(1))'],
      ['reference-style link', '[x][r]\n\n[r]: javascript:alert(1)'],
      ['autolink', '<javascript:alert(1)>'],
      ['link inside bold inside a list', '- **[x](javascript:alert(1))**'],
      [
        'link inside a block quote and a table',
        '> [x](javascript:alert(1))\n\n| a |\n|---|\n| [x](javascript:alert(1)) |',
      ],
    ])('drops %s', (_name, source) => {
      const { container } = render(<Markdown>{source}</Markdown>);

      for (const href of hrefs(container)) {
        expect(href.replace(/\s/g, '').toLowerCase()).not.toMatch(/^(javascript|data|vbscript):/);
      }
      expect(container.querySelector('script')).toBeNull();
    });

    it('never outputs raw HTML', () => {
      const { container } = render(
        <Markdown>
          {
            '<script>alert(1)</script> <img src=x onerror=alert(1)> <a href="javascript:alert(1)">x</a> hello'
          }
        </Markdown>,
      );

      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('a')).toBeNull();
      expect(container.querySelector('[onerror]')).toBeNull();
    });

    it('does not let HTML hide inside nested constructs', () => {
      const { container } = render(
        <Markdown>
          {'> - **<img src=x onerror=alert(1)>**\n\n| a |\n|---|\n| <script>alert(1)</script> |'}
        </Markdown>,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('[onerror]')).toBeNull();
    });

    it('only allows http(s) images', () => {
      const { container } = render(
        <Markdown>
          {
            '![ok](https://example.com/a.png) ![bad](javascript:alert(1)) ![bad2](data:image/svg+xml;base64,AAAA) ![bad3](java&#115;cript:alert(1))'
          }
        </Markdown>,
      );

      const images = container.querySelectorAll('img');
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute('alt', 'ok');
    });
  });

  it('renders block quotes, rules and fenced code', () => {
    const { container } = render(
      <Markdown>{'> careful\n\n---\n\n```\nG28\nG1 X10\n```'}</Markdown>,
    );

    expect(container.querySelector('blockquote')).toHaveTextContent('careful');
    expect(container.querySelector('hr')).not.toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('G28\nG1 X10\n');
  });

  it('handles empty input', () => {
    const { container } = render(<Markdown>{''}</Markdown>);

    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
