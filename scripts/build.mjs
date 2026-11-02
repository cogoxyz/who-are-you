#!/usr/bin/env node
// Builds the static site in public/ from src/:
//   index.html, <lang>/index.html              the page per language
//   <lang>/<page>/index.html                   the topic pages (src/pages.mjs) per language
//   assets/app.<hash>.js, assets/app.<hash>.css the page's code and styles, shared by every language
//   assets/l.<lang>.<hash>.js                    the strings the browser code needs, per language
//   sitemap.xml, robots.txt, llms.txt, _headers  SEO and security headers (CSP)
// The Worker (src/worker.js) is deployed from source by wrangler; it isn't built here.
// Usage: node scripts/build.mjs          write the files
//        node scripts/build.mjs --check  exit 1 if anything in public/ is out of date (CI)
import { mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build as bundle, transform } from "esbuild";
import { GROUPS, COLUMNS, SNIFFERS, BLANKS, CHECKS, PROTO } from "../src/sniffers.mjs";
import { PAGES, TEXT } from "../src/pages.mjs";

const SITE = (process.env.SITE_URL || "https://who.1ms.dog").replace(/\/+$/, "");
const pub = new URL("../public/", import.meta.url), src = new URL("../src/", import.meta.url);
// language, URL folder, og:locale; the first is the root
export const LANGS = [["en", "", "en_US"], ["zh-CN", "zh-cn", "zh_CN"], ["zh-TW", "zh-tw", "zh_TW"], ["ja", "ja", "ja_JP"], ["ko", "ko", "ko_KR"],
  ["es", "es", "es_ES"], ["fr", "fr", "fr_FR"], ["de", "de", "de_DE"], ["pt", "pt", "pt_BR"], ["ru", "ru", "ru_RU"]];

// Runs before first paint: apply the saved theme. On the English root, send visitors to their language's page
// (a saved choice first, then the browser languages); crawlers and English readers stay, and so does an embedded
// page, which the report page opens in the language it wants (a redirect would also lose its referrer).
const PREPAINT = `(function(){var d=document.documentElement,th=null,s=null;try{th=localStorage.getItem("who:theme");s=localStorage.getItem("who:lang")}catch(e){}if(th==="light"||th==="dark")d.setAttribute("data-theme",th);if(!d.hasAttribute("data-root")||/[?&]embed=/.test(location.search))return;var P=JSON.parse(d.getAttribute("data-paths")||"{}"),l=null;try{var q=new URLSearchParams(location.search).get("lang");if(P[q])l=q}catch(e){}if(!l&&P[s])l=s;for(var ls=navigator.languages||[navigator.language||"en"],i=0;!l&&!s&&i<ls.length;i++){var x=String(ls[i]).toLowerCase(),b=x.split("-")[0];l=b==="zh"?(/tw|hk|mo|hant/.test(x)?"zh-TW":"zh-CN"):P[b]?b:null}if(l&&l!=="en")location.replace(P[l]+location.search+location.hash)})();`;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = s => createHash("sha256").update(s).digest("hex").slice(0, 10);
const sha = s => createHash("sha256").update(s).digest("base64");

async function loadI18n() {
  const out = {};
  for (const f of (await readdir(new URL("i18n/", src))).filter(f => f.endsWith(".mjs")))
    out[f.slice(0, -4)] = (await import(new URL("i18n/" + f, src).href + "?" + Date.now())).default;
  return out;
}

// Strings only the build uses (the page already shows them); everything else goes to the browser (the check names
// too: the share card draws them)
const BUILD_ONLY = new Set(["name", "seo_title", "seo_desc", "seo_kw", "og_sub", "h1", "docs", "lang_label", "faq_h", "story"]);

// the icon after a link to another 1ms.dog tool, the site's own (never an arrow)
export const EXT = '<svg class="ext" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 10v3.5H2.5V4H6"/></svg>';

