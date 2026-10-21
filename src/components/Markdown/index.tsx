import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * Renders staff-written training text (reading sections, question prompts, agreements).
 *
 * Safety: react-markdown builds React elements only. Raw HTML in the source is NOT rendered (it
 * is shown as plain text, since we do not use rehype-raw), and link/image URLs go through the
 * library's default `urlTransform`, which drops `javascript:`, `data:` and other unsafe schemes
 * after decoding character entities. Images are limited to http(s) on top of that.
 */

const SAFE_IMAGE = /^https?:\/\//i;

const components: Components = {
  h1: ({ children }) => <h2 className="pt-2 text-2xl font-bold">{children}</h2>,
  h2: ({ children }) => <h3 className="pt-2 text-xl font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="pt-2 text-lg font-semibold">{children}</h4>,
  h4: ({ children }) => <h5 className="pt-2 text-base font-semibold">{children}</h5>,
  h5: ({ children }) => <h6 className="pt-2 text-base font-semibold">{children}</h6>,
  h6: ({ children }) => <h6 className="pt-2 text-sm font-semibold">{children}</h6>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-purple-light pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border" />,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-sm [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code
      className={cn(className, !className && 'rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]')}
    >
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-light underline underline-offset-2"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    typeof src === 'string' && SAFE_IMAGE.test(src) ? (
      // eslint-disable-next-line @next/next/no-img-element -- staff-supplied URLs, sizes unknown
      <img src={src} alt={alt ?? ''} className="my-2 h-auto max-w-full rounded-lg" />
    ) : (
      <>{alt}</>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border px-2 py-1">{children}</td>,
};

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    // 80ch keeps running text to about 70 to 90 characters a line, however wide the screen is.
    <div
      className={cn(
        'max-w-[80ch] space-y-3 text-base leading-relaxed [overflow-wrap:anywhere]',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children ?? ''}
      </ReactMarkdown>
    </div>
  );
}
