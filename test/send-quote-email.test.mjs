import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handleSubmissionCreated } from "../netlify/functions/submission-created.mjs";
import {
  buildEmail,
  escapeHtml,
  handleQuoteSubmission,
  normalizePhotoLinks,
  resolveFormContext,
  resolveIdentifiers,
  sendWithRetry
} from "../netlify/lib/quote-email.mjs";

const baseData = {
  "form-name": "firstlogis-quote",
  form_source: "main-inline",
  quote_id: "FL-20260720-120000-ABCD",
  name: "홍길동",
  phone: "010-1234-5678",
  origin: "서울",
  destination: "인천",
  item: "바이크",
  message: "안전 운송 요청"
};

async function captureConsole(callback) {
  const original = { info: console.info, warn: console.warn, error: console.error };
  const entries = [];
  for (const level of Object.keys(original)) {
    console[level] = (...args) => entries.push({ level, args });
  }
  try {
    await callback();
  } finally {
    Object.assign(console, original);
  }
  return entries;
}

function legacyRequest(payload) {
  return new Request("https://example.test/.netlify/functions/submission-created", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload })
  });
}

test("form name resolves directly or from all supported source fields", () => {
  assert.equal(resolveFormContext({ form_name: "firstlogis-bike-quote" }, { "form-name": "firstlogis-quote" }).formName, "firstlogis-bike-quote");
  assert.equal(resolveFormContext({}, { "form-name": "firstlogis-quote" }).formName, "firstlogis-quote");
  assert.equal(resolveFormContext({}, { form_name: "firstlogis-bike-quote" }).formName, "firstlogis-bike-quote");
  assert.equal(resolveFormContext({}, { form_source: "main-inline" }).formName, "firstlogis-quote");
  assert.equal(resolveFormContext({}, { "form-source": "main-popup" }).formName, "firstlogis-quote");
  assert.equal(resolveFormContext({}, { formSource: "bike-inline" }).formName, "firstlogis-bike-quote");
  assert.equal(resolveFormContext({}, { form_source: "unknown-source" }).formName, "");
});

