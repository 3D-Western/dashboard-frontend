import { describe, it, expect, vi, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import type { ImportPreview, ImportSummary } from '@/types/training-admin';
import { AnnotatedSource, ImportScreen } from './ImportScreen';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { previewImport: vi.fn(), importTraining: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { previewImport: Mock; importTraining: Mock };

const YAML = [
  'format: 3dw-training/1', // 1
  'training:', // 2
  '  slug: Laser Cutter', // 3
  '  title: Laser Cutter', // 4
  '  kind: EQUIPMENT', // 5
  'topics:', // 6
  '  - slug: safety', // 7
  '    name: Safety', // 8
  '    questions:', // 9
  '      - prompt: Where is the stop?', // 10
  '        options:', // 11
  '          - text: Front', // 12
  '          - text: Back', // 13
  'steps:', // 14
  '  - type: QUIZ', // 15
  '    title: Quiz', // 16
  '    draw: all', // 17
].join('\n');

const summary = (overrides: Partial<ImportSummary> = {}): ImportSummary => ({
  trainingSlug: 'laser-cutter',
  title: 'Laser Cutter',
  kind: 'EQUIPMENT',
  topics: 1,
  questions: 4,
  steps: [
    { position: 1, type: 'VIDEO', title: 'Meet the laser cutter' },
    { position: 2, type: 'QUIZ', title: 'Final quiz' },
  ],
  signoffChecklistItems: 3,
  newTraining: true,
  draftVersionNo: 1,
  questionsAdded: 4,
  questionsChanged: 0,
  questionsUnchanged: 0,
  questionsRetired: 0,
  ...overrides,
});

const invalid: ImportPreview = {
  valid: false,
  summary: null,
  errors: [
    {
      line: 11,
      column: 9,
      path: 'topics[0].questions[0].options',
      message: 'A single-answer question needs exactly one correct option',
    },
    {
      line: 3,
      column: 9,
      path: 'training.slug',
      message: 'slug must be lowercase letters and digits joined by single hyphens',
    },
  ],
};

async function paste(text = YAML) {
  const box = screen.getByRole('textbox', { name: /training file/i });
  await userEvent.click(box);
  await userEvent.paste(text);
}

const check = () => userEvent.click(screen.getByRole('button', { name: /check the file/i }));
const importButton = () => screen.getByRole('button', { name: /import as a draft/i });

describe('ImportScreen checking', () => {
  it('sends the pasted text as it is and starts with import switched off', async () => {
    api.previewImport.mockResolvedValue({ valid: true, errors: [], summary: summary() });
    render(<ImportScreen />);
    expect(screen.getByRole('button', { name: /check the file/i })).toBeDisabled();
    expect(importButton()).toBeDisabled();

    await paste();
    await check();

    expect(api.previewImport).toHaveBeenCalledWith(YAML);
  });

  it('shows every problem with its line, ordered by line', async () => {
    api.previewImport.mockResolvedValue(invalid);
    render(<ImportScreen />);
    await paste();
    await check();

    expect(await screen.findByText('2 problems to fix')).toBeInTheDocument();
    const alert = screen.getByText('2 problems to fix').closest('[role="alert"]') as HTMLElement;
    const items = within(alert).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Line 3:9');
    expect(items[0]).toHaveTextContent('training.slug');
    expect(items[1]).toHaveTextContent('Line 11:9');
    expect(items[1]).toHaveTextContent('exactly one correct option');
    expect(importButton()).toBeDisabled();
  });

  it('marks the problem lines in the text, with the message under each', async () => {
    api.previewImport.mockResolvedValue(invalid);
    render(<ImportScreen />);
    await paste();
    await check();

    const region = await screen.findByRole('region', { name: /problems marked/i });
    const line3 = within(region).getByTestId('source-line-3');
    expect(line3).toHaveTextContent('slug: Laser Cutter');
    expect(line3).toHaveTextContent('Column 9: slug must be lowercase');
    expect(within(region).getByTestId('source-line-11')).toHaveTextContent('options:');
    // Lines far from any problem are folded away.
    expect(within(region).queryByTestId('source-line-16')).not.toBeInTheDocument();
    expect(within(region).queryByTestId('source-line-1')).toBeInTheDocument();
  });

  it('shows what a valid file would create, and switches import on', async () => {
    api.previewImport.mockResolvedValue({ valid: true, errors: [], summary: summary() });
    render(<ImportScreen />);
    await paste();
    await check();

    const card = await screen.findByRole('region', { name: /what the import would do/i });
    expect(within(card).getByText(/the file is valid/i)).toBeInTheDocument();
    expect(within(card).getByText(/would create the training/i)).toBeInTheDocument();
    expect(within(card).getByText(/4 questions in total/i)).toBeInTheDocument();
    expect(within(card).getByText(/3 sign-off checklist items/i)).toBeInTheDocument();
    expect(within(card).getByText(/meet the laser cutter/i)).toBeInTheDocument();
    expect(importButton()).toBeEnabled();
  });

  it('says what an import into an existing training changes', async () => {
    api.previewImport.mockResolvedValue({
      valid: true,
      errors: [],
      summary: summary({
        newTraining: false,
        draftVersionNo: 3,
        questionsAdded: 1,
        questionsChanged: 2,
        questionsUnchanged: 5,
        questionsRetired: 1,
      }),
    });
    render(<ImportScreen />);
    await paste();
    await check();

    expect(await screen.findByText(/would add/i)).toHaveTextContent('draft version 3');
    expect(screen.getByText('2 changed (new versions)')).toBeInTheDocument();
    expect(screen.getByText('1 retired (no longer in the file)')).toBeInTheDocument();
  });

  it('switches import off again as soon as the text changes', async () => {
    api.previewImport.mockResolvedValue({ valid: true, errors: [], summary: summary() });
    render(<ImportScreen />);
    await paste();
    await check();
    await screen.findByText(/the file is valid/i);
    expect(importButton()).toBeEnabled();

    await userEvent.type(screen.getByRole('textbox', { name: /training file/i }), ' ');

    expect(importButton()).toBeDisabled();
    expect(screen.queryByText(/the file is valid/i)).not.toBeInTheDocument();
  });

  it('says so when the check itself cannot run', async () => {
    api.previewImport.mockRejectedValue(new ApiError('REQUEST_FAILED', 'offline'));
    render(<ImportScreen />);
    await paste();
    await check();

    expect(await screen.findByText(/reach the server/i)).toBeInTheDocument();
  });
});

describe('ImportScreen importing', () => {
  async function checkedValid() {
    api.previewImport.mockResolvedValue({ valid: true, errors: [], summary: summary() });
    render(<ImportScreen />);
    await paste();
    await check();
    await screen.findByText(/the file is valid/i);
  }

  it('imports the checked text and links to the new draft', async () => {
    api.importTraining.mockResolvedValue({ trainingId: 9, draftVersionId: 90, summary: summary() });
    await checkedValid();

    await userEvent.click(importButton());

    expect(api.importTraining).toHaveBeenCalledWith(YAML);
    expect(await screen.findByText('Created Laser Cutter')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open the draft/i })).toHaveAttribute(
      'href',
      '/admin/training/9/draft',
    );
  });

  it('shows line-numbered errors when the import itself finds problems', async () => {
    api.importTraining.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [
          {
            line: 5,
            column: 3,
            path: 'training.equipmentGroup',
            message: "No equipment group 'laser-cutters'",
          },
        ],
      }),
    );
    await checkedValid();

    await userEvent.click(importButton());

    expect(await screen.findByText('1 problem to fix')).toBeInTheDocument();
    expect(
      screen.getByText(/no equipment group 'laser-cutters'/i, { selector: 'li' }),
    ).toHaveTextContent('Line 5:3');
    expect(screen.getByTestId('source-line-5')).toBeInTheDocument();
    expect(importButton()).toBeDisabled();
  });

  it('explains a conflict, such as a training that already has a draft', async () => {
    api.importTraining.mockRejectedValue(
      new ApiError('CONFLICT', 'Laser Cutter already has a draft; finish or discard it first'),
    );
    await checkedValid();

    await userEvent.click(importButton());

    expect(await screen.findByText(/already has a draft/i)).toBeInTheDocument();
    expect(screen.queryByText('Created Laser Cutter')).not.toBeInTheDocument();
  });

  it('words a file that is too large for the server', async () => {
    api.importTraining.mockRejectedValue(new ApiError('PAYLOAD_TOO_LARGE', 'too big'));
    await checkedValid();

    await userEvent.click(importButton());

    expect(await screen.findByText(/at most 512 KB/i)).toBeInTheDocument();
  });
});

