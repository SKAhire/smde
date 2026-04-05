import { ILLMProvider } from "../llm.types";
import { EXTRACTION_PROMPT } from "../prompts/extraction.prompt";
import { env } from "../../config/env";

export class GroqProvider implements ILLMProvider {
  private readonly apiUrl = "https://api.groq.com/openai/v1/chat/completions";

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.LLM_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: env.LLM_MODEL,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${fileBuffer.toString("base64")}`,
                  },
                },
                { type: "text", text: EXTRACTION_PROMPT },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Groq API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }
}
