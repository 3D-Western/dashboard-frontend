import { apiRequest } from './base';
import { getBaseUrl } from './utils';
import type { PaginatedResponse } from '@/types/common';
import type { TrainingAuditEntry, TrainingAuditQuery } from '@/types/training-audit';
import type {
  AdminQuestion,
  AdminStep,
  AdminTraining,
  AdminTrainingSummary,
  BlueprintRuleBody,
  ChecklistItem,
  Correction,
  CorrectionBody,
  CorrectionPreview,
  CreateTrainingBody,
  EquipmentGroup,
  EquipmentGroupBody,
  ImportPreview,
  ImportResult,
  Machine,
  MachineBody,
  PublishCheck,
  PublishImpact,
  PublishResult,
  QuestionBody,
  QuestionDeleteResult,
  QuestionReportRow,
  Rescore,
  StepBody,
  StepVideoPlayback,
  Topic,
  TrainingSettings,
  UpdateTrainingBody,
  VersionDetail,
  VersionSummary,
  VideoUploadUrl,
  VideoUploadUrlRequest,
} from '@/types/training-admin';

/** Paths of the admin training API (docs/plans/training-v1.md, "Authoring API"). */
const ADMIN = '/api/v1/admin/training';
export const trainingAdminPaths = {
  groups: `${ADMIN}/equipment-groups`,
  group: (id: number) => `${ADMIN}/equipment-groups/${id}`,
  machines: `${ADMIN}/machines`,
  machine: (id: number) => `${ADMIN}/machines/${id}`,
  trainings: `${ADMIN}/trainings`,
  settingsDefaults: `${ADMIN}/trainings/settings-defaults`,
  training: (id: number) => `${ADMIN}/trainings/${id}`,
  trainingSettings: (id: number) => `${ADMIN}/trainings/${id}/settings`,
  versions: (id: number) => `${ADMIN}/trainings/${id}/versions`,
  drafts: (id: number) => `${ADMIN}/trainings/${id}/drafts`,
  version: (versionId: number) => `${ADMIN}/versions/${versionId}`,
  checklist: (versionId: number) => `${ADMIN}/versions/${versionId}/signoff-checklist`,
  steps: (versionId: number) => `${ADMIN}/versions/${versionId}/steps`,
  stepOrder: (versionId: number) => `${ADMIN}/versions/${versionId}/steps/order`,
  step: (versionId: number, stepId: number) => `${ADMIN}/versions/${versionId}/steps/${stepId}`,
  blueprint: (versionId: number, stepId: number) =>
    `${ADMIN}/versions/${versionId}/steps/${stepId}/blueprint`,
  publishCheck: (versionId: number, impact: PublishImpact) =>
    `${ADMIN}/versions/${versionId}/publish-check?impact=${impact}`,
  publish: (versionId: number) => `${ADMIN}/versions/${versionId}/publish`,
  videoUploadUrl: '/api/v1/training/admin/videos/upload-url',
  stepPlayback: (versionId: number, stepId: number) =>
    `${ADMIN}/versions/${versionId}/steps/${stepId}/playback-url`,
  topics: (trainingId: number) => `${ADMIN}/trainings/${trainingId}/topics`,
  topic: (topicId: number) => `${ADMIN}/topics/${topicId}`,
  questions: (trainingId: number) => `${ADMIN}/trainings/${trainingId}/questions`,
  question: (questionId: number) => `${ADMIN}/questions/${questionId}`,
  restoreQuestion: (questionId: number) => `${ADMIN}/questions/${questionId}/restore`,
  corrections: (questionVersionId: number) =>
    `${ADMIN}/question-versions/${questionVersionId}/corrections`,
  rescore: (questionVersionId: number) => `${ADMIN}/question-versions/${questionVersionId}/rescore`,
  previewCorrection: (questionVersionId: number) =>
    `${ADMIN}/question-versions/${questionVersionId}/corrections/preview`,
  questionReport: (trainingId: number) => `${ADMIN}/trainings/${trainingId}/question-report`,
  importPreview: `${ADMIN}/import/preview`,
  importFile: `${ADMIN}/import`,
  auditLog: `${ADMIN}/audit-log`,
};

const request = <T>(method: string, path: string, body?: unknown, options?: RequestInit) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...options,
  });

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body);
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body);
const del = <T = null>(path: string) => request<T>('DELETE', path);

/** The YAML file goes over as the request body, not as JSON. */
const postYaml = <T>(path: string, yaml: string) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain' },
    body: yaml,
  });

