import type { Plan } from '@/types/pipeline';

export function previewUrlOf(plan: Plan | null | undefined) {
  return plan?.artifacts?.find((artifact) => artifact.kind === 'preview_png')?.url;
}

export function modelUrlOf(plan: Plan | null | undefined) {
  return plan?.artifacts?.find((artifact) => artifact.kind === 'model_glb')?.url;
}

export function highlightsUrlOf(plan: Plan | null | undefined) {
  return plan?.artifacts?.find((artifact) => artifact.kind === 'highlights_json')?.url;
}
