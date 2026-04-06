import { ILLMProvider } from "./llm.types";
import { LLMExtractionResult } from "./llm.types";
import { parseExtractionResponse, extractJson } from "../utils/json.util";
import { REPAIR_PROMPT } from "./prompts/repair.prompt";
import { FOCUSED_EXTRACTION_PROMPT } from "./prompts/focused.prompt";

export interface PipelineResult {
  parsed: LLMExtractionResult;
  rawResponse: string;
  wasRepaired: boolean;
  wasRetried: boolean;
}

export interface PipelineFailure {
  rawResponse: string;
  error: string;
  retryable: boolean;
}

export type PipelineOutcome =
  | { success: true; data: PipelineResult }
  | { success: false; data: PipelineFailure };

export class LLMPipeline {
  constructor(private readonly provider: ILLMProvider) {}

  async run(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<PipelineOutcome> {
    let rawResponse = "";
    let wasRepaired = false;
    let wasRetried = false;

    try {
      rawResponse = await this.provider.extract(fileBuffer, mimeType, fileName);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.includes("abort");
      return {
        success: false,
        data: {
          rawResponse,
          error: isTimeout ? "LLM request timed out" : String(err),
          retryable: true,
        },
      };
    }

    // Attempt initial parse
    let parsed = this.tryParse(rawResponse);

    // LOW confidence — retry once with focused prompt
    if (parsed && parsed.detection.confidence === "LOW") {
      wasRetried = true;
      let retryRaw = "";

      try {
        const focusedPrompt = FOCUSED_EXTRACTION_PROMPT(fileName, mimeType);
        retryRaw = await this.provider.extract(
          fileBuffer,
          mimeType,
          focusedPrompt,
        );
        const retryParsed = this.tryParse(retryRaw);

        // Only use retry result if it has higher confidence
        if (retryParsed && retryParsed.detection.confidence !== "LOW") {
          parsed = retryParsed;
          rawResponse = retryRaw;
        }
      } catch {
        // Retry failed — continue with original LOW confidence result
      }
    }

    // If initial parse succeeded (possibly after retry)
    if (parsed) {
      return {
        success: true,
        data: { parsed, rawResponse, wasRepaired, wasRetried },
      };
    }

    // Parse failed — attempt JSON repair
    wasRepaired = true;
    let repairedRaw = "";

    try {
      const repairPrompt = REPAIR_PROMPT(rawResponse);
      repairedRaw = await this.provider.extract(
        Buffer.from(repairPrompt),
        "text/plain",
        "repair",
      );
      const repaired =
        parseExtractionResponse<LLMExtractionResult>(repairedRaw);
      return {
        success: true,
        data: {
          parsed: repaired,
          rawResponse: repairedRaw,
          wasRepaired,
          wasRetried,
        },
      };
    } catch {
      return {
        success: false,
        data: {
          rawResponse,
          error: "JSON parse failed after repair attempt",
          retryable: false,
        },
      };
    }
  }

  private tryParse(raw: string): LLMExtractionResult | null {
    try {
      return parseExtractionResponse<LLMExtractionResult>(raw);
    } catch {
      return null;
    }
  }
}
