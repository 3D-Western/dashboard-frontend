import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError } from '@/api/client/errors';
import { PreviewProblemError } from '@/api/client/training-errors';
import { createPreview } from '@test/utils/trainingPreviewFactories';
import type { TrainingPreview } from '@/types/training-preview';
import { createPreviewSession } from './training-preview-session';

const options = { versionLabel: 'Draft version 2', exitHref: '/admin/training/1/draft' };
const start = (
  preview: TrainingPreview = createPreview(),
  refetch?: () => Promise<TrainingPreview>,
) => createPreviewSession(preview, { ...options, refetch });

const statuses = async (session: ReturnType<typeof start>) =>
  (await session.api.getAttempt(0)).steps.map((s) => s.status);

afterEach(() => vi.restoreAllMocks());

describe('a preview session', () => {
  it('starts at the pledge with every step locked, like a new attempt', async () => {
    const session = start();

    const attempt = await session.api.getAttempt(0);

    expect(attempt.pledgeRequired).toBe(true);
    expect(await statuses(session)).toEqual(['LOCKED', 'LOCKED', 'LOCKED', 'LOCKED']);
    expect(attempt.steps[0].video).toBeNull();
  });

  it('unlocks steps one at a time after the pledge', async () => {
    const session = start();

    const attempt = await session.api.acceptPledge(0);

    expect(attempt.pledgeRequired).toBe(false);
    expect(await statuses(session)).toEqual(['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED']);
    expect(attempt.steps[0].video?.checkpoints).toHaveLength(1);
  });

  it('never sends anything over the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const session = start();

    await session.api.acceptPledge(0);
    await session.api.sendHeartbeat(0, 1, { ranges: [{ start: 0, end: 100 }], focusLossCount: 0 });
    await session.api.answerCheckpoint(0, 1, 601, [11]);
    await session.api.completeReading(0, 2, { dwellSeconds: 1, optionIds: [21] });
    await session.api.acceptAttestation(0, 3);
    await session.api.openQuiz(0, 4);
    await session.api.submitQuiz(0, 4, [
      { questionVersionId: 701, optionIds: [31] },
      { questionVersionId: 702, optionIds: [41, 42] },
      { questionVersionId: 703, optionIds: [51] },
    ]);
    session.controls.finishQuiz(4);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await session.api.getAttempt(0)).status).toBe('PASSED');
  });

  describe('video', () => {
    it('credits what was played and finishes only with enough watched and every question answered', async () => {
      const session = start();
      await session.api.acceptPledge(0);

      const watched = await session.api.sendHeartbeat(0, 1, {
        ranges: [{ start: 0, end: 95 }],
        focusLossCount: 0,
      });
      expect(watched.watchedPercent).toBe(95);
      expect(watched.stepCompleted).toBe(false);
      expect(watched.checkpointsRemaining).toEqual([601]);

      const answered = await session.api.answerCheckpoint(0, 1, 601, [11]);
      expect(answered).toEqual({ correct: true, rewatchFromSeconds: null, stepCompleted: true });
      expect(await statuses(session)).toEqual(['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED']);
    });

    it('a wrong checkpoint answer sends the student back and reveals nothing', async () => {
      const session = start();
      await session.api.acceptPledge(0);

      const wrong = await session.api.answerCheckpoint(0, 1, 601, [12]);

      expect(wrong).toEqual({ correct: false, rewatchFromSeconds: 0, stepCompleted: false });
    });

    it('keeps watched ranges between visits, merged', async () => {
      const session = start();
      await session.api.acceptPledge(0);
      await session.api.sendHeartbeat(0, 1, { ranges: [{ start: 0, end: 10 }], focusLossCount: 0 });
      await session.api.sendHeartbeat(0, 1, {
        ranges: [{ start: 10, end: 20 }],
        focusLossCount: 0,
      });

      const video = (await session.api.getAttempt(0)).steps[0].video!;

      expect(video.watchedRanges).toEqual([{ start: 0, end: 20 }]);
      expect(video.watchedPercent).toBe(20);
    });

    it('hands out the staff playback link, and says why when there is none', async () => {
      const session = start();
      const playback = await session.api.getPlaybackUrl(0, 1);
      expect(playback.url).toBe('https://videos.test/laser.mp4');

      const noFile = start(
        createPreview({
          videos: [
            {
              stepId: 1,
              url: null,
              expiresAt: null,
              durationSeconds: null,
              problem: 'No video file yet.',
            },
          ],
        }),
      );
      await expect(noFile.api.getPlaybackUrl(0, 1)).rejects.toThrow(PreviewProblemError);
      await expect(noFile.api.getPlaybackUrl(0, 1)).rejects.toThrow('No video file yet.');
    });

    it('says why a video cannot be previewed even when its file is fine', async () => {
      const broken = start(
        createPreview({
          videos: [
            {
              stepId: 1,
              url: 'https://videos.test/laser.mp4',
              expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
              durationSeconds: 100,
              problem: 'The question for the checkpoint at 0:50 no longer exists.',
            },
          ],
        }),
      );

      await expect(broken.api.getPlaybackUrl(0, 1)).rejects.toThrow('no longer exists');
    });

    it('asks the server for a fresh link when the one in hand is about to expire', async () => {
      const expiring = createPreview({
        videos: [
          {
            stepId: 1,
            url: 'https://old',
            expiresAt: new Date(Date.now() + 10_000).toISOString(),
            durationSeconds: 100,
            problem: null,
          },
        ],
      });
      const refetch = vi.fn().mockResolvedValue(createPreview());
      const session = start(expiring, refetch);

      const playback = await session.api.getPlaybackUrl(0, 1);

      expect(refetch).toHaveBeenCalledOnce();
      expect(playback.url).toBe('https://videos.test/laser.mp4');
    });
  });

  describe('reading and attestation', () => {
    it('a wrong gate answer keeps the step open; a right one finishes it', async () => {
      const session = start();
      await session.api.acceptPledge(0);

      expect(await session.api.completeReading(0, 2, { dwellSeconds: 5, optionIds: [22] })).toEqual(
        {
          stepCompleted: false,
          gateCorrect: false,
        },
      );
      expect(await session.api.completeReading(0, 2, { dwellSeconds: 5, optionIds: [21] })).toEqual(
        {
          stepCompleted: true,
          gateCorrect: true,
        },
      );
    });
  });

  describe('quiz', () => {
    const everyAnswer = (overrides: Record<number, number[]> = {}) =>
      Object.entries({ 701: [31], 702: [41, 42], 703: [51], ...overrides }).map(
        ([id, optionIds]) => ({ questionVersionId: Number(id), optionIds }),
      );

    it('returns the drawn questions with whatever was saved', async () => {
      const session = start();
      await session.api.openQuiz(0, 4);

      const saved = await session.api.saveQuizAnswers(0, 4, [
        { questionVersionId: 701, optionIds: [32] },
      ]);

      expect(saved.questions.map((q) => q.selectedOptionIds)).toEqual([[32], null, null]);
    });

    it('grades like the server and keeps the review for the player to show', async () => {
      const session = start();
      await session.api.openQuiz(0, 4);

      const result = await session.api.submitQuiz(0, 4, everyAnswer({ 701: [32] }));

      expect(result).toMatchObject({
        passed: false,
        passMarkPercent: 90,
        criticalAllCorrect: true,
      });
      expect(result.reviewSteps).toEqual([{ position: 2, stepId: 2, title: 'Safe operation' }]);
      const reveal = session.controls.quizReveal(4)!;
      expect(reveal.questions.map((q) => q.correct)).toEqual([false, true, true]);
      expect(reveal.questions[0].correctOptionIds).toEqual([31]);
      expect(reveal.questions[0].explanationMarkdown).toContain('fire risk');
      expect(reveal.questions[2].critical).toBe(true);
    });

    it('will not grade an unfinished quiz', async () => {
      const session = start();
      await session.api.openQuiz(0, 4);

      await expect(
        session.api.submitQuiz(0, 4, [{ questionVersionId: 701, optionIds: [31] }]),
      ).rejects.toMatchObject({ code: 'QUIZ_INCOMPLETE' });
      await expect(
        session.api.submitQuiz(0, 4, [{ questionVersionId: 701, optionIds: [31] }]),
      ).rejects.toBeInstanceOf(ApiError);
    });

    it('only moves on after a pass, and a retake wipes the answers at once', async () => {
      const session = start();
      await session.api.acceptPledge(0);
      session.controls.skipStep();
      session.controls.skipStep();
      session.controls.skipStep();

      await session.api.submitQuiz(0, 4, everyAnswer({ 703: [52] }));
      session.controls.finishQuiz(4);
      expect(await statuses(session)).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED', 'AVAILABLE']);

      await session.controls.retakeQuiz(4);
      expect(session.controls.quizReveal(4)).toBeNull();
      expect((await session.api.openQuiz(0, 4)).questions.every((q) => !q.selectedOptionIds)).toBe(
        true,
      );

      await session.api.submitQuiz(0, 4, everyAnswer());
      session.controls.finishQuiz(4);
      expect((await session.api.getAttempt(0)).status).toBe('PASSED');
    });

    it('draws again from the server on a retake when it can', async () => {
      const redraw = createPreview();
      redraw.quizzes[0].questions = redraw.quizzes[0].questions.slice(0, 1);
      const session = start(createPreview(), vi.fn().mockResolvedValue(redraw));
      await session.controls.retakeQuiz(4);

      expect((await session.api.openQuiz(0, 4)).questions).toHaveLength(1);
    });

    it('redraws every quiz step together on a retake, so no question shows up in two of them', async () => {
      const twoQuizzes = (first: number[], second: number[]) => {
        const preview = createPreview();
        const pool = new Map(preview.quizzes[0].questions.map((q) => [q.questionVersionId, q]));
        preview.attempt.steps.push({
          ...preview.attempt.steps[3],
          stepId: 5,
          position: 5,
          title: 'Second quiz',
        });
        preview.quizzes = [
          { stepId: 4, questions: first.map((id) => pool.get(id)!), problem: null },
          { stepId: 5, questions: second.map((id) => pool.get(id)!), problem: null },
        ];
        return preview;
      };
      const ids = async (session: ReturnType<typeof start>, stepId: number) =>
        (await session.api.openQuiz(0, stepId)).questions.map((q) => q.questionVersionId);
      // The second fetch swaps the two sets, as a random draw may
      const refetch = vi.fn().mockResolvedValue(twoQuizzes([703], [701, 702]));
      const session = start(twoQuizzes([701, 702], [703]), refetch);
      expect(await ids(session, 4)).toEqual([701, 702]);

      await session.controls.retakeQuiz(4);

      expect(refetch).toHaveBeenCalledTimes(1);
      const first = await ids(session, 4);
      const second = await ids(session, 5);
      expect(first).toEqual([703]);
      expect(second).toEqual([701, 702]);
      expect(first.filter((id) => second.includes(id))).toEqual([]);
    });

    it('explains an unfinished quiz instead of failing', async () => {
      const session = start(
        createPreview({
          quizzes: [{ stepId: 4, questions: [], problem: 'This quiz has no topics yet.' }],
        }),
      );

      await expect(session.api.openQuiz(0, 4)).rejects.toThrow('This quiz has no topics yet.');
    });
  });

  describe('controls', () => {
    it('skips the current step, and starting over forgets everything', async () => {
      const session = start();
      await session.api.acceptPledge(0);
      await session.api.answerCheckpoint(0, 1, 601, [11]);

      session.controls.skipStep();
      expect(await statuses(session)).toEqual(['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED']);

      session.controls.restart();
      const attempt = await session.api.getAttempt(0);
      expect(attempt.pledgeRequired).toBe(true);
      expect(await statuses(session)).toEqual(['LOCKED', 'LOCKED', 'LOCKED', 'LOCKED']);
      await session.api.acceptPledge(0);
      expect((await session.api.getAttempt(0)).steps[0].video?.checkpoints[0].passed).toBe(false);
    });

    it('carries the version label and the way back to the editor', () => {
      const session = start();
      expect(session.controls.versionLabel).toBe('Draft version 2');
      expect(session.controls.exitHref).toBe('/admin/training/1/draft');
    });
  });
});
