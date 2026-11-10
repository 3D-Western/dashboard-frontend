import { describe, expect, it } from 'vitest';
import {
  PIECE_PALETTE,
  buildReveal,
  candidateViewDirections,
  connectedComponents,
  pieceColor,
} from './part-geometry';

// Two separate triangles (6 corners), then a 2-triangle square sharing an edge.
const TWO_TRIANGLES = [0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 5, 5, 6, 5, 5, 5, 6, 5];

describe('connectedComponents', () => {
  it('tells apart separate pieces in a mesh without an index, largest first', () => {
    const square = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    const lone = [9, 9, 9, 10, 9, 9, 9, 10, 9];
    const { count, component } = connectedComponents([...lone, ...square], null);
    expect(count).toBe(2);
    // The square (2 triangles, welded on shared corners) is piece 0, the lone triangle piece 1
    expect(Array.from(component)).toEqual([1, 0, 0]);
  });

  it('uses the index and welds corners at the same position', () => {
    // 6 vertices, 2 triangles that touch at one position (vertex 2 and vertex 3 coincide)
    const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 2, 0];
    const touching = connectedComponents(positions, [0, 1, 2, 3, 4, 5]);
    expect(touching.count).toBe(1);
    const apart = connectedComponents(TWO_TRIANGLES, [0, 1, 2, 3, 4, 5]);
    expect(apart.count).toBe(2);
  });

  it('gives a single piece for one solid', () => {
    expect(connectedComponents([0, 0, 0, 1, 0, 0, 0, 1, 0], null).count).toBe(1);
  });
});

describe('pieceColor', () => {
  it('gives neighbours different colours and cycles', () => {
    expect(pieceColor(0)).not.toBe(pieceColor(1));
    expect(pieceColor(PIECE_PALETTE.length)).toBe(pieceColor(0));
  });
});

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('candidateViewDirections', () => {
  const fallback: [number, number, number] = [1, -1, 1];

  it('looks at a side face from the side it faces, raised a little', () => {
    const [best] = candidateViewDirections({
      normal: [-1, 0, 0],
      regionCenter: [-20, 0, 10],
      partCenter: [0, 0, 10],
      fallback,
    });
    expect(best[0]).toBeLessThan(-0.8);
    expect(best[2]).toBeGreaterThan(0.2);
    expect(Math.hypot(...best)).toBeCloseTo(1);
  });

  it('looks at a top face from above, never straight down', () => {
    const [best] = candidateViewDirections({
      normal: [0, 0, 1],
      regionCenter: [0, 0, 30],
      partCenter: [0, 0, 15],
      fallback,
    });
    expect(best[2]).toBeGreaterThan(0.85);
    expect(best[2]).toBeLessThan(0.95);
  });

  it('looks at a face pointing down from the side, above the bed', () => {
    const [best] = candidateViewDirections({
      normal: [0, 0.2, -1],
      regionCenter: [0, 15, 5],
      partCenter: [0, 0, 10],
      fallback,
    });
    expect(best[2]).toBeGreaterThan(0.3);
    expect(best[1]).toBeGreaterThan(0);
  });

  it('faces a box away from the middle of the part when it has no normal', () => {
    const [best] = candidateViewDirections({
      normal: null,
      regionCenter: [0, 30, 10],
      partCenter: [0, 0, 10],
      fallback,
    });
    expect(dot(best, [0, 1, 0])).toBeGreaterThan(0.8);
  });

  it('falls back to the default side for a region in the middle of the part', () => {
    const [best] = candidateViewDirections({
      normal: null,
      regionCenter: [0, 0, 10],
      partCenter: [0, 0, 10],
      fallback,
    });
    expect(best[0]).toBeGreaterThan(0);
    expect(best[1]).toBeLessThan(0);
  });

  it('offers other sides to try when the first is blocked', () => {
    const list = candidateViewDirections({
      normal: null,
      regionCenter: [0, 30, 10],
      partCenter: [0, 0, 10],
      fallback,
    });
    expect(list.length).toBeGreaterThan(4);
    expect(dot(list[list.length - 1], list[0])).toBeLessThan(0);
  });
});

describe('buildReveal', () => {
  it('builds from the bed up in about 4.5 seconds, resting at each flagged height', () => {
    const reveal = buildReveal([0.25, 0.5, 0.75]);
    expect(reveal.duration).toBeCloseTo(4500, 0);
    expect(reveal.at(0)).toBe(0);
    expect(reveal.at(reveal.duration)).toBe(1);
    // Resting: the fraction does not move during the pause
    let rested = 0;
    for (let t = 0; t < reveal.duration; t += 50) {
      if (Math.abs(reveal.at(t) - 0.5) < 1e-9) rested += 50;
    }
    expect(rested).toBeGreaterThanOrEqual(550);
    expect(rested).toBeLessThanOrEqual(700);
  });

  it('never goes backwards and stays short with many findings', () => {
    const reveal = buildReveal([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.9, 0, 1]);
    expect(reveal.duration).toBeCloseTo(4500, 0);
    let last = 0;
    for (let t = 0; t <= reveal.duration; t += 25) {
      const now = reveal.at(t);
      expect(now).toBeGreaterThanOrEqual(last - 1e-9);
      last = now;
    }
  });

  it('is a plain sweep with no findings', () => {
    const reveal = buildReveal([]);
    expect(reveal.at(2250)).toBeCloseTo(0.5);
  });
});
