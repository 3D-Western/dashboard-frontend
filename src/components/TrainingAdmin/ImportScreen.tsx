'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { CheckCircle2, FileUp } from 'lucide-react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { adminErrorMessage, importErrorsFromError } from '@/lib/training-admin-errors';
import { STEP_TYPE_LABELS } from '@/lib/training-admin-format';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import type { ImportError, ImportResult, ImportSummary } from '@/types/training-admin';
import { ErrorNote, WarningList } from './feedback';

export const MAX_IMPORT_BYTES = 512 * 1024;

const EXAMPLE = `format: 3dw-training/1

training:
  slug: maker-orientation
  title: Maker Orientation
  kind: ORIENTATION

topics:
  - slug: basics
    name: Basics
    questions:
      - prompt: Who may use the makerspace?
        options:
          - text: Anyone, with no training
          - text: Members who have finished orientation
            correct: true

steps:
  - type: READING
    title: Welcome
    body: |
      ## Welcome
      Be kind, clean up after yourself, and ask if you are unsure.
  - type: QUIZ
    title: Final quiz
    draw: all
`;

const byteLength = (text: string) => new Blob([text]).size;

/**
 * /admin/training/import: paste or upload the training file, check it (nothing is saved), then
 * import it as a draft. Every problem is shown with its line, against the text itself.
 */
