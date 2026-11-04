import { describe, expect, it } from 'vitest';
import { parseHighlights } from '@/lib/part-viewer';
import { MOCK_HIGHLIGHTS_URL, MOCK_MODEL_URL, MOCK_TRIANGLES } from './mock-part';

const decode = (url: string) => Buffer.from(url.split(',')[1], 'base64');

describe('mock viewer artifacts', () => {
  const glb = decode(MOCK_MODEL_URL);
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));

  it('is a well-formed binary glTF whose length header matches', () => {
    expect(view.getUint32(0, true)).toBe(0x46546c67);
    expect(view.getUint32(8, true)).toBe(glb.byteLength);
    expect(glb.byteLength % 4).toBe(0);
  });

  it('has three boxes of twelve triangles, and the face lists point inside them', () => {
    const triangles = gltf.accessors[1].count / 3;
    expect(triangles).toBe(36);
    expect(Math.max(...MOCK_TRIANGLES.fin)).toBeLessThan(triangles);
    expect(Math.max(...MOCK_TRIANGLES.baseTop)).toBeLessThan(12);
  });

  it('has highlights documents the viewer reads in full', () => {
    expect(
      parseHighlights(JSON.parse(decode(MOCK_HIGHLIGHTS_URL.review).toString())).map((h) => h.code),
    ).toEqual(['overhang.supports_added', 'base.brim_added']);
    expect(
      parseHighlights(JSON.parse(decode(MOCK_HIGHLIGHTS_URL.cannot).toString())).map((h) => h.code),
    ).toEqual(['walls.too_thin']);
  });
});
