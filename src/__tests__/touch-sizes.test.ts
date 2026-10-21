import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Control size follows the pointer, not the window width (docs/responsive-audit-2026-10.md, R01).
 * The shrink-to-compact classes must use the `fine` variant from globals.css, never `md:` or
 * `sm:`: an iPad or a phone on its side is wider than 768 px and still needs 44 px targets.
 */
const SRC = path.resolve(__dirname, '..');
const GLOBALS = path.join(SRC, 'app', 'globals.css');

// Width-based classes that make a control or its text smaller.
const WIDTH_SHRINK =
  /\b(?:md|sm):(?:min-h-0|px-0|size-\d+|h-\d+(?:\.\d+)?|min-h-\d+|items-start|py-1\.5|text-xs|text-sm|text-\[[^\]]+\]|\[--btn-h:[^\]]+\]|\[--input-h:[^\]]+\])(?=[\s"'`])/g;

// Not controls: loading skeletons.
const IGNORED_FILES = ['DashboardStats.tsx'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    const isSource = full.endsWith('.tsx') && !full.includes('.test.');
    return isSource && !IGNORED_FILES.includes(entry.name) ? [full] : [];
  });
}

describe('touch sizes by pointer', () => {
  it('defines the fine variant: md and wider, with hover and a precise pointer', () => {
    const css = fs.readFileSync(GLOBALS, 'utf8');
    const match = css.match(/@custom-variant fine \((@media [^;]+)\);/);

    expect(match).not.toBeNull();
    expect(match![1]).toContain('(min-width: 48rem)');
    expect(match![1]).toContain('(hover: hover)');
    expect(match![1]).toContain('(pointer: fine)');
  });

  it('shrinks no control by width: every compact size sits behind the fine variant', () => {
    const offenders = sourceFiles(SRC).flatMap((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return Array.from(text.matchAll(WIDTH_SHRINK), (m) => `${path.relative(SRC, file)}: ${m[0]}`);
    });

    expect(offenders).toEqual([]);
  });
});
