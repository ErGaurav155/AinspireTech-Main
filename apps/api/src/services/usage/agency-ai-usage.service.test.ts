import assert from "node:assert/strict";
import test from "node:test";
import { aiTokenServiceFromSource } from "./agency-ai-usage.service";

test("agency AI usage sources are attributed to the correct shared service", () => {
  assert.equal(aiTokenServiceFromSource("website_chatbot"), "website");
  assert.equal(aiTokenServiceFromSource("web_ai_reply"), "website");
  assert.equal(aiTokenServiceFromSource("instagram_ai_reply"), "instagram");
  assert.equal(aiTokenServiceFromSource("whatsapp_ai_reply"), "whatsapp");
  assert.equal(aiTokenServiceFromSource("future_ai_service"), "other");
});
