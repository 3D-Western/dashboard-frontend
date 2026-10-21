const TYPE_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

/**
 * The type of a chosen file. Browsers often leave `type` empty (a .mov on Windows, for one), so
 * then the file name's extension decides. Kept apart from the upload code so the lazily loaded
 * compression code does not pull the API client with it.
 */
export function videoTypeOf(file: { type: string; name?: string }): string {
  if (file.type) return file.type;
  const extension = file.name?.toLowerCase().split('.').pop() ?? '';
  return TYPE_BY_EXTENSION[extension] ?? '';
}
