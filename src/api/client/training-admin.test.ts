import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { ApiError } from './errors';
import { trainingAdminAPI, trainingAdminPaths } from './training-admin';

interface Seen {
  method: string;
  url: URL;
  contentType: string | null;
  body: string;
}

let seen: Seen[] = [];

function answer(data: unknown = null, init: { status?: number; error?: object } = {}) {
  mockServer.use(
    http.all('*/api/v1/*', async ({ request }) => {
      seen.push({
        method: request.method,
        url: new URL(request.url),
        contentType: request.headers.get('Content-Type'),
        body: await request.text(),
      });
      return HttpResponse.json(
        init.error ? { success: false, data: null, error: init.error } : { success: true, data },
        { status: init.status ?? 200 },
      );
    }),
  );
}

beforeEach(() => {
  seen = [];
});

describe('trainingAdminAPI paths and bodies', () => {
  it('calls the equipment endpoints of the contract', async () => {
    answer([]);
    await trainingAdminAPI.listGroups();
    await trainingAdminAPI.listMachines(5);
    await trainingAdminAPI.listMachines();
    await trainingAdminAPI.updateGroup(5, { slug: 'a', name: 'A', active: false });

    expect(seen.map((s) => `${s.method} ${s.url.pathname}${s.url.search}`)).toEqual([
      'GET /api/v1/admin/training/equipment-groups',
      'GET /api/v1/admin/training/machines?groupId=5',
      'GET /api/v1/admin/training/machines',
      'PUT /api/v1/admin/training/equipment-groups/5',
    ]);
    expect(JSON.parse(seen[3].body)).toEqual({ slug: 'a', name: 'A', active: false });
  });

  it('calls the draft, step and blueprint endpoints', async () => {
    answer({});
    await trainingAdminAPI.createDraft(3);
    await trainingAdminAPI.reorderSteps(100, [2, 1]);
    await trainingAdminAPI.setBlueprint(100, 9, [{ topicId: 7, drawCount: null }]);
    await trainingAdminAPI.setChecklist(100, [{ key: 'estop', label: 'E-stop' }]);
    await trainingAdminAPI.discardDraft(100);

    expect(seen.map((s) => `${s.method} ${s.url.pathname}`)).toEqual([
      'POST /api/v1/admin/training/trainings/3/drafts',
      'PUT /api/v1/admin/training/versions/100/steps/order',
      'PUT /api/v1/admin/training/versions/100/steps/9/blueprint',
      'PUT /api/v1/admin/training/versions/100/signoff-checklist',
      'DELETE /api/v1/admin/training/versions/100',
    ]);
    expect(JSON.parse(seen[1].body)).toEqual({ stepIds: [2, 1] });
    expect(JSON.parse(seen[2].body)).toEqual({ rules: [{ topicId: 7, drawCount: null }] });
    expect(JSON.parse(seen[3].body)).toEqual({ items: [{ key: 'estop', label: 'E-stop' }] });
  });

  it('asks the publish check about the chosen impact and publishes with a reason', async () => {
    answer({ ready: true, issues: [] });
    await trainingAdminAPI.publishCheck(100, 'ADDON');
    await trainingAdminAPI.publish(100, { impact: 'FULL_RETAKE', reason: 'Unsafe' });

    expect(seen[0].url.pathname + seen[0].url.search).toBe(
      '/api/v1/admin/training/versions/100/publish-check?impact=ADDON',
    );
    expect(seen[1].method).toBe('POST');
    expect(JSON.parse(seen[1].body)).toEqual({ impact: 'FULL_RETAKE', reason: 'Unsafe' });
  });

  it('reads the student preview of a version with a plain GET and sends nothing', async () => {
    answer({ attempt: {}, quizzes: [], answerKey: [], videos: [] });
    await trainingAdminAPI.getPreview(100);

    expect(seen).toHaveLength(1);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/training/versions/100/preview');
    expect(seen[0].body).toBe('');
    expect(trainingAdminPaths.preview(100)).toBe('/api/v1/admin/training/versions/100/preview');
  });

  it('asks for a video upload URL on the learner-side admin path', async () => {
    answer({ assetKey: 'videos/a.mp4' });
    await trainingAdminAPI.getVideoUploadUrl({ contentType: 'video/mp4', sizeBytes: 10 });

    expect(seen[0].url.pathname).toBe('/api/v1/training/admin/videos/upload-url');
    expect(JSON.parse(seen[0].body)).toEqual({ contentType: 'video/mp4', sizeBytes: 10 });
  });

  it('filters questions by topic and works the question bank', async () => {
    answer([]);
    await trainingAdminAPI.listQuestions(1);
    await trainingAdminAPI.listQuestions(1, 7);
    await trainingAdminAPI.restoreQuestion(41);
    await trainingAdminAPI.getQuestionReport(1);

    expect(seen.map((s) => `${s.method} ${s.url.pathname}${s.url.search}`)).toEqual([
      'GET /api/v1/admin/training/trainings/1/questions',
      'GET /api/v1/admin/training/trainings/1/questions?topicId=7',
      'POST /api/v1/admin/training/questions/41/restore',
      'GET /api/v1/admin/training/trainings/1/question-report',
    ]);
  });

  it('records corrections and re-scores', async () => {
    answer({});
    await trainingAdminAPI.addCorrection(502, { kind: 'DROP_QUESTION', reason: 'Wrong' });
    await trainingAdminAPI.rescore(502);
    await trainingAdminAPI.listCorrections(502);

    expect(seen.map((s) => `${s.method} ${s.url.pathname}`)).toEqual([
      'POST /api/v1/admin/training/question-versions/502/corrections',
      'POST /api/v1/admin/training/question-versions/502/rescore',
      'GET /api/v1/admin/training/question-versions/502/corrections',
    ]);
  });

  it('sends an imported file as plain text, not JSON', async () => {
    answer({ valid: true, errors: [], summary: null });
    const yaml = 'format: 3dw-training/1\ntraining:\n  slug: "x"\n';

    await trainingAdminAPI.previewImport(yaml);
    await trainingAdminAPI.importTraining(yaml);

    expect(seen.map((s) => `${s.method} ${s.url.pathname}`)).toEqual([
      'POST /api/v1/admin/training/import/preview',
      'POST /api/v1/admin/training/import',
    ]);
    for (const request of seen) {
      expect(request.contentType).toBe('text/plain');
      expect(request.body).toBe(yaml);
    }
  });

  it('has a path for every request it makes', () => {
    expect(trainingAdminPaths.step(1, 2)).toBe('/api/v1/admin/training/versions/1/steps/2');
    expect(trainingAdminPaths.settingsDefaults).toBe(
      '/api/v1/admin/training/trainings/settings-defaults',
    );
  });
});

