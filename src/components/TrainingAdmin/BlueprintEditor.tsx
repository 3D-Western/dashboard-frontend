'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Button } from '@/components/ui/button';
import { adminErrorMessage, issuesFromError } from '@/lib/training-admin-errors';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import type { AdminStep, Topic, ValidationIssue } from '@/types/training-admin';
import { ErrorNote, IssueList } from './feedback';
import { useTraining } from './TrainingContext';

interface RuleDraft {
  uid: number;
  topicId: string;
  /** '' means every eligible question. */
  drawCount: string;
}

let nextUid = 1;

interface BlueprintEditorProps {
  versionId: number;
  step: AdminStep;
  /** Topics as the server reports them, with the eligible count for the current draft. */
  topics: Topic[];
  onSaved: (step: AdminStep) => void;
}

/**
 * Which topics a quiz step draws from, and how many questions of each. The eligible count never
 * includes questions that the draft already asks inside a video or after a reading: those are
 * never part of the quiz.
 */
export function BlueprintEditor({ versionId, step, topics, onSaved }: BlueprintEditorProps) {
  const { training } = useTraining();
  const randomDraw = training.settings.randomDrawEnabled;
  const [rules, setRules] = useState<RuleDraft[]>(() =>
    step.blueprint.map((rule) => ({
      uid: nextUid++,
      topicId: String(rule.topicId),
      drawCount: String(rule.drawCount),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const eligible = (topicId: string): number =>
    topics.find((t) => String(t.id) === topicId)?.eligibleCount ?? 0;

  const usedTopics = new Set(rules.map((rule) => rule.topicId));
  const freeTopics = topics.filter((topic) => !usedTopics.has(String(topic.id)));

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setIssues([]);
    try {
      const saved = await trainingAdminAPI.setBlueprint(
        versionId,
        step.id,
        rules
          .filter((rule) => rule.topicId !== '')
          .map((rule) => ({
            topicId: Number(rule.topicId),
            drawCount: !randomDraw || rule.drawCount.trim() === '' ? null : Number(rule.drawCount),
          })),
      );
      toast.success('Quiz topics saved.');
      setRules(
        saved.blueprint.map((rule) => ({
          uid: nextUid++,
          topicId: String(rule.topicId),
          drawCount: String(rule.drawCount),
        })),
      );
      onSaved(saved);
    } catch (error) {
      setIssues(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save the quiz topics."));
    } finally {
      setSaving(false);
    }
  };

  const issueFor = (index: number, field: string) =>
    issues.find((issue) => issue.path === `rules[${index}].${field}`)?.message;
  const unmatched = issues.filter(
    (issue) => !/^rules\[\d+\]\.(topicId|drawCount)$/.test(issue.path ?? ''),
  );

  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Quiz topics">
      <div>
        <h4 className="font-medium">Questions in this quiz</h4>
        <p className="text-sm text-muted-foreground">
          {randomDraw
            ? 'The random draw is on: a quiz can ask fewer questions than a topic holds. Leave the number empty to ask every eligible question.'
            : 'The random draw is off, so everyone gets the same quiz: every eligible question of each topic below is asked.'}{' '}
          <Link
            href={TrainingAdminRoutes.settings(training.id)}
            className="underline underline-offset-2"
          >
            Change in Settings
          </Link>
          .
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Eligible questions leave out the ones this draft asks inside a video or after a reading.
        </p>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No topics yet. Add the topics this quiz should ask about.
        </p>
      )}

      <ul className="space-y-3">
        {rules.map((rule, index) => {
          const topic = topics.find((t) => String(t.id) === rule.topicId);
          const count = eligible(rule.topicId);
          const topicError = issueFor(index, 'topicId');
          const drawError = issueFor(index, 'drawCount');
          return (
            <li key={rule.uid} className="space-y-1.5 rounded-lg bg-muted/40 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-sm font-medium" htmlFor={`rule-topic-${rule.uid}`}>
                    Topic
                  </label>
                  <select
                    id={`rule-topic-${rule.uid}`}
                    value={rule.topicId}
                    onChange={(event) =>
                      setRules((current) =>
                        current.map((r) =>
                          r.uid === rule.uid ? { ...r, topicId: event.target.value } : r,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-base sm:h-8 md:text-sm"
                  >
                    <option value="">Choose a topic</option>
                    {topics
                      .filter((t) => String(t.id) === rule.topicId || freeTopics.includes(t))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-sm font-medium" htmlFor={`rule-draw-${rule.uid}`}>
                    Questions
                  </label>
                  <input
                    id={`rule-draw-${rule.uid}`}
                    inputMode="numeric"
                    value={randomDraw ? rule.drawCount : String(count)}
                    disabled={!randomDraw}
                    placeholder="All"
                    onChange={(event) =>
                      setRules((current) =>
                        current.map((r) =>
                          r.uid === rule.uid ? { ...r, drawCount: event.target.value } : r,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-base disabled:opacity-60 sm:h-8 md:text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${topic?.name ?? 'this topic'} from the quiz`}
                  onClick={() => setRules((current) => current.filter((r) => r.uid !== rule.uid))}
                >
                  <Trash2 />
                </Button>
              </div>
              {topic && (
                <p className="text-xs text-muted-foreground" data-testid={`eligible-${topic.id}`}>
                  {count} eligible {count === 1 ? 'question' : 'questions'} (of{' '}
                  {topic.questionCount} active in this topic)
                </p>
              )}
              {(topicError || drawError) && (
                <p role="alert" className="text-xs text-destructive">
                  {topicError ?? drawError}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={freeTopics.length === 0}
          onClick={() =>
            setRules((current) => [
              ...current,
              {
                uid: nextUid++,
                topicId: String(freeTopics[0].id),
                drawCount: '',
              },
            ])
          }
        >
          <Plus /> Add a topic
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving...' : 'Save quiz topics'}
        </Button>
      </div>
      {topics.length === 0 && (
        <p className="text-xs text-muted-foreground">
          This training has no topics yet. Add some on the Questions page first.
        </p>
      )}
      <IssueList issues={unmatched} title="The server found a problem" />
      <ErrorNote message={unmatched.length === 0 && issues.length === 0 ? failure : null} />
    </section>
  );
}
