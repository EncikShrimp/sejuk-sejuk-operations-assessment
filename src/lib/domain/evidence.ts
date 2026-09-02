export const MAX_EVIDENCE_FILES = 6;

export function evidenceFileLimitMessage(fileCount: number): string | null {
  return fileCount > MAX_EVIDENCE_FILES
    ? `Choose at most ${MAX_EVIDENCE_FILES} evidence files before marking this job done.`
    : null;
}