describe('ImportScreen getting the text in', () => {
  it('fills the box from an uploaded file', async () => {
    render(<ImportScreen />);
    const file = new File([YAML], 'laser-cutter.yaml', { type: 'text/plain' });

    await userEvent.upload(screen.getByLabelText(/choose a file to import/i), file);

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /training file/i })).toHaveValue(YAML),
    );
  });

  it('refuses an uploaded file over 512 KB', async () => {
    render(<ImportScreen />);
    const file = new File([new Uint8Array(513 * 1024)], 'big.yaml', { type: 'text/plain' });

    await userEvent.upload(screen.getByLabelText(/choose a file to import/i), file);

    expect(await screen.findByText(/larger than 512 KB/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /training file/i })).toHaveValue('');
  });

  it('can insert a small example', async () => {
    render(<ImportScreen />);

    await userEvent.click(screen.getByRole('button', { name: /insert an example/i }));

    expect(
      (screen.getByRole('textbox', { name: /training file/i }) as HTMLTextAreaElement).value,
    ).toContain('format: 3dw-training/1');
    expect(screen.getByRole('button', { name: /check the file/i })).toBeEnabled();
  });
});

describe('AnnotatedSource', () => {
  it('shows nothing when no error has a line', () => {
    const { container } = render(
      <AnnotatedSource
        text={YAML}
        errors={[{ line: null, column: null, path: null, message: 'General problem' }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('folds the lines between two distant problems', () => {
    render(
      <AnnotatedSource
        text={YAML}
        errors={[
          { line: 2, column: null, path: null, message: 'early' },
          { line: 16, column: null, path: null, message: 'late' },
        ]}
      />,
    );

    expect(screen.getByTestId('source-line-4')).toBeInTheDocument();
    expect(screen.queryByTestId('source-line-9')).not.toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByTestId('source-line-14')).toBeInTheDocument();
  });
});
