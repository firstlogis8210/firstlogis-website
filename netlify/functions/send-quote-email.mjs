import { createHash } from "node:crypto";

const ALLOWED_FORMS = new Set(["firstlogis-quote", "firstlogis-bike-quote"]);
const FORM_SOURCE_LABELS = {
  "main-inline": "메인 홈페이지",
  "main-popup": "메인 팝업",
  "bike-inline": "바이크 랜딩페이지"
};
const FORM_SOURCE_TO_FORM = {
  "main-inline": "firstlogis-quote",
  "main-popup": "firstlogis-quote",
  "bike-inline": "firstlogis-bike-quote"
};
const PHOTO_FIELDS = ["cargo-photo-1", "cargo-photo-2", "cargo-photo-3"];
const IMAGE_EXTENSIONS = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_EMAIL = "퍼스트물류 견적접수 <quote@firstlogis.co.kr>";
const TO_EMAIL = "firstlogisqnote@gmail.com";
const MAX_ATTEMPTS = 3;
const QUOTE_ID_PATTERN = /^FL-\d{8}-\d{6}-[A-Z0-9]{4}$/;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanText(value, fallback = "미입력") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function stableEntries(data) {
  return Object.keys(data || {})
    .sort()
    .map(key => [key, String(data[key] ?? "")]);
}

async function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function resolveIdentifiers(event, data, now = new Date()) {
  const quoteIdCandidate = String(data.quote_id ?? "").trim().toUpperCase();
  const suppliedQuoteId = QUOTE_ID_PATTERN.test(quoteIdCandidate) ? quoteIdCandidate : "";
  const submissionId = String(
    event?.submission?.id ?? event?.submissionId ?? event?.id ?? ""
  ).trim();
  const fingerprint = await sha256(JSON.stringify(stableEntries(data)));
  const dateParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  const date = `${dateParts.year}${dateParts.month}${dateParts.day}`;
  const quoteId = suppliedQuoteId || `Q${date}-${fingerprint.slice(0, 8).toUpperCase()}`;
  const idempotencySource = suppliedQuoteId || submissionId || fingerprint;

  return {
    quoteId,
    idempotencyKey: `firstlogis-quote-${idempotencySource}`.slice(0, 256)
  };
}

function collectUrlCandidates(value) {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return [{ url: parsed, mime: "" }];
    if (Array.isArray(parsed)) return parsed.flatMap(item => collectUrlCandidates(JSON.stringify(item)));
    if (parsed && typeof parsed === "object") {
      return [parsed.url, parsed.secure_url, parsed.href]
        .filter(item => typeof item === "string")
        .map(url => ({ url, mime: String(parsed.content_type ?? parsed.contentType ?? parsed.mime_type ?? parsed.mimeType ?? "") }));
    }
  } catch {
    // Netlify normally supplies the uploaded-file URL as a plain string.
  }

  return trimmed.split(/[\s,]+/).filter(Boolean).map(url => ({ url, mime: "" }));
}