export const trainingAdminAPI = {
  // ---- Equipment ----
  listGroups: () => get<EquipmentGroup[]>(trainingAdminPaths.groups),
  createGroup: (body: EquipmentGroupBody) => post<EquipmentGroup>(trainingAdminPaths.groups, body),
  updateGroup: (id: number, body: EquipmentGroupBody) =>
    put<EquipmentGroup>(trainingAdminPaths.group(id), body),
  listMachines: (groupId?: number) =>
    get<Machine[]>(
      groupId === undefined
        ? trainingAdminPaths.machines
        : `${trainingAdminPaths.machines}?groupId=${groupId}`,
    ),
  deleteGroup: (id: number) => del(trainingAdminPaths.group(id)),
  createMachine: (body: MachineBody) => post<Machine>(trainingAdminPaths.machines, body),
  updateMachine: (id: number, body: MachineBody) =>
    put<Machine>(trainingAdminPaths.machine(id), body),
  deleteMachine: (id: number) => del(trainingAdminPaths.machine(id)),

  // ---- Trainings and settings ----
  listTrainings: () => get<AdminTrainingSummary[]>(trainingAdminPaths.trainings),
  createTraining: (body: CreateTrainingBody) =>
    post<AdminTraining>(trainingAdminPaths.trainings, body),
  getTraining: (id: number) => get<AdminTraining>(trainingAdminPaths.training(id)),
  updateTraining: (id: number, body: UpdateTrainingBody) =>
    patch<AdminTraining>(trainingAdminPaths.training(id), body),
  getSettingsDefaults: () => get<TrainingSettings>(trainingAdminPaths.settingsDefaults),
  updateSettings: (id: number, settings: TrainingSettings) =>
    put<AdminTraining>(trainingAdminPaths.trainingSettings(id), settings),

  // ---- Drafts, steps and the quiz blueprint ----
  listVersions: (id: number) => get<VersionSummary[]>(trainingAdminPaths.versions(id)),
  createDraft: (id: number) => post<VersionDetail>(trainingAdminPaths.drafts(id)),
  getVersion: (versionId: number) => get<VersionDetail>(trainingAdminPaths.version(versionId)),
  discardDraft: (versionId: number) => del(trainingAdminPaths.version(versionId)),
  setChecklist: (versionId: number, items: ChecklistItem[]) =>
    put<VersionDetail>(trainingAdminPaths.checklist(versionId), { items }),
  addStep: (versionId: number, body: StepBody) =>
    post<AdminStep>(trainingAdminPaths.steps(versionId), body),
  updateStep: (versionId: number, stepId: number, body: StepBody) =>
    put<AdminStep>(trainingAdminPaths.step(versionId, stepId), body),
  deleteStep: (versionId: number, stepId: number) =>
    del(trainingAdminPaths.step(versionId, stepId)),
  reorderSteps: (versionId: number, stepIds: number[]) =>
    put<VersionDetail>(trainingAdminPaths.stepOrder(versionId), { stepIds }),
  setBlueprint: (versionId: number, stepId: number, rules: BlueprintRuleBody[]) =>
    put<AdminStep>(trainingAdminPaths.blueprint(versionId, stepId), { rules }),

  /** A presigned PUT URL for a video file. The browser then uploads straight to storage. */
  getVideoUploadUrl: (body: VideoUploadUrlRequest) =>
    post<VideoUploadUrl>(trainingAdminPaths.videoUploadUrl, body),

  /** A short-lived link to watch a step's uploaded video, in any version. */
  getStepPlaybackUrl: (versionId: number, stepId: number) =>
    get<StepVideoPlayback>(trainingAdminPaths.stepPlayback(versionId, stepId)),

  // ---- Question bank ----
  listTopics: (trainingId: number) => get<Topic[]>(trainingAdminPaths.topics(trainingId)),
  createTopic: (trainingId: number, body: { slug: string; name: string }) =>
    post<Topic>(trainingAdminPaths.topics(trainingId), body),
  updateTopic: (topicId: number, body: { slug: string; name: string }) =>
    put<Topic>(trainingAdminPaths.topic(topicId), body),
  deleteTopic: (topicId: number) => del(trainingAdminPaths.topic(topicId)),
  listQuestions: (trainingId: number, topicId?: number) =>
    get<AdminQuestion[]>(
      topicId === undefined
        ? trainingAdminPaths.questions(trainingId)
        : `${trainingAdminPaths.questions(trainingId)}?topicId=${topicId}`,
    ),
  createQuestion: (trainingId: number, body: QuestionBody) =>
    post<AdminQuestion>(trainingAdminPaths.questions(trainingId), body),
  getQuestion: (questionId: number) => get<AdminQuestion>(trainingAdminPaths.question(questionId)),
  updateQuestion: (questionId: number, body: QuestionBody) =>
    put<AdminQuestion>(trainingAdminPaths.question(questionId), body),
  deleteQuestion: (questionId: number) =>
    del<QuestionDeleteResult>(trainingAdminPaths.question(questionId)),
  restoreQuestion: (questionId: number) =>
    post<AdminQuestion>(trainingAdminPaths.restoreQuestion(questionId)),

  // ---- Publishing ----
  publishCheck: (versionId: number, impact: PublishImpact) =>
    get<PublishCheck>(trainingAdminPaths.publishCheck(versionId, impact)),
  publish: (versionId: number, body: { impact: PublishImpact; reason: string }) =>
    post<PublishResult>(trainingAdminPaths.publish(versionId), body),

  // ---- Corrections, re-scoring and the report ----
  listCorrections: (questionVersionId: number) =>
    get<Correction[]>(trainingAdminPaths.corrections(questionVersionId)),
  addCorrection: (questionVersionId: number, body: CorrectionBody) =>
    post<Correction>(trainingAdminPaths.corrections(questionVersionId), body),
  /** What a correction would do to past attempts, without recording it. */
  previewCorrection: (questionVersionId: number, body: CorrectionBody) =>
    post<CorrectionPreview>(trainingAdminPaths.previewCorrection(questionVersionId), body),
  rescore: (questionVersionId: number) =>
    post<Rescore>(trainingAdminPaths.rescore(questionVersionId)),
  getQuestionReport: (trainingId: number) =>
    get<QuestionReportRow[]>(trainingAdminPaths.questionReport(trainingId)),

  // ---- Audit log ----
  /** Newest first. Empty filters are left out of the URL. */
  listAuditLog: (query: TrainingAuditQuery) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const search = params.toString();
    return get<PaginatedResponse<TrainingAuditEntry>>(
      search ? `${trainingAdminPaths.auditLog}?${search}` : trainingAdminPaths.auditLog,
    );
  },

  // ---- Import ----
  previewImport: (yaml: string) => postYaml<ImportPreview>(trainingAdminPaths.importPreview, yaml),
  importTraining: (yaml: string) => postYaml<ImportResult>(trainingAdminPaths.importFile, yaml),
};
