import { describe, it, expect, beforeEach } from 'vitest';
import {
  PURPOSES,
  cleanPurposeDetails,
  detailsComplete,
  loadFieldHistory,
  loadRecentAnswers,
  rememberAnswer,
} from './purpose-memory';

beforeEach(() => window.localStorage.clear());

describe('purposes', () => {
  it('offers the five purposes, the venture first with "No usage limits", and never "other"', () => {
    expect(PURPOSES.map((p) => p.value)).toEqual([
      'venture',
      'class',
      'club',
      'research',
      'personal',
    ]);
    expect(PURPOSES[0]).toMatchObject({ featured: true, tag: 'No usage limits' });
    expect(PURPOSES.some((p) => p.value === ('other' as never))).toBe(false);
  });

  it('keeps only the purpose’s own non-empty answers, trimmed', () => {
    expect(cleanPurposeDetails('class', { course: '  MME 2202 ', junk: 'x' })).toEqual({
      course: 'MME 2202',
    });
    expect(cleanPurposeDetails('personal', { course: 'x' })).toEqual({});
  });

  it('needs the name of a venture, a course or a club, but not a lab, and nothing for Personal', () => {
    expect(detailsComplete('venture', {})).toBe(false);
    expect(detailsComplete('venture', { venture_name: 'Hingeworks' })).toBe(true);
    expect(detailsComplete('class', { course: ' ' })).toBe(false);
    expect(detailsComplete('club', { club_name: 'Robotics Club' })).toBe(true);
    expect(detailsComplete('research', {})).toBe(true);
    expect(detailsComplete('personal', {})).toBe(true);
  });
});

describe('remembered answers', () => {
  it('keeps the last three distinct answers, newest first, and the past answers per field', () => {
    rememberAnswer({ purpose: 'class', details: { course: 'MME 2202' } });
    rememberAnswer({ purpose: 'club', details: { club_name: 'Robotics Club' } });
    rememberAnswer({ purpose: 'class', details: { course: 'ISE 2200' } });
    rememberAnswer({ purpose: 'class', details: { course: 'MME 2202' } }); // again: moves to the front
    rememberAnswer({ purpose: 'personal', details: {} });

    expect(loadRecentAnswers().map((a) => [a.purpose, a.details])).toEqual([
      ['personal', {}],
      ['class', { course: 'MME 2202' }],
      ['class', { course: 'ISE 2200' }],
    ]);
    expect(loadFieldHistory('course')).toEqual(['MME 2202', 'ISE 2200']);
    expect(loadFieldHistory('club_name')).toEqual(['Robotics Club']);
  });

  it('starts from the one answer the first release remembered', () => {
    window.localStorage.setItem(
      '3dw.printFlow.purpose.v1',
      JSON.stringify({
        purpose: 'class',
        details: { class: { course: 'MME 4499', project: 'x' } },
      }),
    );
    expect(loadRecentAnswers()).toEqual([{ purpose: 'class', details: { course: 'MME 4499' } }]);
  });

  it('is empty, not an error, when nothing is remembered or storage is unreadable', () => {
    expect(loadRecentAnswers()).toEqual([]);
    window.localStorage.setItem('3dw.printFlow.history.v2', '{broken');
    expect(loadRecentAnswers()).toEqual([]);
  });
});
