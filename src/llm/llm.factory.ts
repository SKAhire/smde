import { ILLMProvider } from "./llm.types";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { env } from "../config/env";

export function createLLMProvider(): ILLMProvider {
  switch (env.LLM_PROVIDER) {
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new GroqProvider();
    case "anthropic":
      return new AnthropicProvider();
  }
}
