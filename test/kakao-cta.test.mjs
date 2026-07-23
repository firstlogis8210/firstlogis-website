import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rootHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const bikeHtml = await readFile(new URL("../bike/index.html", import.meta.url), "utf8");
const appScript = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const configScript = await readFile(new URL("../js/config.js", import.meta.url), "utf8");
const analyticsScript = await readFile(new URL("../js/analytics.js", import.meta.url), "utf8");
const pages = [rootHtml, bikeHtml];
const guide = "바이크 사진과 출발지·도착지를 카카오톡으로 보내주시면 빠르게 견적을 안내해드립니다.";

test("main and bike pages contain no quote forms or modal UI", () => {
  for (const html of pages) {
    assert.doesNotMatch(html, /<form\b/i);
    assert.doesNotMatch(html, /data-netlify|netlify-honeypot|data-track-form/i);
    assert.doesNotMatch(html, /quote-form\.js|thanks\.html/i);
    assert.doesNotMatch(html, /type=["']submit["']/i);
  }
  assert.doesNotMatch(rootHtml, /quoteModal|open-quote|data-close-modal/);
  assert.doesNotMatch(appScript, /quoteModal|openModal|closeModal|open-quote/);
});

test("phone buttons remain available and tracked on both pages", () => {
  for (const html of pages) {
    assert.match(html, /href="tel:16618210"/);
    assert.match(html, /data-track-event="phone_click"/);
  }
});

test("Kakao quote buttons use the business channel and retain click tracking", () => {
  assert.match(configScript, /kakaoUrl:\s*"https:\/\/pf\.kakao\.com\/_xdTxhfX"/);
  assert.match(appScript, /\[data-kakao-link\]/);
  assert.match(rootHtml, /data-kakao-link/);
  assert.match(rootHtml, /data-track-event="kakao_click"/);
  assert.match(bikeHtml, /href="https:\/\/pf\.kakao\.com\/_xdTxhfX"/);
  assert.match(bikeHtml, /data-track-event="kakao_click"/);
  assert.match(analyticsScript, /closest\("\[data-track-event\]"\)/);
});

test("both pages show the requested Kakao guidance and CTA text", () => {
  for (const html of pages) {
    assert.match(html, new RegExp(guide));
    assert.match(html, /카카오톡으로 견적받기|카카오톡 상담/);
  }
});