export function ImportScreen() {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [warnings, setWarnings] = useState<ImportError[]>([]);
  /** The exact text that passed the check; the import button only works for that text. */
  const [validText, setValidText] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const tooLarge = byteLength(text) > MAX_IMPORT_BYTES;
  const reset = () => {
    setErrors([]);
    setWarnings([]);
    setSummary(null);
    setValidText(null);
    setChecked(false);
    setFailure(null);
    setResult(null);
  };

  const change = (value: string) => {
    setText(value);
    reset();
  };

  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      change('');
      setFailure('That file is larger than 512 KB, which is more than an import can hold.');
      return;
    }
    change(await file.text());
  };

  const check = async () => {
    setChecking(true);
    reset();
    try {
      const preview = await trainingAdminAPI.previewImport(text);
      setChecked(true);
      setErrors(preview.errors);
      setWarnings(preview.warnings ?? []);
      setSummary(preview.valid ? preview.summary : null);
      setValidText(preview.valid ? text : null);
    } catch (error) {
      setFailure(adminErrorMessage(error, "We couldn't check the file."));
    } finally {
      setChecking(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setFailure(null);
    try {
      setResult(await trainingAdminAPI.importTraining(text));
    } catch (error) {
      const found = importErrorsFromError(error);
      if (found.length > 0) {
        setErrors(found);
        setSummary(null);
        setValidText(null);
        setChecked(true);
      } else {
        setFailure(adminErrorMessage(error, "We couldn't import the file."));
      }
    } finally {
      setImporting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="size-5 text-green-600" />
          {result.summary.newTraining
            ? `Created ${result.summary.title}`
            : `Added draft version ${result.summary.draftVersionNo} of ${result.summary.title}`}
        </p>
        <p className="text-sm text-muted-foreground">
          The draft is not visible to members yet. Open it to upload the video, check it and publish
          it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={TrainingAdminRoutes.draft(result.trainingId)}>Open the draft</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => change('')}>
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="max-w-prose text-sm text-muted-foreground">
        Write a training as one YAML file (in any text editor, or with AI help), then check it here.
        Checking saves nothing and lists every problem with its line. Importing creates a new
        training, or a new draft version if the training already exists. It never changes a
        published version.
      </p>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="import-text" className="text-sm font-medium">
            Training file (YAML)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".yaml,.yml,.txt,text/plain,application/yaml"
              aria-label="Choose a file to import"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => void chooseFile(event)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInput.current?.click()}
            >
              <FileUp /> Upload a file
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => change(EXAMPLE)}>
              Insert an example
            </Button>
          </div>
        </div>
        <Textarea
          id="import-text"
          value={text}
          onChange={(event) => change(event.target.value)}
          rows={16}
          spellCheck={false}
          placeholder="format: 3dw-training/1"
          className="font-mono text-base whitespace-pre md:text-sm"
          aria-describedby="import-size"
        />
        <p
          id="import-size"
          className={tooLarge ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
        >
          {tooLarge
            ? 'This is larger than 512 KB, the most an import can hold.'
            : `${Math.round(byteLength(text) / 1024)} KB of 512 KB`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={text.trim() === '' || tooLarge || checking}
          onClick={() => void check()}
        >
          {checking ? 'Checking...' : 'Check the file'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={validText === null || validText !== text || importing}
          onClick={() => void runImport()}
        >
          {importing ? 'Importing...' : 'Import as a draft'}
        </Button>
      </div>

      <ErrorNote message={failure} />

      {checked && errors.length === 0 && summary && <ImportSummaryCard summary={summary} />}

      {checked && (
        <WarningList issues={warnings} title="Worth a look (the file can still be imported)" />
      )}

      {errors.length > 0 && (
        <div className="space-y-3">
          <Alert variant="destructive">
            <AlertTitle>
              {errors.length === 1 ? '1 problem' : `${errors.length} problems`} to fix
            </AlertTitle>
            <AlertDescription>
              <ul className="space-y-1">
                {[...errors]
                  .sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
                  .map((error, index) => (
                    <li key={`${error.line}-${error.column}-${index}`}>
                      <span className="font-mono text-xs">
                        {error.line
                          ? `Line ${error.line}${error.column ? `:${error.column}` : ''}`
                          : 'File'}
                      </span>{' '}
                      {error.path && <span className="font-medium">{error.path}: </span>}
                      {error.message}
                    </li>
                  ))}
              </ul>
            </AlertDescription>
          </Alert>
          <AnnotatedSource text={text} errors={errors} />
        </div>
      )}
    </div>
  );
}

function ImportSummaryCard({ summary }: { summary: ImportSummary }) {
  return (
    <section
      className="space-y-3 rounded-xl border bg-card p-4"
      aria-label="What the import would do"
    >
      <p className="flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-5 text-green-600" /> The file is valid.
      </p>
      <p className="text-sm">
        {summary.newTraining ? (
          <>
            It would create the training <strong>{summary.title}</strong> with a first draft.
          </>
        ) : (
          <>
            It would add <strong>draft version {summary.draftVersionNo}</strong> to the existing
            training <strong>{summary.title}</strong>.
          </>
        )}
      </p>
      <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        <li>
          {summary.topics} {summary.topics === 1 ? 'topic' : 'topics'}
        </li>
        <li>
          {summary.questions} {summary.questions === 1 ? 'question' : 'questions'} in total
        </li>
        {!summary.newTraining && (
          <>
            <li>{summary.questionsAdded} new</li>
            <li>{summary.questionsChanged} changed (new versions)</li>
            <li>{summary.questionsUnchanged} unchanged</li>
            <li>{summary.questionsRetired} retired (no longer in the file)</li>
          </>
        )}
        <li>
          {summary.signoffChecklistItems} sign-off checklist{' '}
          {summary.signoffChecklistItems === 1 ? 'item' : 'items'}
        </li>
      </ul>
      <ol className="space-y-1 text-sm">
        {summary.steps.map((step) => (
          <li key={step.position}>
            {step.position}. {step.title}{' '}
            <span className="text-muted-foreground">({STEP_TYPE_LABELS[step.type]})</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const CONTEXT_LINES = 2;
const MAX_SHOWN_LINES = 400;

/**
 * The file as numbered lines, trimmed to the lines near a problem, with each message under its
 * line. Lines far from any problem are folded away.
 */
export function AnnotatedSource({ text, errors }: { text: string; errors: ImportError[] }) {
  const lines = text.split('\n');
  const byLine = new Map<number, ImportError[]>();
  for (const error of errors) {
    if (error.line) byLine.set(error.line, [...(byLine.get(error.line) ?? []), error]);
  }
  const visible = new Set<number>();
  for (const line of byLine.keys()) {
    for (let n = line - CONTEXT_LINES; n <= line + CONTEXT_LINES; n++) {
      if (n >= 1 && n <= lines.length) visible.add(n);
    }
  }
  const shown = [...visible].sort((a, b) => a - b).slice(0, MAX_SHOWN_LINES);
  if (shown.length === 0) return null;

  return (
    <div
      className="overflow-x-auto rounded-lg border bg-muted/30 font-mono text-xs"
      role="region"
      aria-label="The file, with problems marked"
    >
      {shown.map((lineNo, index) => {
        const problems = byLine.get(lineNo);
        const gap = index > 0 && lineNo - shown[index - 1] > 1;
        return (
          <div key={lineNo}>
            {gap && <div className="px-3 py-0.5 text-muted-foreground">...</div>}
            <div
              data-testid={`source-line-${lineNo}`}
              className={problems ? 'bg-destructive/10' : undefined}
            >
              <div className="flex">
                <span className="w-12 shrink-0 px-2 py-0.5 text-right text-muted-foreground select-none">
                  {lineNo}
                </span>
                <pre className="min-w-0 flex-1 py-0.5 pr-3 whitespace-pre">
                  {lines[lineNo - 1] || ' '}
                </pre>
              </div>
              {problems?.map((problem, i) => (
                <p key={i} className="py-0.5 pr-3 pl-14 font-sans text-destructive">
                  {problem.column ? `Column ${problem.column}: ` : ''}
                  {problem.message}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
