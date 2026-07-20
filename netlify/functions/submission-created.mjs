import { handleQuoteSubmission } from "../lib/quote-email.mjs";

function noContent() {
  return new Response(null, { status: 204 });
}

export async function handleSubmissionCreated(request, dependencies = {}) {
  console.info("[quote-email] submission event received", {
    eventType: "submission-created",
    hasRequest: Boolean(request)
  });

  let body;
  try {
    body = await request.json();
  } catch {
    console.info("[quote-email] submission ignored", {
      reason: "invalid-json",
      formName: "unknown",
      dataKeys: []
    });
    return noContent();
  }

  const payload = body?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    console.info("[quote-email] submission ignored", {
      reason: "missing-payload",
      formName: "unknown",
      dataKeys: []
    });
    return noContent();
  }

  await handleQuoteSubmission(payload, dependencies);
  return noContent();
}

export default async function submissionCreated(request) {
  return handleSubmissionCreated(request);
}