// the checks another 1ms.dog tool looks into deeper; the page links there when the host announces that tool
export const GO = { dns: "dns", split: "egress", webrtc: "egress", dc: "ipqs" };

// the paragraph: one line per theme (where from, device, network, habits), a placeholder for every blank, each once
export function storyHtml(s, lang) {
  const used = [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const want = Object.keys(BLANKS);
  const odd = [...used.filter(k => !want.includes(k)), ...want.filter(k => !used.includes(k))];
  if (odd.length || new Set(used).size !== used.length) throw new Error(`i18n/${lang}.mjs story: blanks ${odd.join(", ") || "repeated"}`);
  const line = l => l.split(/(\{\w+\})/).map(p => /^\{\w+\}$/.test(p) ? `<span class="bl wait" data-b="${p.slice(1, -1)}"><i class="skl"></i></span>` : esc(p)).join("");
  return s.split("\n").map(l => `<p>${line(l)}</p>`).join("");
}

export async function build({ check = false } = {}) {
  const I = await loadI18n(), en = I.en;
  const langs = LANGS.filter(([l]) => I[l]);
  for (const [l] of langs) for (const k of Object.keys(en)) if (!(k in I[l])) throw new Error(`i18n/${l}.mjs is missing "${k}"`);
  const tpl = await readFile(new URL("page.html", src), "utf8");

  const root = fileURLToPath(new URL("..", import.meta.url));
  const js = (await bundle({ entryPoints: [fileURLToPath(new URL("app.js", src))], bundle: true, minify: true, format: "iife", target: "es2020",
    // 1ms.dog's share dialog stays out: it is copied verbatim to public/assets/share/ and loaded when someone shares
    legalComments: "none", write: false, absWorkingDir: root, external: ["/assets/share/*"] })).outputFiles[0].text;
  const cssFull = (await Promise.all(["fonts.css", "base.css", "style.css"].map(f => readFile(new URL(f, src), "utf8")))).join("\n");
  const css = (await transform(cssFull, { loader: "css", minify: true, legalComments: "none" })).code;
  const jsName = `app.${hash(js)}.js`, cssName = `app.${hash(css)}.css`;
  const files = { ["assets/" + jsName]: js, ["assets/" + cssName]: css };

  // a page's URL path: the language folder, then the topic page's folder ("" for the main page)
  const path = (slug, page = "") => "/" + (slug ? slug + "/" : "") + (page ? page + "/" : "");
  const pageList = ["", ...Object.keys(PAGES)];
  for (const page of Object.keys(PAGES)) for (const [l] of langs) for (const k of ["seo_title", "seo_desc", "seo_kw", "h1", "og_sub", "intro", "focus_h", "docs"])
    if (!TEXT[page][l] || !(k in TEXT[page][l])) throw new Error(`src/pages.mjs: ${page} ${l} has no "${k}"`);
  for (const [lang, slug, locale] of langs) {
    const base = I[lang];
    const strings = Object.fromEntries(Object.keys(en).filter(k => !BUILD_ONLY.has(k)).map(k => [k, base[k]]));
    const sjs = `window.L1MS=${JSON.stringify(strings).replace(/</g, "\\u003c")};\n`;
    const sName = `l.${lang.toLowerCase()}.${hash(sjs)}.js`;
    files["assets/" + sName] = sjs;

    for (const page of pageList) {
      // a topic page has its own title, description, H1, body text and questions; everything else is the main page's
      const d = page ? { ...base, ...TEXT[page][lang] } : base;
      const T = k => { if (!(k in d)) throw new Error(`i18n/${lang}.mjs has no "${k}"`); return d[k]; };
      const url = SITE + path(slug, page), docs = T("docs"), og = `${SITE}/og/${page ? page + "-" : ""}${lang.toLowerCase()}.png`;
      const alts = langs.map(([l, sl]) => `<link rel="alternate" hreflang="${l}" href="${SITE + path(sl, page)}">`).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${SITE + path("", page)}">`;
      const graph = [
        { "@type": "WebApplication", name: (page ? T("h1") : T("app_name")) + " · 1ms.dog", url, applicationCategory: "UtilitiesApplication", operatingSystem: "Any",
          browserRequirements: "Requires JavaScript", description: T("seo_desc"), inLanguage: lang, isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
        { "@type": "FAQPage", mainEntity: docs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/\n+/g, " ") } })) },
      ];
      const head = [
        `<title>${esc(T("seo_title"))}</title>`,
        `<meta name="description" content="${esc(T("seo_desc"))}">`,
        `<meta name="keywords" content="${esc(T("seo_kw"))}">`,
        ...(lang === "zh-CN" ? [`<meta http-equiv="Cache-Control" content="no-transform">`, `<meta http-equiv="Cache-Control" content="no-siteapp">`, `<meta name="applicable-device" content="pc,mobile">`] : []),
        `<meta name="robots" content="index, follow, max-image-preview:large">`,
        `<meta name="application-name" content="${esc(T("app_name"))}">`,
        `<meta name="theme-color" content="#f6f6f7" media="(prefers-color-scheme: light)">`,
        `<meta name="theme-color" content="#1c1c1c" media="(prefers-color-scheme: dark)">`,
        `<link rel="canonical" href="${url}">`, alts,
        `<link rel="icon" href="/favicon.ico" sizes="any">`, `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
        `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="1ms.dog">`,
        `<meta property="og:title" content="${esc(T("seo_title"))}">`, `<meta property="og:description" content="${esc(T("og_sub"))}">`, `<meta property="og:url" content="${url}">`,
        `<meta property="og:locale" content="${locale}">`, `<meta property="og:image" content="${og}">`,
        `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`,
        `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:image" content="${og}">`,
        `<meta name="twitter:title" content="${esc(T("seo_title"))}">`, `<meta name="twitter:description" content="${esc(T("og_sub"))}">`,
        `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`,
      ].join("\n");

      // the checks and every sniffer have their rows from the start; readings fill them in place
      // (the connection's protocols follow under their own heading, in the same rows)
      const ckRows = (id, list) => `<ul class="ck" id="${id}">` + list.map(c => `<li class="ckr" data-c="${c}"><i class="st"></i><span class="ck-l">${esc(T("c_" + c))}` +
        `<span class="ck-acts"><button class="ck-fix" type="button" aria-expanded="false" hidden>${esc(T("fix"))}</button>` +
        (GO[c] ? `<a class="ck-go" target="_blank" rel="noopener" hidden>${esc(T("go_" + GO[c]))}${EXT}</a>` : "") +
        `</span></span><span class="ck-v"><i class="skl"></i></span>` +
        `<ul class="ck-tip" hidden>${T("tip_" + c).split("\n").map(l => `<li>${esc(l)}</li>`).join("")}</ul></li>`).join("") + "</ul>";
      const checks = ckRows("checks", CHECKS) + `<div class="proto" id="protoBox"><div class="sec-h"><span>${esc(T("h_proto"))}</span></div>${ckRows("proto", PROTO)}</div>`;
      const G = Object.fromEntries(GROUPS);
      const group = g => `<div class="pg" data-g="${g}"><h3>${esc(T("g_" + g))}<span class="pg-n">${G[g].length}</span>` +
        (g === "exit" ? `<a class="pg-a" id="egLink" target="_blank" rel="noopener" hidden>${esc(T("ex_more"))}${EXT}</a>` : "") + "</h3>" +
        G[g].map(s => `<div class="pr wait" data-s="${s.id}"${s.s ? " data-sens" : ""}><span class="pn">${esc(T("s_" + s.id))}</span><span class="pa">…</span><code class="pm">${esc(s.m)}</code></div>`).join("") + "</div>";
      const groups = COLUMNS.map(col => `<div class="pcol">${col.map(group).join("")}</div>`).join("");
      // A topic page opens with its own H1, body text and the one result it is about; the portrait follows under
      // its own heading. The main page has no focus panel.
      const P = PAGES[page];
      const focus = !page ? "" : `<section class="focus card" id="focus" data-page="${page}">
      <div class="focus-t"><h1>${esc(T("h1"))}</h1><p>${esc(T("intro"))}</p></div>
      <div class="focus-r"><h2>${esc(T("focus_h"))}</h2>
        <p class="focus-v" id="focusV"><i class="st"></i><b><i class="skl"></i></b></p>
        <ul class="focus-rows">${P.rows.map(id => `<li data-f="${id}"><span>${esc(T("s_" + id))}</span><b>…</b></li>`).join("")}</ul>
        ${P.go ? `<a class="focus-go" id="focusGo" target="_blank" rel="noopener" hidden>${esc(T("go_" + P.go))}${EXT}</a>` : ""}
      </div>
    </section>`;
      const heroTitle = page ? `<h2 class="h1">${esc(base.h1)}</h2>` : `<h1>${esc(T("h1"))}</h1>`;
      // the other pages of this tool, in this language: the topic pages, and the main page from a topic page
      const topics = pageList.filter(p => p !== page).map(p => `<a href="${path(slug, p)}">${esc(p ? TEXT[p][lang].h1 : base.h1)}</a>`).join("");
      const helpNav = docs.map(([q], i) => `<button type="button" role="tab" data-hq="${i}" aria-selected="${i === 0}">${esc(q)}</button>`).join("");
      const helpC = docs.map(([q, a], i) => `<article data-hqb="${i}"${i ? " hidden" : ""}><h3>${esc(q)}</h3>${a.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join("")}</article>`).join("");
      const langOpts = langs.map(([l]) => `<option value="${l}"${l === lang ? " selected" : ""}>${esc(I[l].name)}</option>`).join("");
      const paths = Object.fromEntries(langs.map(([l, sl]) => [l, path(sl, page)]));
      // base: every language's main page, which other 1ms.dog tools share (links to them use it)
      const data = { lang, paths, base: Object.fromEntries(langs.map(([l, sl]) => [l, path(sl)])), focus: page ? { page, ...P } : null };

      const html = tpl
        .replace(/(<(\w+)\b[^>]*\sdata-i="(\w+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, k, inner, close) => open + esc(T(k)) + close)
        .replace(/\{\{a:(\w+)\}\}/g, (m, k) => esc(T(k)))   // translated attribute values (aria-label)
        .replace("{{lang}}", lang).replace("{{pathsAttr}}", esc(JSON.stringify(paths))).replace("{{rootAttr}}", slug ? "" : " data-root")
        .replace("{{prepaint}}", PREPAINT).replace("{{head}}", head).replace("{{css}}", cssName).replace("{{js}}", jsName).replace("{{strings}}", sName)
        .split("{{homeHref}}").join(path(slug)).replace("{{langOpts}}", langOpts).replace("{{focus}}", focus).replace("{{heroTitle}}", heroTitle)
        .replace("{{story}}", storyHtml(T("story"), lang)).replace("{{checks}}", checks).replace("{{segs}}", CHECKS.map(c => `<i data-c="${c}"></i>`).join(""))
        .replace("{{eyebrow}}", esc(T("eyebrow").replace("{n}", SNIFFERS.length))).replace("{{groups}}", groups).replace("{{topics}}", topics)
        .replace("{{helpNav}}", helpNav).replace("{{helpC}}", helpC).replace("{{data}}", JSON.stringify(data).replace(/</g, "\\u003c"));
      if (/\{\{\w+\}\}/.test(html)) throw new Error("unfilled placeholder in " + path(slug, page) + ": " + /\{\{\w+\}\}/.exec(html)[0]);
      files[path(slug, page).slice(1) + "index.html"] = html;
    }
  }

  files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    pageList.flatMap(page => langs.map(([, s]) => `  <url>\n    <loc>${SITE + path(s, page)}</loc>\n` + langs.map(([l, s2]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE + path(s2, page)}"/>`).join("\n") +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE + path("", page)}"/>\n  </url>`)).join("\n") + "\n</urlset>\n";
  files["robots.txt"] = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`;
  files["llms.txt"] = `# Who Are You · 1ms.dog

> Free privacy self-check. Shows who websites take you for, as a paragraph with the blanks filled in (likely
> nationality, city, language, time zone, device, browser, screen, graphics card, network, preferences, what your
> fonts say about your work, browser fingerprint), checks those readings against each other the way a site would to
> spot a VPN, proxy or spoofed browser, and lists all ${SNIFFERS.length} sniffers with what each one read: what the server sees
> in the request (address, Cloudflare geolocation, ASN, TLS, headers, clock) and standard browser APIs (languages,
> Intl, keyboard layout, speech voices, client hints, WebGL, screen, battery, media devices, fonts, canvas and audio
> fingerprints, WebRTC), plus the exit each kind of site sees and the DNS resolver. Nothing is stored.

- Page: ${SITE}/ (also ${langs.slice(1).map(([, s]) => "/" + s + "/").join(", ")})
- API (what the server sees, JSON): ${SITE}/api/me
- Browser fingerprint test: ${SITE}/fingerprint/
- DNS leak test: ${SITE}/dns-leak/
- Source code: https://github.com/yt1988/who-are-you
`;
  // The only inline script is the pre-paint snippet, identical on every page: one hash covers the site. Besides its
  // own origin the page asks the exit probes (an IP service in mainland China and one abroad, the Cloudflare trace
  // on chatgpt.com, claude.ai and www.cloudflare.com), Cloudflare Radar's IPv4-only and IPv6-only hosts and ip-api's
  // DNS name server (WebRTC's STUN requests aren't governed by CSP). Camera, microphone and speakers stay allowed by Permissions-Policy:
  // forbidding them would hide the devices from the media sniffer, which never asks for access.
  const csp = ["default-src 'self'", `script-src 'self' 'sha256-${sha(PREPAINT)}'`, "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data:",
    "connect-src 'self' https://myip.ipip.net https://api.ip.sb https://chatgpt.com https://claude.ai https://www.cloudflare.com https://ipv4-check-perf.radar.cloudflare.com https://ipv6-check-perf.radar.cloudflare.com https://*.edns.ip-api.com", "manifest-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"].join("; ");
  files["_headers"] = `# Generated by scripts/build.mjs
/*
  Content-Security-Policy: ${csp}
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: geolocation=(), payment=(), usb=(), interest-cohort=()
/assets/*
  Cache-Control: public, max-age=604800
/assets/app.*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
/assets/l.*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
/assets/fonts/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
/flags/*
  Cache-Control: public, max-age=2592000
/og/*
  Cache-Control: public, max-age=604800
/llms.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8
`;

  // generated files that are no longer produced (old hashes) are stale too
  const gen = async () => (await readdir(new URL("assets/", pub))).filter(f => /^(app|l)\..+\.(js|css)$/.test(f)).map(f => "assets/" + f);
  const stale = [];
  for (const [f, body] of Object.entries(files)) {
    let cur = null; try { cur = await readFile(new URL(f, pub), "utf8"); } catch (e) {}
    if (cur !== body) stale.push(f);
  }
  const orphans = (await gen()).filter(f => !(f in files));
  if (check) return [...stale, ...orphans];
  for (const f of stale) { await mkdir(new URL(".", new URL(f, pub)), { recursive: true }); await writeFile(new URL(f, pub), files[f]); }
  for (const f of orphans) await rm(new URL(f, pub));
  return [...stale, ...orphans];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check");
  const changed = await build({ check });
  if (check && changed.length) { console.error("public/ is out of date: " + changed.join(", ") + "\nRun npm run build and commit public/."); process.exit(1); }
  console.log(check ? "public/ is up to date" : changed.length ? "wrote " + changed.join(", ") : "nothing to do");
}
