export function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in LLM response");
  }

  return raw.slice(start, end + 1);
}

export function parseExtractionResponse<T>(raw: string): T {
  const jsonString = extractJson(raw);
  return JSON.parse(jsonString) as T;
}
