import { describe, it, expect, beforeEach } from 'vitest';
import {
  GENERAL_FACTS,
  buildPool,
  findingCards,
  loadSeenFacts,
  orderFacts,
  pickNext,
  plainCards,
  rememberFact,
  shapeCards,
} from './preparing-cards';
import type { StepProgress } from '@/types/pipeline';

const step = (id: string, extra: Partial<StepProgress> = {}): StepProgress => ({
  step: id,
  title: id,
  state: 'done',
  ...extra,
});
const lessonStep = (code = 'thin_walls.weak'): StepProgress =>
  step('checks.thin_walls', { lesson: { code, title: 'Some walls are thin', body: 'Body.' } });

/** Run the picker n times the way the screen does. */
function run(pool: ReturnType<typeof buildPool>, n: number, seen: string[] = []) {
  for (let i = 0; i < n; i++) seen.push(pickNext(pool, seen).id);
  return seen;
}

describe('preparing cards', () => {
  beforeEach(() => window.localStorage.clear());

  it('has about 25 or more facts with unique ids and plain wording', () => {
    expect(GENERAL_FACTS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(GENERAL_FACTS.map((f) => f.id)).size).toBe(GENERAL_FACTS.length);
    for (const f of GENERAL_FACTS)
      expect(f.body).not.toMatch(/\b(staff|crew|screening|review|held)\b/i);
  });

  it('starts with a plain check, even before any has finished', () => {
    const pool = buildPool([], null, null, orderFacts([]));
    expect(pickNext(pool, []).tier).toBe(4);
    expect(plainCards([step('checks.units'), step('checks.bodies')]).map((c) => c.id)).toEqual([
      'plain:checks.units',
      'plain:checks.bodies',
    ]);
  });

  it('ranks findings first, then the part, then facts, with plain only as filler', () => {
    const dims = [20, 20, 90] as const;
    const pool = buildPool([lessonStep(), step('checks.units')], dims, 'class', orderFacts([]));
    const tiers = run(pool, 8).map(
      (id) =>
        pool.findings.concat(pool.part, pool.general, pool.plain).find((c) => c.id === id)!.tier,
    );
    expect(tiers[0]).toBe(1);
    expect(tiers.slice(1, 5)).toEqual([2, 2, 2, 2]);
    expect(tiers.slice(5)).toEqual([3, 3, 3]);
  });

  it('never repeats until everything has been shown, then plain checks fill in', () => {
    const pool = buildPool([step('checks.units')], [30, 30, 30], null, orderFacts([]));
    const total = pool.findings.length + pool.part.length + pool.general.length + pool.plain.length;
    const seen = run(pool, total);
    expect(new Set(seen).size).toBe(total);
    expect(seen.at(-1)).toBe('plain:checks.units');
    expect(run(pool, 1, seen).at(-1)).toBeDefined(); // and it keeps going
  });

  it('turns a lesson on a step into a first-rank card once, ignoring steps without one', () => {
    const cards = findingCards([step('a'), lessonStep(), lessonStep(), lessonStep('x.y')]);
    expect(cards.map((c) => c.id)).toEqual(['finding:thin_walls.weak', 'finding:x.y']);
    expect(cards[0]).toMatchObject({ tier: 1, title: 'Some walls are thin' });
  });

  it('fits the lessons to the shape', () => {
    const ids = (d: [number, number, number]) => shapeCards(d).map((c) => c.id);
    expect(ids([20, 20, 100])).toContain('part:tall');
    expect(ids([150, 120, 8])).toContain('part:flat');
    expect(ids([12, 10, 8])).toContain('part:tiny');
    expect(ids([220, 100, 50])).toContain('part:large');
    expect(shapeCards(null)).toEqual([]);
    expect(shapeCards([40, 40, 40]).map((c) => c.id)).toEqual(['part:layers']);
  });

  it('remembers shown facts, tolerates broken storage, and shows other facts next visit', () => {
    rememberFact('fact:layers');
    rememberFact('fact:nozzle');
    expect(loadSeenFacts()).toEqual(['fact:layers', 'fact:nozzle']);
    const order = orderFacts(loadSeenFacts());
    expect(order).toHaveLength(GENERAL_FACTS.length);
    expect(order.slice(-2).map((f) => f.id)).toEqual(['fact:layers', 'fact:nozzle']);
    window.localStorage.setItem('preparing-facts-seen', '{not json');
    expect(loadSeenFacts()).toEqual([]);
    for (let i = 0; i < 40; i++) rememberFact(`fact:${i}`);
    expect(loadSeenFacts()).toHaveLength(20);
  });
});
