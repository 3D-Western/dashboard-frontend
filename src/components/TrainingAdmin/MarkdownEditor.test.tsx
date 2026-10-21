import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor phone sizing', () => {
  it('uses a 16 px text box on phones so iPhone Safari does not zoom on focus', () => {
    render(<MarkdownEditor label="Question" value="" onValueChange={() => {}} />);

    expect(screen.getByLabelText('Question')).toHaveClass('text-base', 'fine:text-sm');
  });

  it('makes the Write and Preview buttons 44 px tall on phones', () => {
    render(<MarkdownEditor label="Question" value="" onValueChange={() => {}} />);

    for (const name of ['Write', 'Preview']) {
      expect(screen.getByRole('button', { name })).toHaveClass('min-h-11', 'fine:min-h-0');
    }
  });

  it('keeps help text at 14 px on phones', () => {
    render(
      <MarkdownEditor label="Question" value="" help="Use Markdown." onValueChange={() => {}} />,
    );

    expect(screen.getByText('Use Markdown.')).toHaveClass('text-sm', 'fine:text-xs');
  });
});
