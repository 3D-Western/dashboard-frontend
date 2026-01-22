/**
 * Calculate SHA-256 checksum for a file
 * @param file - The file to calculate checksum for
 * @returns Promise resolving to checksum in format "sha256:hexvalue"
 */
export async function calculateFileChecksum(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hashHex}`;
}
