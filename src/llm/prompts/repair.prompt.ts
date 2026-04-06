export const REPAIR_PROMPT = (rawResponse: string): string =>
  `
The following text was returned by an AI model but contains invalid or malformed JSON.
Extract and return ONLY a valid JSON object from it.
No markdown. No code fences. No explanation. Just the raw JSON object.

Raw response:
${rawResponse}
`.trim();