describe('trainingAdminAPI audit log', () => {
  it('asks for the audit log with only the filters that are set', async () => {
    answer({ data: [], pagination: {} });

    await trainingAdminAPI.listAuditLog({
      trainingId: 3,
      action: 'STEP_ADDED',
      pageSize: 50,
      actorId: undefined,
    });

    expect(seen[0].method).toBe('GET');
    expect(seen[0].url.pathname).toBe('/api/v1/admin/training/audit-log');
    expect(seen[0].url.searchParams.get('trainingId')).toBe('3');
    expect(seen[0].url.searchParams.get('action')).toBe('STEP_ADDED');
    expect(seen[0].url.searchParams.get('pageSize')).toBe('50');
    expect(seen[0].url.searchParams.has('actorId')).toBe(false);
  });

  it('asks for the first page with no query string at all when nothing is filtered', async () => {
    answer({ data: [], pagination: {} });

    await trainingAdminAPI.listAuditLog({});

    expect(seen[0].url.pathname).toBe('/api/v1/admin/training/audit-log');
    expect(seen[0].url.search).toBe('');
  });
});

describe('trainingAdminAPI errors', () => {
  it('throws the server’s code and its list of problems', async () => {
    answer(null, {
      status: 422,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: { errors: [{ path: 'x', message: 'bad', line: 3 }] },
      },
    });

    const error = await trainingAdminAPI.previewImport('x').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details).toEqual({ errors: [{ path: 'x', message: 'bad', line: 3 }] });
  });
});
