import { describe, expect, it } from 'vitest';
import { createMockLessonCard } from '@test/utils/pipelineFactories';
import type { PartHighlight } from './part-viewer';
import {
  SEVERITY_COLOR,
  artifactKey,
  highlightsFromCards,
  linkedCardCodes,
  mergeHighlights,
  parseBox,
  parseHighlights,
  pickGroups,
  resolveHighlights,
  viewerHighlights,
  withoutHolds,
} from './part-viewer';

describe('parseHighlights', () => {
  it('reads faces and boxes in the contract shape', () => {
    const result = parseHighlights({
      version: 1,
      highlights: [
        { code: 'a', severity: 'cannot_print', label: 'Thin wall', faces: [4, 2, 2] },
        { code: 'b', severity: 'adjusted', label: 'Supports', bbox_mm: [10, 0, 5, 40, 12, 18] },
      ],
    });
    expect(result).toEqual([
      { code: 'a', severity: 'cannot_print', label: 'Thin wall', faces: [4, 2, 2], bboxMm: null },
      {
        code: 'b',
        severity: 'adjusted',
        label: 'Supports',
        faces: null,
        bboxMm: [10, 0, 5, 40, 12, 18],
      },
    ]);
  });

  it('drops entries that cannot be drawn, without losing the good ones', () => {
    const result = parseHighlights({
      version: 1,
      highlights: [
        { code: 'no-geometry', severity: 'info', label: 'Nothing to draw' },
        { code: 'empty-faces', severity: 'info', label: 'Empty', faces: [] },
        { code: 'bad-box', severity: 'info', label: 'Bad box', bbox_mm: [1, 2, 3] },
        { code: 'nan-box', severity: 'info', label: 'NaN', bbox_mm: [0, 0, 0, 1, 1, null] },
        { severity: 'info', label: 'No code', faces: [1] },
        'not an object',
        { code: 'ok', severity: 'info', label: 'Fine', faces: [0, -3, 1.5, 7] },
        { code: 'ok', severity: 'info', label: 'Duplicate code', faces: [9] },
      ],
    });
    expect(result.map((h) => h.code)).toEqual(['ok']);
    expect(result[0].faces).toEqual([0, 7]);
  });

  it('reads an unknown severity as info and a missing label as the code', () => {
    const [h] = parseHighlights({ highlights: [{ code: 'x', severity: 'loud', faces: [1] }] });
    expect(h).toMatchObject({ severity: 'info', label: 'x' });
  });

  it.each([null, 'text', 42, {}, { version: 2, highlights: [] }, { highlights: 'no' }])(
    'gives an empty list for %j',
    (value) => {
      expect(parseHighlights(value)).toEqual([]);
    },
  );

  it('puts a box the right way round', () => {
    expect(parseBox([5, 5, 5, 1, 2, 3])).toEqual([1, 2, 3, 5, 5, 5]);
  });
});

describe('highlights from the lesson cards', () => {
  it('takes a card region as a highlight, with the card title as label', () => {
    const cards = [
      createMockLessonCard({ code: 'a', title: 'Supports', severity: 'adjusted' }),
      createMockLessonCard({ code: 'b', region: { faces: [3, 4] }, severity: 'choice' }),
      createMockLessonCard({ code: 'c', region: null }),
      createMockLessonCard({ code: 'd', region: { layers: [1, 5] } }),
    ];
    const result = highlightsFromCards(cards);
    expect(result.map((h) => [h.code, h.label, h.severity])).toEqual([
      ['a', 'Supports', 'adjusted'],
      ['b', cards[1].title, 'choice'],
    ]);
  });

  it('lets the highlights file win and the cards fill in the rest', () => {
    const file = parseHighlights({
      highlights: [{ code: 'a', severity: 'info', label: 'From file', faces: [1] }],
    });
    const cards = highlightsFromCards([
      createMockLessonCard({ code: 'a', title: 'From card' }),
      createMockLessonCard({ code: 'z', title: 'Only on the card' }),
    ]);
    expect(mergeHighlights(file, cards).map((h) => [h.code, h.label])).toEqual([
      ['a', 'From file'],
      ['z', 'Only on the card'],
    ]);
  });
});

