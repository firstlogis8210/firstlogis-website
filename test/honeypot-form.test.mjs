import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rootHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const bikeHtml = await readFile(new URL("../bike/index.html", import.meta.url), "utf8");
const quoteScript = await readFile(new URL("../js/quote-form.js", import.meta.url), "utf8");

const quoteForms = [...`${rootHtml}\n${bikeHtml}`.matchAll(/<form\b[^>]*data-track-form="[^"]+"[^>]*>[\s\S]*?<\/form>/g)]
  .map(match => match[0]);

function attribute(tag, name) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
}

test("all three quote forms have one matching hardened honeypot", () => {
  assert.equal(quoteForms.length, 3);
  const formSources = [];

  for (const form of quoteForms) {
    const openingTag = /^<form\b[^>]*>/.exec(form)?.[0] ?? "";
    const honeypotName = attribute(openingTag, "netlify-honeypot");
    assert.equal(attribute(openingTag, "data-netlify"), "true");
    assert.equal(attribute(openingTag, "data-honeypot"), honeypotName);

    const honeypotInputs = [...form.matchAll(new RegExp(`<input\\b[^>]*name="${honeypotName}"[^>]*>`, "g"))]
      .map(match => match[0]);
    assert.equal(honeypotInputs.length, 1);

    const input = honeypotInputs[0];
    assert.equal(attribute(input, "type"), "text");
    assert.match(input, /\bvalue=""/);
    assert.equal(attribute(input, "value"), "");
    assert.equal(attribute(input, "autocomplete"), "off");
    assert.equal(attribute(input, "tabindex"), "-1");
    assert.equal(attribute(input, "aria-hidden"), "true");

    assert.match(form, /<input\b[^>]*type="hidden"[^>]*name="form-name"[^>]*value="firstlogis-(?:bike-)?quote"/);
    assert.match(form, /<input\b[^>]*type="hidden"[^>]*name="form_source"[^>]*value="(?:main-inline|main-popup|bike-inline)"/);
    formSources.push(/name="form_source"[^>]*value="([^"]+)"/.exec(form)?.[1]);
  }

  assert.deepEqual(formSources.sort(), ["bike-inline", "main-inline", "main-popup"]);
});

test("AJAX submission replaces the honeypot with exactly one empty FormData value", () => {
  assert.match(quoteScript, /form\.dataset\.honeypot \|\| form\.getAttribute\("netlify-honeypot"\)/);
  assert.match(quoteScript, /honeypotInput\.value = ""/);
  assert.match(quoteScript, /formData\.delete\(honeypotName\);\s*formData\.set\(honeypotName, ""\);/);
  assert.match(quoteScript, /const formData = new FormData\(form\);\s*normalizeHoneypot\(form, formData\);/);
});

test("existing file upload reconstruction and endpoint remain unchanged", () => {
  assert.match(quoteScript, /formData\.delete\("cargo-photos"\)/);
  assert.match(quoteScript, /formData\.set\(`cargo-photo-\$\{index \+ 1\}`, file\)/);
  assert.match(quoteScript, /fetch\("\/", \{ method: "POST", body: formData \}\)/);
  assert.match(quoteScript, /6 \* 1024 \* 1024/);
});

test("browser code contains no API key or personal-data debug logging", () => {
  assert.doesNotMatch(quoteScript, /re_[A-Za-z0-9]{20,}/);
  assert.doesNotMatch(quoteScript, /console\.(?:log|info|debug)\s*\(/);
});
