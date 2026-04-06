import {
  extractJson,
  parseExtractionResponse,
} from "../../src/utils/json.util";

describe("extractJson", () => {
  it("returns JSON from a clean response", () => {
    const input = '{"key": "value"}';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("strips markdown code fences", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("strips preamble text before JSON", () => {
    const input = 'Here is the result:\n{"key": "value"}';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("strips trailing text after JSON", () => {
    const input = '{"key": "value"}\nHope that helps!';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("handles nested objects correctly", () => {
    const input = '{"outer": {"inner": "value"}}';
    expect(extractJson(input)).toBe('{"outer": {"inner": "value"}}');
  });

  it("throws when no JSON object found", () => {
    expect(() => extractJson("no json here")).toThrow(
      "No JSON object found in LLM response",
    );
  });

  it("throws on empty string", () => {
    expect(() => extractJson("")).toThrow(
      "No JSON object found in LLM response",
    );
  });

  it("throws when only opening brace present", () => {
    expect(() => extractJson("{no closing brace")).toThrow(
      "No JSON object found in LLM response",
    );
  });
});

describe("parseExtractionResponse", () => {
  it("parses a valid JSON string", () => {
    const input = '{"name": "test", "value": 42}';
    const result = parseExtractionResponse<{ name: string; value: number }>(
      input,
    );
    expect(result.name).toBe("test");
    expect(result.value).toBe(42);
  });

  it("parses JSON wrapped in markdown fences", () => {
    const input = '```json\n{"name": "test"}\n```';
    const result = parseExtractionResponse<{ name: string }>(input);
    expect(result.name).toBe("test");
  });

  it("throws on malformed JSON after extraction", () => {
    const input = "{this is not valid json}";
    expect(() => parseExtractionResponse(input)).toThrow();
  });
});