describe('hold highlights are staff-only (P-43)', () => {
  const fromFile = parseHighlights({
    highlights: [
      { code: 'moderation.review', severity: 'hold', label: 'Held for review', faces: [1, 2] },
      { code: 'overhang', severity: 'adjusted', label: 'Supports', faces: [3] },
    ],
  });
  const cards = [
    createMockLessonCard({ code: 'held.card', severity: 'hold', region: { faces: [9] } }),
    createMockLessonCard({ code: 'cp', severity: 'cannot_print', region: { faces: [5] } }),
  ];

  it('drops hold severities', () => {
    expect(withoutHolds(fromFile).map((h) => h.code)).toEqual(['overhang']);
  });

  it('shows students neither a hold from the file nor a hold card region', () => {
    expect(viewerHighlights(fromFile, cards).map((h) => h.code)).toEqual(['overhang', 'cp']);
    expect(viewerHighlights(fromFile, cards, 'student').some((h) => h.severity === 'hold')).toBe(
      false,
    );
  });

  it('leaves them for staff', () => {
    expect(viewerHighlights(fromFile, cards, 'staff').map((h) => h.code)).toEqual([
      'moderation.review',
      'overhang',
      'held.card',
      'cp',
    ]);
  });
});

describe('resolveHighlights', () => {
  const faces = parseHighlights({
    highlights: [
      { code: 'in', severity: 'info', label: 'In range', faces: [5, 1, 1, 3] },
      { code: 'out', severity: 'info', label: 'Out of range', faces: [50, 60] },
      {
        code: 'out-but-box',
        severity: 'info',
        label: 'Falls back to its box',
        faces: [99],
        bbox_mm: [0, 0, 0, 1, 1, 1],
      },
      {
        code: 'both',
        severity: 'info',
        label: 'Faces win',
        faces: [2],
        bbox_mm: [0, 0, 0, 9, 9, 9],
      },
      { code: 'box', severity: 'info', label: 'Box', bbox_mm: [0, 0, 0, 2, 2, 2] },
    ],
  });

  it('keeps valid, sorted, unique triangles and drops highlights with nothing left', () => {
    const result = resolveHighlights(faces, 10);
    expect(result.map((r) => r.highlight.code)).toEqual(['in', 'out-but-box', 'both', 'box']);
    expect(result[0]).toMatchObject({ triangles: [1, 3, 5], box: null });
    expect(result[1]).toMatchObject({ triangles: [], box: [0, 0, 0, 1, 1, 1] });
    expect(result[2]).toMatchObject({ triangles: [2], box: null });
    expect(result[3]).toMatchObject({ triangles: [], box: [0, 0, 0, 2, 2, 2] });
  });

  it('draws nothing when the mesh has no triangles to match', () => {
    expect(resolveHighlights([faces[0]], 0)).toEqual([]);
  });
});

describe('card to region links', () => {
  it('links consequential cards whose code has a region', () => {
    const cards = [
      createMockLessonCard({ code: 'a', consequential: true }),
      createMockLessonCard({ code: 'b', consequential: false }),
      createMockLessonCard({ code: 'c', consequential: true }),
    ];
    expect(linkedCardCodes(cards, [{ code: 'a' }, { code: 'b' }, { code: 'other' }])).toEqual([
      'a',
    ]);
    expect(linkedCardCodes(undefined, [{ code: 'a' }])).toEqual([]);
  });
});

describe('colour and artifact keys', () => {
  it('has a colour for every severity, all different', () => {
    const colours = Object.values(SEVERITY_COLOR);
    expect(colours).toHaveLength(5);
    expect(new Set(colours).size).toBe(5);
  });

  it('ignores the signature in a short-lived link', () => {
    expect(artifactKey('https://files.example/a/part.glb?sig=1&exp=2')).toBe(
      'https://files.example/a/part.glb',
    );
    expect(artifactKey('https://files.example/a/part.glb?sig=3')).toBe(
      'https://files.example/a/part.glb',
    );
    expect(artifactKey(undefined)).toBeUndefined();
    expect(artifactKey('data:model/gltf-binary;base64,AAA')).toBe(
      'data:model/gltf-binary;base64,AAA',
    );
  });
});

describe('pickGroups', () => {
  const h = (code: string): PartHighlight => ({
    code,
    severity: 'info',
    label: code,
    faces: [0],
    bboxMm: null,
  });

  it('draws one region per group, the first code that has one, in group order', () => {
    const all = [h('a'), h('b'), h('c'), h('z')];
    expect(pickGroups(all, [['c'], ['x', 'b', 'a'], ['nothing']]).map((x) => x.code)).toEqual([
      'c',
      'b',
    ]);
  });

  it('draws everything without groups, and nothing for no groups', () => {
    const all = [h('a')];
    expect(pickGroups(all, undefined)).toBe(all);
    expect(pickGroups(all, [])).toEqual([]);
  });
});
