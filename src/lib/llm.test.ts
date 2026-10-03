import { describe, expect, it } from "vitest";
import { createI18n } from "./i18n";
import { blockedReason, llmErrorText, parseLLMReason, transientLLMError } from "./llm";
import { thinkingLevels } from "../pages/admin/Agent";

describe("LLM errors (FTR.HMR.CMN-0004 design §4)", () => {
  it("parses the reason of a stopped run", () => {
    expect(parseLLMReason("[llm:insufficient_balance|DeepSeek] 402: balance")).toEqual({ errorClass: "insufficient_balance", connection: "DeepSeek" });
    expect(parseLLMReason("[llm:rate_limit|] 429")).toEqual({ errorClass: "rate_limit", connection: "" });
    expect(parseLLMReason("git push failed")).toBeNull();
    expect(parseLLMReason(null)).toBeNull();
  });

  it("shows the text of the class in the user's language", () => {
    const ru = createI18n("ru").t;
    expect(llmErrorText(ru, "insufficient_balance", "DeepSeek")).toBe("Закончился баланс подключения «DeepSeek». Сообщите администратору");
    expect(blockedReason(ru, "[llm:context_overflow|DeepSeek] too long")).toBe("Слишком большой контекст");
    expect(blockedReason(ru, "plain reason")).toBe("plain reason");
    const en = createI18n("en").t;
    expect(llmErrorText(en, "something_new")).toBe("The model did not accept the request.");
  });

  it("temporary errors are amber", () => {
    expect(transientLLMError("rate_limit")).toBe(true);
    expect(transientLLMError("unavailable")).toBe(true);
    expect(transientLLMError("auth")).toBe(false);
  });
});

describe("reasoning levels", () => {
  const base = { id: "m", contextWindow: 1, maxTokens: 1, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
  it("offers off and the mapped levels only", () => {
    expect(thinkingLevels({ ...base, reasoning: true, thinkingLevelMap: { minimal: null, low: null, medium: null, high: "high", xhigh: "max" } }))
      .toEqual(["off", "high", "xhigh"]);
    expect(thinkingLevels({ ...base, reasoning: false })).toEqual(["off"]);
    expect(thinkingLevels(undefined)).toEqual(["off"]);
  });
});
