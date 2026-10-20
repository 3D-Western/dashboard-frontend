import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A small, safe Markdown renderer for staff-written training text (reading sections, question
 * prompts, agreements). It builds React elements only (never raw HTML), and links/images are
 * limited to http(s) (and mailto for links), so content cannot inject scripts.
 *
 * Supported: headings (#..####), paragraphs, bullet and numbered lists, block quotes, horizontal
 * rules, fenced code, **bold**, *italic*, `code`, [links](https://...) and ![images](https://...).
 */

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;
const SAFE_IMAGE = /^https?:\/\//i;

// Order matters: images before links, bold before italic.
const INLINE =
  /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|`([^`]+)`|\*([^*\s][^*]*?)\*/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;

  while (rest.length > 0) {
    const match = INLINE.exec(rest);
    if (!match) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const key = `${keyPrefix}-${index++}`;

    if (match[2] !== undefined) {
      const [, alt, src] = match;
      nodes.push(
        SAFE_IMAGE.test(src) ? (
          // eslint-disable-next-line @next/next/no-img-element -- staff-supplied URLs, sizes unknown
          <img key={key} src={src} alt={alt} className="my-2 h-auto max-w-full rounded-lg" />
        ) : (
          alt
        ),
      );
    } else if (match[4] !== undefined) {
      const [, , , label, href] = match;
      nodes.push(
        SAFE_LINK.test(href) ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-light underline underline-offset-2"
          >
            {renderInline(label, key)}
          </a>
        ) : (
          label
        ),
      );
    } else if (match[5] !== undefined) {
      nodes.push(<strong key={key}>{renderInline(match[5], key)}</strong>);
    } else if (match[6] !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {match[6]}
        </code>,
      );
    } else if (match[7] !== undefined) {
      nodes.push(<em key={key}>{renderInline(match[7], key)}</em>);
    }
    rest = rest.slice(match.index + match[0].length);
  }
  return nodes;
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'rule' };

const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const startsBlock = (line: string) =>
    /^(#{1,4})\s/.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*```/.test(line) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (/^\s*```/.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++; // closing fence
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ kind: 'rule' });
      i++;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]))
        quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push({ kind: 'quote', text: quote.join(' ') });
      continue;
    }

    const bullet = BULLET.test(line);
    const numbered = NUMBERED.test(line);
    if (bullet || numbered) {
      const pattern = bullet ? BULLET : NUMBERED;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(pattern.exec(lines[i])![1]);
        i++;
        // A wrapped continuation line belongs to the previous item
        while (
          i < lines.length &&
          lines[i].trim() !== '' &&
          /^\s{2,}\S/.test(lines[i]) &&
          !pattern.test(lines[i])
        ) {
          items[items.length - 1] += ` ${lines[i++].trim()}`;
        }
      }
      blocks.push({ kind: 'list', ordered: numbered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      (paragraph.length === 0 || !startsBlock(lines[i]))
    ) {
      paragraph.push(lines[i++].trim());
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-2xl font-bold',
  2: 'text-xl font-semibold',
  3: 'text-lg font-semibold',
  4: 'text-base font-semibold',
};

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  const blocks = parseMarkdown(children ?? '');

  return (
    <div className={cn('space-y-3 text-base leading-relaxed [overflow-wrap:anywhere]', className)}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        switch (block.kind) {
          case 'heading': {
            const Tag = `h${Math.min(block.level + 1, 6)}` as 'h2' | 'h3' | 'h4' | 'h5';
            return (
              <Tag key={key} className={cn('pt-2', HEADING_CLASS[block.level])}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }
          case 'paragraph':
            return <p key={key}>{renderInline(block.text, key)}</p>;
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List
                key={key}
                className={cn('space-y-1 pl-6', block.ordered ? 'list-decimal' : 'list-disc')}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </List>
            );
          }
          case 'quote':
            return (
              <blockquote
                key={key}
                className="border-l-2 border-purple-light pl-4 text-muted-foreground"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={key} className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-sm">
                <code>{block.text}</code>
              </pre>
            );
          case 'rule':
            return <hr key={key} className="border-border" />;
          default:
            return <Fragment key={key} />;
        }
      })}
    </div>
  );
}
