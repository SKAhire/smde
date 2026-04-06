export const FOCUSED_EXTRACTION_PROMPT = (
  fileName: string,
  mimeType: string,
): string =>
  `
You are an expert maritime document analyst.

The previous analysis of this document returned LOW confidence. Re-examine it carefully.

File name: ${fileName}
File type: ${mimeType}

Use these hints to identify the document type more precisely. Apply the same taxonomy and return the same JSON structure as before.

Return ONLY a valid JSON object. No markdown. No code fences. No preamble.
`.trim();
