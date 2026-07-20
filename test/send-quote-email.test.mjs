import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmail,
  escapeHtml,
  handleFormSubmitted,
  normalizePhotoLinks,
  resolveIdentifiers,
  sendWithRetry
} from "../netlify/functions/send-quote-email.mjs";

const baseData = {
  "form-name": "firstlogis-quote",
  form_source: "main-inline",
  quote_id: "FL-20260720-120000-ABCD",
  name: "홍길동",
  phone: "010-1234-5678",
  from: "서울",
  to: "인천",
  item: "바이크",
  message: "안전 운송 요청"
};

test("HTML escape handles user-controlled markup", () => {
  assert.equal(escapeHtml(`<script>"x" & 'y'</script>`), "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;");
  const email = buildEmail({ ...baseData, name: "<img src=x onerror=alert(1)>" }, baseData.quote_id);
  assert.doesNotMatch(email.html, /<img src=x/);
  assert.match(email.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("photo payload supports zero, one, and three links", () => {
  assert.deepEqual(normalizePhotoLinks(baseData), []);
  assert.equal(buildEmail(baseData, baseData.quote_id).photoCount, 0);

  const one = { ...baseData, "cargo-photo-1": "https://files.example.com/photo-1.jpg" };
  assert.equal(buildEmail(one, baseData.quote_id).photoCount, 1);

  const three = {
    ...one,
    "cargo-photo-2": JSON.stringify({ url: "https://files.example.com/photo-2", content_type: "image/png" }),
    "cargo-photo-3": "https://files.example.com/photo-3.webp"
  };
  assert.deepEqual(normalizePhotoLinks(three), [
    "https://files.example.com/photo-1.jpg",
    "https://files.example.com/photo-2",
    "https://files.example.com/photo-3.webp"
  ]);
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
    return { ok: true, status: 200, headers: new Headers() };
  };

  try {
    const ignored = await handleFormSubmitted({ data: { ...baseData, "form-name": "other-form" } }, { fetchImpl });
    assert.equal(ignored.ignored, true);
    assert.equal(requests.length, 0);

    const sent = await handleFormSubmitted({ data: baseData }, { fetchImpl, waitImpl: async () => {} });
    assert.equal(sent.ok, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].options.headers["Idempotency-Key"], `firstlogis-quote-${baseData.quote_id}`);
    assert.equal(requests[0].options.headers.Authorization, "Bearer test-only-key");
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
    const missing = await handleFormSubmitted({ data: baseData });
    assert.equal(missing.configurationError, true);

    process.env.RESEND_API_KEY = "test-only-key";
    const failed = await handleFormSubmitted({ data: baseData }, {
      fetchImpl: async () => ({ ok: false, status: 500, headers: new Headers() }),
      waitImpl: async () => {}
    });
    assert.deepEqual(failed, { ok: false, status: 500 });
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});
