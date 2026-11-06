// What a 3D-print upload may be (P-53, P-171): STL, 3MF, or STEP/STP (CAD, converted to a mesh by the
// slicing pipeline). The backend accepts the same types for a print and refuses anything over its
// size limit after the upload, so the picker and this check say so before a long upload starts.

import { FILE_CONSTRAINTS } from '@/types/file';

/** The file types the new-print screen takes. */
export const PRINT_MODEL_EXTENSIONS = ['.stl', '.3mf', '.step', '.stp'] as const;

/** For the dropzone / file input: browsers report STEP as nothing, `application/step` or `model/step`, so the extension decides. */
export const PRINT_MODEL_ACCEPT: Record<string, string[]> = {
  'model/stl': ['.stl'],
  'application/sla': ['.stl'],
  'model/3mf': ['.3mf'],
  'application/vnd.ms-package.3dmanufacturing-3dmodel+xml': ['.3mf'],
  'model/step': ['.step', '.stp'],
  'application/step': ['.step', '.stp'],
  'application/octet-stream': [...PRINT_MODEL_EXTENSIONS],
};

/** The same limit as for every other model (the backend's `upload.max-file-size-mb`, 50 MB). */
export const MAX_MODEL_BYTES = FILE_CONSTRAINTS.MAX_SIZE;

/** Value for an `<input type="file" accept>`: ".stl,.3mf,.step,.stp". */
export const PRINT_MODEL_INPUT_ACCEPT = PRINT_MODEL_EXTENSIONS.join(',');

export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
};

export const isStepFile = (name: string) => ['.step', '.stp'].includes(extensionOf(name));

const TYPES_TEXT = 'STL, STEP or 3MF';

/** Why a file cannot be the model of a print, in words for the student; null when it can. */
export function validateModelFile(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name);
  if (!(PRINT_MODEL_EXTENSIONS as readonly string[]).includes(ext)) {
    return ext
      ? `A ${ext} file can't be printed from here. Use ${TYPES_TEXT}.`
      : `That file has no type. Use ${TYPES_TEXT}.`;
  }
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > MAX_MODEL_BYTES) {
    return `That file is ${Math.ceil(file.size / (1024 * 1024))} MB; the limit is ${MAX_MODEL_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}

/** The message for a file the dropzone itself refused (wrong type, more than one file). */
export const REJECTED_FILE_MESSAGE = `That file can't be used. Choose one ${TYPES_TEXT} file.`;
