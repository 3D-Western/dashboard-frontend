// Pure geometry for the part viewer: which way the camera should look at a region, which pieces a
// mesh is made of, and the timeline of the "print it yourself" reveal. Nothing here touches
// three.js or the DOM, so it is cheap to load and easy to test.

export type Vec3 = [number, number, number];

/** The separate-pieces finding (slicing-pipeline `bodies.multiple`): the viewer colours each piece. */
export const MULTI_PIECE_CODE = 'bodies.multiple';

/** Above this many triangles the browser does not look for pieces (the old box stays). */
export const COMPONENT_TRIANGLE_CAP = 150_000;

/** How the pieces were told apart: separate meshes in the file, found in the browser, or not at all. */
export type PieceMode = 'none' | 'meshes' | 'components' | 'box-fallback';

/** Okabe-Ito colours (colour-blind safe), without black. */
export const PIECE_PALETTE = [
  '#e69f00',
  '#56b4e9',
  '#009e73',
  '#f0e442',
  '#0072b2',
  '#d55e00',
  '#cc79a7',
  '#7c3aed',
] as const;

export function pieceColor(index: number): string {
  return PIECE_PALETTE[index % PIECE_PALETTE.length];
}

/**
 * Groups triangles into separate pieces: two triangles are in the same piece when they share a
 * corner (corners at the same position count as one, so meshes with split vertices still work).
 * `component[t]` is the piece of triangle t, numbered by size: 0 is the piece with most triangles.
 */
export function connectedComponents(
  positions: ArrayLike<number>,
  index: ArrayLike<number> | null,
): { count: number; component: Uint32Array } {
  const vertexCount = Math.floor(positions.length / 3);
  const triangleCount = Math.floor((index ? index.length : vertexCount) / 3);

  // Weld corners that sit at the same position (to 0.001 mm).
  const weldOf = new Uint32Array(vertexCount);
  const seen = new Map<string, number>();
  for (let v = 0; v < vertexCount; v += 1) {
    const key = `${Math.round(positions[v * 3] * 1000)},${Math.round(positions[v * 3 + 1] * 1000)},${Math.round(positions[v * 3 + 2] * 1000)}`;
    let id = seen.get(key);
    if (id === undefined) {
      id = seen.size;
      seen.set(key, id);
    }
    weldOf[v] = id;
  }

  const parent = new Uint32Array(seen.size);
  for (let i = 0; i < parent.length; i += 1) parent[i] = i;
  const find = (x: number) => {
    let node = x;
    while (parent[node] !== node) {
      parent[node] = parent[parent[node]];
      node = parent[node];
    }
    return node;
  };
  const corner = (t: number, k: number) => weldOf[index ? index[t * 3 + k] : t * 3 + k];
  for (let t = 0; t < triangleCount; t += 1) {
    const a = find(corner(t, 0));
    const b = find(corner(t, 1));
    const c = find(corner(t, 2));
    if (a !== b) parent[b] = a;
    if (a !== c) parent[find(c)] = a;
  }

  const root = new Uint32Array(triangleCount);
  const sizes = new Map<number, number>();
  for (let t = 0; t < triangleCount; t += 1) {
    root[t] = find(corner(t, 0));
    sizes.set(root[t], (sizes.get(root[t]) ?? 0) + 1);
  }
  const order = [...sizes.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  const rank = new Map(order.map(([r], i) => [r, i]));
  const component = new Uint32Array(triangleCount);
  for (let t = 0; t < triangleCount; t += 1) component[t] = rank.get(root[t])!;
  return { count: order.length, component };
}

const norm = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Offsets from the best angle, tried in order when the part is in the way. */
const AZIMUTH_OFFSETS_DEG = [0, 40, -40, 80, -80, 130, -130, 180];

/**
 * Unit directions (from the region towards the camera), best first. The best one faces the region:
 * along its surface normal when it has one, otherwise away from the middle of the part, tilted up
 * so the bed and the part read clearly. The others turn around the region in case the part blocks
 * the best one. The camera never goes below ~20 degrees or above ~65 degrees of elevation.
 */
export function candidateViewDirections(input: {
  /** Average outward normal of the region's surface, when it has a coherent one. */
  normal: Vec3 | null;
  regionCenter: Vec3;
  partCenter: Vec3;
  /** The default view direction: used when nothing else says which side to look from. */
  fallback: Vec3;
}): Vec3[] {
  const { normal, regionCenter, partCenter, fallback } = input;
  const outward: Vec3 = [
    regionCenter[0] - partCenter[0],
    regionCenter[1] - partCenter[1],
    regionCenter[2] - partCenter[2],
  ];
  const horizontal = (v: Vec3 | null) =>
    v && Math.hypot(v[0], v[1]) > 0.2 * Math.hypot(...v) ? v : null;
  const source = horizontal(normal) ?? horizontal(outward) ?? fallback;
  const azimuth = Math.atan2(source[1], source[0]);

  let elevationDeg = 28;
  if (normal) {
    const n = norm(normal);
    elevationDeg = clamp((Math.asin(clamp(n[2], -1, 1)) * 180) / Math.PI, 20, 65);
  }
  const elevation = (elevationDeg * Math.PI) / 180;

  return AZIMUTH_OFFSETS_DEG.map((offset) => {
    const a = azimuth + (offset * Math.PI) / 180;
    return [
      Math.cos(a) * Math.cos(elevation),
      Math.sin(a) * Math.cos(elevation),
      Math.sin(elevation),
    ];
  });
}

export interface RevealTimeline {
  /** Total length in ms. */
  duration: number;
  /** Fraction of the part's height built after `elapsed` ms (0 to 1). */
  at: (elapsed: number) => number;
}

/**
 * The first-view reveal: the part builds from the bed up in about `totalMs`, resting `pauseMs` at
 * each flagged height (fractions of the part's height). With many findings the rests shrink so the
 * whole thing stays short.
 */
export function buildReveal(
  stops: number[],
  { totalMs = 4500, pauseMs = 600 }: { totalMs?: number; pauseMs?: number } = {},
): RevealTimeline {
  const heights = [...new Set(stops.filter((s) => s > 0 && s < 1))].sort((a, b) => a - b);
  const pause = heights.length ? Math.min(pauseMs, (totalMs * 0.5) / heights.length) : 0;
  const sweepMs = totalMs - pause * heights.length;
  const segments: { until: number; from: number; to: number; ms: number }[] = [];
  let at = 0;
  let clock = 0;
  for (const stop of [...heights, 1]) {
    const ms = sweepMs * (stop - at);
    segments.push({ from: at, to: stop, ms, until: clock + ms });
    clock += ms;
    at = stop;
    if (stop < 1) {
      segments.push({ from: stop, to: stop, ms: pause, until: clock + pause });
      clock += pause;
    }
  }
  return {
    duration: clock,
    at(elapsed) {
      if (elapsed <= 0) return 0;
      let start = 0;
      for (const segment of segments) {
        if (elapsed <= segment.until) {
          const t = segment.ms === 0 ? 1 : (elapsed - start) / segment.ms;
          return segment.from + (segment.to - segment.from) * t;
        }
        start = segment.until;
      }
      return 1;
    },
  };
}