test("unknown source is ignored and diagnostic logs exclude personal values", async () => {
  const personalValues = ["홍길동", "010-9999-8888", "서울 강남구", "비밀 요청", "https://private.example/photo.jpg"];
  const data = {
    form_source: "unknown-source",
    name: personalValues[0],
    phone: personalValues[1],
    origin: personalValues[2],
    message: personalValues[3],
    "cargo-photo-1": personalValues[4]
  };
  const entries = await captureConsole(() => handleSubmissionCreated(legacyRequest({ data })));
  const serialized = JSON.stringify(entries);

  assert.match(serialized, /event received/);
  assert.match(serialized, /submission ignored/);
  assert.match(serialized, /dataKeys/);
  for (const value of personalValues) assert.doesNotMatch(serialized, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("source contains no hardcoded Resend API key", async () => {
  const sources = await Promise.all([
    readFile(new URL("../netlify/functions/submission-created.mjs", import.meta.url), "utf8"),
    readFile(new URL("../netlify/lib/quote-email.mjs", import.meta.url), "utf8")
  ]);
  const source = sources.join("\n");
  assert.match(source, /process\.env\.RESEND_API_KEY/);
  assert.doesNotMatch(source, /re_[A-Za-z0-9]{20,}/);
});

test("HTML escape handles user-controlled markup", () => {
  assert.equal(escapeHtml(`<script>"x" & 'y'</script>`), "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;");
  const email = buildEmail({ ...baseData, name: "<img src=x onerror=alert(1)>" }, baseData.quote_id);
  assert.doesNotMatch(email.html, /<img src=x/);
  assert.match(email.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("email shows the no-photo message when no files were uploaded", () => {
  assert.deepEqual(normalizePhotoLinks(baseData), []);
  const email = buildEmail(baseData, baseData.quote_id);
  assert.equal(email.photoCount, 0);
  assert.match(email.html, /<h2[^>]*>첨부 사진<\/h2>/);
  assert.match(email.html, /첨부 사진 없음/);
  assert.doesNotMatch(email.html, /<img\b/);
});

test("email shows one uploaded photo as a link and preview", () => {
  const url = "https://d111111abcdef8.cloudfront.net/submissions/photo-1.jpg";
  const email = buildEmail({ ...baseData, "cargo-photo-1": url }, baseData.quote_id);
  assert.equal(email.photoCount, 1);
  assert.match(email.html, /사진 1 보기/);
  assert.match(email.html, new RegExp(`href="${url}"`));
  assert.match(email.html, new RegExp(`src="${url}"`));
  assert.doesNotMatch(email.html, /사진 2 보기/);
});

test("email supports all three project photo fields and Netlify file value shapes", () => {
  const three = {
    ...baseData,
    "cargo-photo-1": "https://files.example.com/photo-1.jpg",
    "cargo-photo-2": { url: "https://files.example.com/photo-2", type: "image/png" },
    "cargo-photo-3": [{ secure_url: "https://files.example.com/photo-3.webp", contentType: "image/webp" }]
  };
  assert.deepEqual(normalizePhotoLinks(three), [
    "https://files.example.com/photo-1.jpg",
    "https://files.example.com/photo-2",
    "https://files.example.com/photo-3.webp"
  ]);
  const email = buildEmail(three, baseData.quote_id);
  assert.equal(email.photoCount, 3);
  for (const index of [1, 2, 3]) assert.match(email.html, new RegExp(`사진 ${index} 보기`));
});

test("photo URLs are safely escaped in HTML links and previews", () => {
  const data = {
    ...baseData,
    "cargo-photo-1": "https://files.example.com/photo.jpg?token=one&view=two"
  };
  const email = buildEmail(data, baseData.quote_id);
  assert.match(email.html, /href="https:\/\/files\.example\.com\/photo\.jpg\?token=one&amp;view=two"/);
  assert.match(email.html, /src="https:\/\/files\.example\.com\/photo\.jpg\?token=one&amp;view=two"/);
  assert.doesNotMatch(email.html, /token=one&view=two/);
});

test("non-image and unsafe photo URLs are rejected", () => {
  const data = {
    "cargo-photo-1": "http://files.example.com/photo.jpg",
    "cargo-photo-2": "https://files.example.com/document.pdf",
    "cargo-photo-3": JSON.stringify({ url: "https://files.example.com/file", content_type: "application/pdf" })
  };
  assert.deepEqual(normalizePhotoLinks(data), []);
});

test("fallback quote and idempotency identifiers are deterministic", async () => {
  const now = new Date("2026-07-20T03:00:00.000Z");
  const first = await resolveIdentifiers({}, { ...baseData, quote_id: "" }, now);
  const second = await resolveIdentifiers({}, { ...baseData, quote_id: "" }, now);
  assert.equal(first.quoteId, second.quoteId);
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.match(first.quoteId, /^Q20260720-[A-F0-9]{8}$/);

  const supplied = await resolveIdentifiers({}, baseData, now);
  assert.match(supplied.idempotencyKey, /FL-20260720-120000-ABCD$/);

  const submissionFallback = await resolveIdentifiers(
    { id: "submission-stable-123" },
    { ...baseData, quote_id: "" },
    now
  );
  assert.equal(submissionFallback.idempotencyKey, "firstlogis-quote-submission-stable-123");

  const unsafe = await resolveIdentifiers({}, { ...baseData, quote_id: "bad\nvalue" }, now);
  assert.match(unsafe.quoteId, /^Q20260720-[A-F0-9]{8}$/);
  assert.doesNotMatch(unsafe.idempotencyKey, /bad/);
});

test("only allowed forms send and Idempotency-Key is forwarded", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-only-key";
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "email_test123" }) };
  };

  try {
    const ignored = await handleQuoteSubmission({ data: { ...baseData, "form-name": "other-form" } }, { fetchImpl });
    assert.equal(ignored.ignored, true);
    assert.equal(requests.length, 0);

    const sent = await handleQuoteSubmission({ form_name: "firstlogis-quote", id: "submission-1", data: baseData }, { fetchImpl, waitImpl: async () => {} });
    assert.equal(sent.ok, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].options.headers["Idempotency-Key"], `firstlogis-quote-${baseData.quote_id}`);
    assert.equal(requests[0].options.headers.Authorization, "Bearer test-only-key");

    const withoutFormName = { ...baseData };
    delete withoutFormName["form-name"];
    for (const formSource of ["main-inline", "main-popup", "bike-inline"]) {
      const fallbackSent = await handleQuoteSubmission(
        { data: { ...withoutFormName, form_source: formSource } },
        { fetchImpl, waitImpl: async () => {} }
      );
      assert.equal(fallbackSent.ok, true);
    }
    assert.equal(requests.length, 4);

    const unknownSource = await handleQuoteSubmission(
      { data: { ...withoutFormName, form_source: "unknown-source" } },
      { fetchImpl }
    );
    assert.equal(unknownSource.ignored, true);
    assert.equal(requests.length, 4);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});

test("429 and 5xx responses retry at most three attempts", async () => {
  let attempts = 0;
  const result = await sendWithRetry({
    apiKey: "test-only-key",
    email: { subject: "s", html: "h", text: "t" },
    idempotencyKey: "stable-key",
    fetchImpl: async () => {
      attempts += 1;
      return attempts < 3
        ? { ok: false, status: attempts === 1 ? 429 : 503, headers: new Headers() }
        : { ok: true, status: 200, headers: new Headers() };
    },
    waitImpl: async () => {}
  });
  assert.equal(result.attempts, 3);
  assert.equal(attempts, 3);
});

test("missing API key and Resend failure are contained", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const missing = await handleQuoteSubmission({ data: baseData });
    assert.equal(missing.configurationError, true);

    process.env.RESEND_API_KEY = "test-only-key";
    const failed = await handleQuoteSubmission({ data: baseData }, {
      fetchImpl: async () => ({ ok: false, status: 500, headers: new Headers() }),
      waitImpl: async () => {}
    });
    assert.deepEqual(failed, { ok: false, status: 500 });
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});

