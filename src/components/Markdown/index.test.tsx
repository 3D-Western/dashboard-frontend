import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown, parseMarkdown } from './index';

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
    expect(screen.getByText('A paragraph that wraps.')).toBeInTheDocument();
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

  it('renders safe links in a new tab', () => {
    render(<Markdown>{'See [the guide](https://example.com/guide).'}</Markdown>);

    const link = screen.getByRole('link', { name: 'the guide' });
    expect(link).toHaveAttribute('href', 'https://example.com/guide');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('does not turn script links into links', () => {
    render(
      <Markdown>
        {'[click me](javascript:alert(1)) and [data](data:text/html;base64,AAAA)'}
      </Markdown>,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/click me/)).toBeInTheDocument();
  });

  it('never outputs raw HTML', () => {
    const { container } = render(
      <Markdown>{'<script>alert(1)</script> <img src=x onerror=alert(1)> hello'}</Markdown>,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('only allows http(s) images', () => {
    const { container } = render(
      <Markdown>{'![ok](https://example.com/a.png) ![bad](javascript:alert(1))'}</Markdown>,
    );

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'ok');
  });

  it('renders block quotes, rules and fenced code', () => {
    const { container } = render(
      <Markdown>{'> careful\n\n---\n\n```\nG28\nG1 X10\n```'}</Markdown>,
    );

    expect(container.querySelector('blockquote')).toHaveTextContent('careful');
    expect(container.querySelector('hr')).not.toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('G28\nG1 X10');
  });

  it('handles empty input', () => {
    const { container } = render(<Markdown>{''}</Markdown>);

    expect(container.firstChild).toBeEmptyDOMElement();
  });
});

describe('parseMarkdown', () => {
  it('keeps a continuation line with its list item', () => {
    expect(parseMarkdown('- first item\n  continues here\n- second')).toEqual([
      { kind: 'list', ordered: false, items: ['first item continues here', 'second'] },
    ]);
  });

  it('ends a paragraph where a list starts', () => {
    expect(parseMarkdown('Intro\n- a\n- b').map((b) => b.kind)).toEqual(['paragraph', 'list']);
  });
});
