import { ILLMProvider } from "../llm.types";
import { EXTRACTION_PROMPT } from "../prompts/extraction.prompt";
import { env } from "../../config/env";

export class GeminiProvider implements ILLMProvider {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${env.LLM_MODEL}:generateContent?key=${env.LLM_API_KEY}`;
  }

  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    _fileName: string,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: fileBuffer.toString("base64"),
                  },
                },
                { text: EXTRACTION_PROMPT },
              ],
            },
          ],
          generationConfig: { temperature: 0 },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        candidates: Array<{
          content: { parts: Array<{ text: string }> };
        }>;
      };

      return data.candidates[0].content.parts[0].text;
    } finally {
      clearTimeout(timeout);
    }
  }
}
