// The built pages keep the 1ms.dog tool contract (1ms-shell docs/tool-contract.md), render every row up front, and
// every string the page uses exists in every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LANGS, storyHtml } from "../scripts/build.mjs";
import { SNIFFERS, BLANKS, CHECKS, PROTO } from "../src/sniffers.mjs";

const read = f => readFile(new URL("../" + f, import.meta.url), "utf8");
const page = slug => read(`public/${slug ? slug + "/" : ""}index.html`);
const all = (s, re) => [...s.matchAll(re)].map(m => m[1]);

test("every language page keeps the shell contract", async () => {
  for (const [lang, slug] of LANGS) {
    const h = await page(slug);
    assert.match(h, new RegExp(`<html lang="${lang}"`), lang);
    assert.match(h, /<head>\r?\n<meta charset="utf-8">\r?\n<script>/, lang + ": charset first, then the pre-paint script");
    assert.match(h, /id="helpBtn"[^>]*aria-haspopup="dialog"/, lang + ": help button");
    assert.match(h, /<div class="scrim" id="help" hidden>/, lang + ": help dialog hidden by default");
    assert.match(h, /class="logo-light" src="\/assets\/logo-light.svg" width="90" height="36"/);
    assert.ok(!/\{\{\w+\}\}/.test(h), lang + ": unfilled placeholder");
    assert.ok(h.length < 60000, lang + ": page is " + h.length + " bytes");
    assert.equal((h.match(/<script>/g) || []).length, 1, lang + ": the only inline script is the pre-paint one");
  }
});

test("every sniffer, blank and check has its place before any reading", async () => {
  for (const [lang, slug] of LANGS) {
    const h = await page(slug);
    assert.equal((h.match(/<div class="pr wait" data-s="/g) || []).length, SNIFFERS.length, lang);
    assert.equal((h.match(/<span class="bl wait" data-b="/g) || []).length, Object.keys(BLANKS).length, lang);
    assert.equal((h.match(/<li class="ckr" data-c="/g) || []).length, CHECKS.length + PROTO.length, lang);   // the checks, then the protocols
  }
  assert.equal(new Set(SNIFFERS.map(s => s.id)).size, SNIFFERS.length, "sniffer ids are unique");
  for (const ids of Object.values(BLANKS)) for (const id of ids) assert.ok(SNIFFERS.some(s => s.id === id), "blank source " + id);
  assert.throws(() => storyHtml("{nat} {nat}", "x"));
});

test("every key the page uses exists in every language, with the same placeholders", async () => {
  const [app, page] = await Promise.all(["src/app.js", "src/page.html"].map(read));
  const en = (await import("../src/i18n/en.mjs")).default;
  const keys = new Set([
    ...all(app, /\bt\("(\w+)"/g).filter(k => !k.endsWith("_")),
    ...all(app, /\bna\("\w+", "(\w+)"\)/g),
    ...all(page, /data-i="(\w+)"/g), ...all(page, /\{\{a:(\w+)\}\}/g),
    ...SNIFFERS.map(s => "s_" + s.id), ...CHECKS.map(c => "c_" + c),
    ...["net", "hdr", "loc", "dev", "brw", "fp"].map(g => "g_" + g),
    ...["pc", "mac", "phone", "tablet"].map(k => "dv_" + k),
    ...["dev", "design", "office"].map(k => "jb_" + k),
    ...["system", "light", "dark"].map(x => "th_" + x),
    // what the checks return
    ...all(await read("src/infer.mjs"), /"(c_\w+)"/g),
    "c_na",
  ]);
  assert.ok(keys.size > 120, "found " + keys.size + " keys");
  const vars = s => (s.match(/\{\w+\}/g) || []).sort().filter((x, i, a) => a.indexOf(x) === i).join();
  for (const [lang] of LANGS) {
    const d = (await import(`../src/i18n/${lang}.mjs`)).default;
    const missing = [...keys].filter(k => !(k in d));
    assert.deepEqual(missing, [], `${lang} lacks ${missing.join(", ")}`);
    for (const k of Object.keys(en)) assert.ok(k in d, `${lang}: ${k}`);
    for (const k of Object.keys(en)) if (typeof en[k] === "string") assert.equal(vars(d[k]), vars(en[k]), `${lang}: ${k} placeholders`);
    assert.equal(d.docs.length, en.docs.length, lang + ": help entries");
    assert.ok(d.seo_desc.includes(String(SNIFFERS.length)), lang + ": the description counts " + SNIFFERS.length + " sniffers");
  }
});

test("no English fallback in the page script or the build", async () => {
  const [app, build] = await Promise.all(["src/app.js", "scripts/build.mjs"].map(read));
  for (const [name, s] of [["src/app.js", app], ["scripts/build.mjs", build]]) {
    assert.ok(!/\|\|\s*\w+(\.name)?\.en\b|\?\?\s*en\[/.test(s), name + " falls back to English");
  }
});

test("every topic page is its own page in every language", async () => {
  const { PAGES, TEXT } = await import("../src/pages.mjs");
  const sitemap = await read("public/sitemap.xml");
  for (const page of Object.keys(PAGES)) for (const [lang, slug] of LANGS) {
    const p = (slug ? slug + "/" : "") + page + "/", h = await read(`public/${p}index.html`), main = await page0(slug);
    const where = `${lang} ${page}`;
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, where + ": one h1");
    assert.ok(h.includes(`<h1>${TEXT[page][lang].h1}</h1>`), where + ": its own h1");
    assert.match(h, new RegExp(`<link rel="canonical" href="https://who.1ms.dog/${p}">`), where + ": canonical to itself");
    assert.equal((h.match(/<link rel="alternate" hreflang=/g) || []).length, LANGS.length + 1, where + ": hreflang to every language and x-default");
    assert.notEqual(h.match(/<title>[^<]*/)[0], main.match(/<title>[^<]*/)[0], where + ": its own title");
    assert.match(h, new RegExp(`og:image" content="https://who.1ms.dog/og/${page}-${lang.toLowerCase()}.png"`), where + ": its own preview");
    assert.equal((h.match(/<li data-f="/g) || []).length, PAGES[page].rows.length, where + ": focus rows");
    assert.ok(sitemap.includes(`<loc>https://who.1ms.dog/${p}</loc>`), where + ": in the sitemap");
  }
});
const page0 = slug => read(`public/${slug ? slug + "/" : ""}index.html`);
