import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// The root layout builds its fonts with next/font at import time, which only works inside Next
const font = () => ({ variable: 'font-var', className: 'font-class' });
vi.mock('next/font/google', () => ({
  Space_Grotesk: font,
  Chakra_Petch: font,
  IBM_Plex_Mono: font,
}));
vi.mock('next/font/local', () => ({ default: font }));

const { metadata } = await import('./layout');

function read(name: string) {
  return readFileSync(path.resolve(__dirname, name));
}

function pngSize(name: string): { width: number; height: number } {
  const bytes = read(name);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('browser tab icon', () => {
  it('is the 3D Western badge (same artwork as the app icons), not the default favicon', () => {
    const svg = read('icon.svg').toString('utf8');
    const mark = read('../../public/brand/mark-for-dark.svg').toString('utf8');
    // Both mark paths (white outline, purple base) are copied from the brand file
    for (const fill of ['#f5f5f7', '#a63bdb']) {
      expect(mark).toContain(`fill="${fill}"`);
      expect(svg).toContain(`fill="${fill}"`);
    }
    // On the dashboard's dark background, like icons/icon-192.png
    expect(svg).toContain('#0b0d10');
  });

  it.each([
    ['icon1.png', 32],
    ['icon2.png', 48],
    ['icon3.png', 192],
  ])('%s is a %i px square PNG', (name, size) => {
    expect(pngSize(name)).toEqual({ width: size, height: size });
  });

  it('keeps a favicon.ico for browsers that ask for it, holding 32 and 48 px images', () => {
    const ico = read('favicon.ico');
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    expect(ico.readUInt16LE(4)).toBe(2); // two images
    expect([ico.readUInt8(6), ico.readUInt8(22)]).toEqual([32, 48]);
  });
});

describe('page titles', () => {
  it('reads "Page · 3D Western", and falls back to the app name', () => {
    const title = metadata.title as { default: string; template: string };
    expect(title.default).toBe('3D Western');
    expect(title.template.replace('%s', 'My Jobs')).toBe('My Jobs · 3D Western');
  });
});