test("successful delivery logs contain no personal values", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-only-key";
  try {
    const entries = await captureConsole(() => handleQuoteSubmission({ data: baseData }, {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: "email_safe123" })
      }),
      waitImpl: async () => {}
    }));
    const serialized = JSON.stringify(entries);
    for (const value of [baseData.name, baseData.phone, baseData.origin, baseData.destination, baseData.item, baseData.message]) {
      assert.doesNotMatch(serialized, new RegExp(value));
    }
    assert.match(serialized, /email_safe123/);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});

test("legacy request payload is parsed and invalid requests exit safely", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-only-key";
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ id: "email_legacy123" }) };
  };

  try {
    const response = await handleSubmissionCreated(
      legacyRequest({ form_name: "firstlogis-quote", id: "submission-legacy", created_at: "2026-07-20T03:00:00Z", data: baseData }),
      { fetchImpl, waitImpl: async () => {} }
    );
    assert.equal(response.status, 204);
    assert.equal(calls, 1);

    const invalid = await handleSubmissionCreated(new Request("https://example.test", { method: "POST", body: "not-json" }));
    const missing = await handleSubmissionCreated(new Request("https://example.test", { method: "POST", body: "{}" }));
    assert.equal(invalid.status, 204);
    assert.equal(missing.status, 204);
    assert.equal(calls, 1);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});

test("only the legacy filename event is deployable", async () => {
  const legacySource = await readFile(new URL("../netlify/functions/submission-created.mjs", import.meta.url), "utf8");
  assert.match(legacySource, /export default async function submissionCreated/);
  assert.doesNotMatch(legacySource, /formSubmitted/);
  await assert.rejects(readFile(new URL("../netlify/functions/send-quote-email.mjs", import.meta.url), "utf8"));
});
