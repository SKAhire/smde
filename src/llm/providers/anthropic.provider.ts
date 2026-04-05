import Anthropic from "@anthropic-ai/sdk";
import { ILLMProvider } from "../llm.types";
import { EXTRACTION_PROMPT } from "../prompts/extraction.prompt";
import { env } from "../../config/env";

export class AnthropicProvider implements ILLMProvider {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.LLM_API_KEY,
      timeout: env.LLM_TIMEOUT_MS,
    });
  }

  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    _fileName: string,
  ): Promise<string> {
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ] as const;
    type AnthropicImageMime = (typeof validMimeTypes)[number];

    const imageMime = validMimeTypes.includes(mimeType as AnthropicImageMime)
      ? (mimeType as AnthropicImageMime)
      : "image/jpeg";

    const response = await this.client.messages.create({
      model: env.LLM_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMime,
                data: fileBuffer.toString("base64"),
              },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }

    return block.text;
  }
}
