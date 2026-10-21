import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import manifest from './manifest';

const publicDir = path.resolve(__dirname, '../../public');

/** Width and height from a PNG's header (the IHDR chunk). */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('web app manifest', () => {
  const m = manifest();

  it('names the app and opens it as a standalone app on the dashboard', () => {
    expect(m.name).toBe('3D Western');
    expect(m.short_name).toBeTruthy();
    expect(m.short_name!.length).toBeLessThanOrEqual(12);
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/dashboard');
    // The sign-in pages are outside /dashboard, so the app's scope has to cover them
    expect(m.scope).toBe('/');
  });

  it("uses the dashboard's dark theme colours", () => {
    expect(m.background_color).toBe('#0b0d10');
    expect(m.theme_color).toBe('#0b0d10');
  });

  it('has 192 and 512 icons, and a separate maskable 512', () => {
    const icons = m.icons ?? [];
    const find = (sizes: string, purpose: string) =>
      icons.find((i) => i.sizes === sizes && i.purpose === purpose);

    expect(find('192x192', 'any')).toBeDefined();
    expect(find('512x512', 'any')).toBeDefined();
    expect(find('512x512', 'maskable')).toBeDefined();
    // maskable must not be combined with "any": it needs extra padding of its own
    expect(icons.filter((i) => i.purpose === 'maskable')).toHaveLength(1);
    expect(icons.filter((i) => i.sizes === '512x512' && i.purpose !== 'maskable')).toHaveLength(1);
  });

  it('points every icon at a real PNG of the size it claims', () => {
    for (const icon of m.icons ?? []) {
      const file = path.join(publicDir, icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const [w, h] = icon.sizes!.split('x').map(Number);
      expect(pngSize(file)).toEqual({ width: w, height: h });
    }
  });

  it('has an iPhone home-screen icon (Next links src/app/apple-icon.png)', () => {
    const file = path.resolve(__dirname, 'apple-icon.png');
    expect(existsSync(file)).toBe(true);
    expect(pngSize(file)).toEqual({ width: 180, height: 180 });
  });
});
