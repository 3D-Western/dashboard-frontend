// The data side of the 3D part viewer: reading the pipeline's `highlights_json` artifact
// (slicing-pipeline/schemas/dashboard-v1.0/Highlights.schema.json), turning it and the lesson
// cards' own regions into regions on the mesh, and deciding which cards the viewer can point at.
// Nothing here touches three.js or the DOM, so it is cheap to load and easy to test.

import type { LessonCard, Severity } from '@/types/pipeline';
import { MULTI_PIECE_CODE } from './part-geometry';

/** xmin, ymin, zmin, xmax, ymax, zmax, in the model's own coordinates (millimetres, bed at z = 0). */
export type Box6 = [number, number, number, number, number, number];

export interface PartHighlight {
  code: string;
  severity: Severity;
  label: string;
  /** Triangle indices into the `model_glb` mesh. */
  faces: number[] | null;
  bboxMm: Box6 | null;
}

/** A highlight with its geometry checked against the mesh it will be drawn on. */
export interface ResolvedHighlight {
  highlight: PartHighlight;
  /** Valid, sorted, unique triangle indices (empty when the highlight is a box). */
  triangles: number[];
  box: Box6 | null;
}

const SEVERITIES: readonly Severity[] = ['info', 'adjusted', 'choice', 'hold', 'cannot_print'];

/** Colour by severity: the same families as the lesson cards (blue = fixed, amber = your choice, red = can't print). */
export const SEVERITY_COLOR: Record<Severity, string> = {
  info: '#94a3b8',
  adjusted: '#3b82f6',
  choice: '#f59e0b',
  hold: '#a78bfa',
  cannot_print: '#ef4444',
};

const isSeverity = (value: unknown): value is Severity =>
  typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value);

/** A box from six finite numbers, with min and max put the right way round; otherwise null. */
export function parseBox(value: unknown): Box6 | null {
  if (!Array.isArray(value) || value.length !== 6) return null;
  if (!value.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const [x0, y0, z0, x1, y1, z1] = value as number[];
  return [
    Math.min(x0, x1),
    Math.min(y0, y1),
    Math.min(z0, z1),
    Math.max(x0, x1),
    Math.max(y0, y1),
    Math.max(z0, z1),
  ];
}

function parseFaces(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((n): n is number => Number.isInteger(n) && n >= 0);
}

/**
 * Reads a `Highlights` document. It is lenient on purpose: a highlight that makes no sense is
 * dropped (and an unknown severity reads as `info`) so one bad entry never costs the student the
 * whole 3D view. Anything that is not a version-1 document gives an empty list.
 */
export function parseHighlights(json: unknown): PartHighlight[] {
  if (!json || typeof json !== 'object') return [];
  const doc = json as { version?: unknown; highlights?: unknown };
  if (doc.version !== undefined && doc.version !== 1) return [];
  if (!Array.isArray(doc.highlights)) return [];

  const seen = new Set<string>();
  const result: PartHighlight[] = [];
  for (const raw of doc.highlights) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.code !== 'string' || item.code === '' || seen.has(item.code)) continue;
    const faces = parseFaces(item.faces);
    const bboxMm = parseBox(item.bbox_mm ?? item.bboxMm);
    if (!(faces && faces.length > 0) && !bboxMm) continue;
    seen.add(item.code);
    result.push({
      code: item.code,
      severity: isSeverity(item.severity) ? item.severity : 'info',
      label: typeof item.label === 'string' && item.label ? item.label : item.code,
      faces: faces && faces.length > 0 ? faces : null,
      bboxMm,
    });
  }
  return result;
}

/** The lesson cards' own regions, as highlights: what the viewer falls back on without a highlights file. */
export function highlightsFromCards(cards: LessonCard[] | undefined): PartHighlight[] {
  const result: PartHighlight[] = [];
  for (const card of cards ?? []) {
    const faces = card.region?.faces?.filter((n) => Number.isInteger(n) && n >= 0) ?? [];
    const bboxMm = parseBox(card.region?.bboxMm);
    if (faces.length === 0 && !bboxMm) continue;
    result.push({
      code: card.code,
      severity: card.severity,
      label: card.title,
      faces: faces.length > 0 ? faces : null,
      bboxMm,
    });
  }
  return result;
}

/**
 * Students never see a `hold` highlight: a staff hold reads as plain "preparing" to them (P-43), so
 * a region marked for it (in the file or on a card) would give the moderation away.
 */
export function withoutHolds<T extends { severity: Severity }>(items: T[]): T[] {
  return items.filter((item) => item.severity !== 'hold');
}

/** The highlights file wins; a card's region fills in for any code the file does not cover. */
export function mergeHighlights(
  fromFile: PartHighlight[],
  fromCards: PartHighlight[],
): PartHighlight[] {
  const codes = new Set(fromFile.map((h) => h.code));
  return [...fromFile, ...fromCards.filter((h) => !codes.has(h.code))];
}

/** What the viewer draws for one screen: the file and the cards merged, minus holds for students. */
export function viewerHighlights(
  fromFile: PartHighlight[],
  cards: LessonCard[] | undefined,
  audience: 'student' | 'staff' = 'student',
): PartHighlight[] {
  const merged = mergeHighlights(fromFile, highlightsFromCards(cards));
  return audience === 'staff' ? merged : withoutHolds(merged);
}

/**
 * Checks each highlight against the mesh (`triangleCount` triangles): out-of-range indices are
 * dropped, and a highlight left with nothing to draw is dropped entirely. A highlight with both
 * faces and a box draws the faces (they are the exact region).
 */
export function resolveHighlights(
  highlights: PartHighlight[],
  triangleCount: number,
): ResolvedHighlight[] {
  const result: ResolvedHighlight[] = [];
  for (const highlight of highlights) {
    const triangles = highlight.faces
      ? [...new Set(highlight.faces.filter((i) => i < triangleCount))].sort((a, b) => a - b)
      : [];
    if (triangles.length > 0) {
      result.push({ highlight, triangles, box: null });
    } else if (highlight.bboxMm) {
      result.push({ highlight, triangles: [], box: highlight.bboxMm });
    }
  }
  return result;
}

/** Cards the viewer can point at: consequential ones whose code has a region on the part. */
export function linkedCardCodes(
  cards: LessonCard[] | undefined,
  highlights: Pick<PartHighlight, 'code'>[],
): string[] {
  const known = new Set(highlights.map((h) => h.code));
  return (cards ?? []).filter((c) => c.consequential && known.has(c.code)).map((c) => c.code);
}

/**
 * The same artifact has a new short-lived link every time the backend hands the plan out; this
 * is what stays the same, so a new link for the same model does not reload the viewer.
 */
export function artifactKey(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  try {
    const parsed = new URL(url, 'http://local.invalid');
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

let webglProbe: boolean | undefined;

/** Whether this browser can make a WebGL context at all; false on the server and in test DOMs. */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  if (webglProbe !== undefined) return webglProbe;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    webglProbe = Boolean(gl);
  } catch {
    webglProbe = false;
  }
  return webglProbe;
}

/** Data Saver on, or a very slow connection: the student taps to load the model. */
export function shouldAskBeforeLoading(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return Boolean(connection?.saveData) || connection?.effectiveType === 'slow-2g';
}

/** Whether the plan has the several-pieces finding, so the viewer colours each piece. */
export function hasSeparatePieces(highlights: { code: string }[] | undefined): boolean {
  return (highlights ?? []).some((h) => h.code === MULTI_PIECE_CODE);
}
