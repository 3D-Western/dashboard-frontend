import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createFinding } from '@test/utils/pipelineReviewFactories';
import { FindingList } from './FindingList';

describe('FindingList on a phone', () => {
  // The evidence of a word-check hold is one unbroken JSON string. Happy-dom has no layout, so this
  // checks the rules that keep it inside a 393 px screen: the value column may shrink below its
  // content (minmax(0,1fr), so the grid cannot widen the page) and the value may break anywhere.
  it('lets an unbroken evidence value wrap inside its column instead of widening the page', () => {
    const evidence =
      '[{"term":"nerf","route":"review","matched":"A little stand for my Nerf blaster"}]';
    render(
      <FindingList
        findings={[
          createFinding({
            code: 'word.check',
            message: 'A word needs a person.',
            data: { matches: evidence },
          }),
        ]}
      />,
    );

    const value = screen.getByText(evidence);
    const list = value.closest('dl') as HTMLElement;
    expect(list).not.toBeNull();
    expect(list.className).toContain('grid-cols-[auto_minmax(0,1fr)]');
    expect(list.className).toContain('[overflow-wrap:anywhere]');
  });
});
