import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  LLM_PROVIDER: z.enum(["gemini", "groq", "anthropic"], {
    message: "LLM_PROVIDER must be one of: gemini, groq, anthropic",
  }),
  LLM_MODEL: z.string().min(1, "LLM_MODEL is required"),
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration. Server cannot start.\n");
  const errors = parsed.error.flatten().fieldErrors;
  Object.entries(errors).forEach(([field, messages]) => {
    if (messages?.length) console.error(`  ${field}: ${messages.join(", ")}`);
  });
  console.error("\n💡 Check your .env file against .env.example\n");
  process.exit(1);
}

export const env = parsed.data;

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