function normalizePhotoUrl(candidate) {
  try {
    const url = new URL(candidate.url);
    if (url.protocol !== "https:" || url.href.length > 2048) return null;
    const pathname = decodeURIComponent(url.pathname);
    const hasImageMime = /^image\/[a-z0-9.+-]+$/i.test(candidate.mime);
    if (!hasImageMime && !IMAGE_EXTENSIONS.test(pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizePhotoLinks(data) {
  const links = [];
  for (const field of PHOTO_FIELDS) {
    const candidates = collectUrlCandidates(data?.[field]);
    const url = candidates.map(normalizePhotoUrl).find(Boolean);
    if (url && !links.includes(url)) links.push(url);
  }
  return links.slice(0, 3);
}

function rejectedPhotoFields(data) {
  return PHOTO_FIELDS.filter(field => String(data?.[field] ?? "").trim() && !normalizePhotoLinks({ [field]: data[field] }).length);
}

function formatReceivedAt(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "medium"
  }).format(date);
}

function getFormSource(data) {
  return cleanText(data?.form_source ?? data?.["form-source"] ?? data?.formSource, "");
}

export function resolveFormContext(data) {
  const directFormName = cleanText(data?.["form-name"] ?? data?.form_name ?? data?.formName, "");
  const formSource = getFormSource(data);
  const formName = directFormName || FORM_SOURCE_TO_FORM[formSource] || "";

  return {
    formName,
    formSource,
    logFormName: ALLOWED_FORMS.has(formName) ? formName : "unknown",
    logFormSource: Object.hasOwn(FORM_SOURCE_TO_FORM, formSource)
      ? formSource
      : formSource ? "unknown" : "missing"
  };
}

export function buildEmail(data, quoteId, receivedAt = new Date()) {
  const source = FORM_SOURCE_LABELS[getFormSource(data)] || "구분되지 않은 견적 폼";
  const photos = normalizePhotoLinks(data);
  const values = {
    quoteId,
    receivedAt: formatReceivedAt(receivedAt),
    source,
    name: cleanText(data.name),
    phone: cleanText(data.phone),
    from: cleanText(data.from),
    to: cleanText(data.to),
    item: cleanText(data.item),
    message: cleanText(data.message, "요청사항 없음")
  };
  const rows = [
    ["견적번호", values.quoteId],
    ["접수시간", values.receivedAt],
    ["폼 구분", values.source],
    ["고객명", values.name],
    ["연락처", values.phone],
    ["출발지", values.from],
    ["도착지", values.to],
    ["운송 품목 또는 차량정보", values.item],
    ["요청사항", values.message]
  ];
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <th style="padding:10px;border:1px solid #d0d5dd;background:#f2f4f7;text-align:left;vertical-align:top">${escapeHtml(label)}</th>
      <td style="padding:10px;border:1px solid #d0d5dd;white-space:pre-wrap">${escapeHtml(value)}</td>
    </tr>`).join("");
  const htmlPhotos = photos.length
    ? photos.map((url, index) => `<li><a href="${escapeHtml(url)}" rel="noopener noreferrer">사진 ${index + 1} 확인</a></li>`).join("")
    : "<li>첨부 사진 없음</li>";
  const textPhotos = photos.length
    ? photos.map((url, index) => `사진 ${index + 1}: ${url}`).join("\n")
    : "첨부 사진 없음";

  return {
    subject: `[퍼스트물류] 신규견적 #${quoteId}`,
    html: `<!doctype html><html lang="ko"><body style="font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#101828">
      <h1 style="font-size:22px">퍼스트물류 신규 견적문의</h1>
      <table style="border-collapse:collapse;width:100%;max-width:760px"><tbody>${htmlRows}</tbody></table>
      <h2 style="font-size:18px;margin-top:24px">사진</h2><ul>${htmlPhotos}</ul>
      <p style="margin-top:24px;color:#475467">원본 접수 내용과 업로드 파일은 Netlify Forms 대시보드에서 확인할 수 있습니다.</p>
    </body></html>`,
    text: [
      "퍼스트물류 신규 견적문의",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      textPhotos,
      "",
      "원본 접수 내용과 업로드 파일은 Netlify Forms 대시보드에서 확인할 수 있습니다."
    ].join("\n"),
    photoCount: photos.length
  };
}

function retryableStatus(status) {
  return status === 429 || status >= 500;
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function sendWithRetry({ apiKey, email, idempotencyKey, fetchImpl = fetch, waitImpl = wait }) {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [TO_EMAIL],
          subject: email.subject,
          html: email.html,
          text: email.text
        })
      });
    } catch {
      lastStatus = 0;
      if (attempt < MAX_ATTEMPTS) {
        await waitImpl(400 * 2 ** (attempt - 1));
        continue;
      }
      const error = new Error("Resend network request failed");
      error.kind = "network";
      error.status = 0;
      throw error;
    }

    lastStatus = response.status;
    if (response.ok) {
      let messageId = "";
      try {
        const responseBody = await response.json();
        const candidate = String(responseBody?.id ?? "");
        if (/^[A-Za-z0-9_-]{1,128}$/.test(candidate)) messageId = candidate;
      } catch {
        // A successful response without JSON is still a successful delivery request.
      }
      return { ok: true, status: response.status, attempts: attempt, messageId };
    }
    if (!retryableStatus(response.status) || attempt === MAX_ATTEMPTS) break;

    const retryAfter = Number(response.headers?.get?.("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter >= 0
      ? Math.min(retryAfter * 1000, 2000)
      : 400 * 2 ** (attempt - 1);
    await waitImpl(delay);
  }

  const error = new Error(`Resend HTTP ${lastStatus}`);
  error.kind = "http";
  error.status = lastStatus;
  throw error;
}

export async function handleFormSubmitted(event, dependencies = {}) {
  const data = event?.data && typeof event.data === "object" ? event.data : {};
  const dataKeys = Object.keys(data).sort();
  const { formName, logFormName, logFormSource } = resolveFormContext(data);
  if (!ALLOWED_FORMS.has(formName)) {
    console.info("[quote-email] event ignored", {
      formName: logFormName,
      formSource: logFormSource,
      dataKeys
    });
    return { ignored: true };
  }

  const { quoteId, idempotencyKey } = await resolveIdentifiers(event, data);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[quote-email] configuration missing", {
      quoteId,
      formName,
      code: "MISSING_RESEND_API_KEY"
    });
    return { ok: false, configurationError: true };
  }

  try {
    const email = buildEmail(data, quoteId);
    const rejectedFields = rejectedPhotoFields(data);
    if (rejectedFields.length) {
      console.warn("[quote-email] photo payload rejected", { quoteId, formName, fields: rejectedFields });
    }
    console.info("[quote-email] resend request started", {
      quoteId,
      formName,
      photoCount: email.photoCount
    });
    const result = await sendWithRetry({
      apiKey,
      email,
      idempotencyKey,
      fetchImpl: dependencies.fetchImpl,
      waitImpl: dependencies.waitImpl
    });
    console.info("[quote-email] resend request succeeded", {
      quoteId,
      formName,
      status: result.status,
      ...(result.messageId ? { messageId: result.messageId } : {})
    });
    return result;
  } catch (error) {
    const status = Number(error?.status ?? /HTTP (\d+)/.exec(error?.message || "")?.[1] ?? 0);
    const errorType = ["network", "http"].includes(error?.kind) ? error.kind : "unknown";
    console.error("[quote-email] resend request failed", { quoteId, formName, status, errorType });
    return { ok: false, status };
  }
}

export default {
  async formSubmitted(event) {
    console.info("[quote-email] event received", {
      eventType: "formSubmitted",
      hasData: Boolean(event?.data),
      dataKeys: Object.keys(event?.data ?? {}).sort()
    });
    await handleFormSubmitted(event);
  }
};
