// who-are-you page. The hero tells the visitor who sites take them for, as a paragraph with blanks, and checks the
// readings against each other the way a site would to spot a disguise. The second card lists every sniffer and what it
// read; each row is in the HTML from the start and is filled the moment its sniffer answers. The paragraph is filled
// once, when every sniffer it needs is in, so its text doesn't reflow piece by piece. Strings: window.L1MS.
import { GROUPS, SNIFFERS, BLANKS, CHECKS, PROTO } from "./sniffers.mjs";
import { encode, decode, linkPath, parsePath } from "./share.mjs";
import { nationality, device, browser, gpuName, gpuOS, kbdLayout, isDataCenter, fontHints, checks, protocols, offTxt, splitOf } from "./infer.mjs";

(function () {
  "use strict";
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const D = JSON.parse($("#data").textContent);
  const L = window.L1MS || {}, LANG = D.lang;
  const t = (k, v) => { let s = L[k] ?? k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const K = { theme: "who:theme", lang: "who:lang", mask: "who:mask", last: "who:last" };
  const dn = type => { try { return new Intl.DisplayNames([LANG], { type }); } catch (e) { return null; } };
  const REG = dn("region"), LNG = dn("language");
  const country = cc => { try { return REG ? REG.of(cc) : cc; } catch (e) { return cc; } };
  const language = tag => { try { return LNG ? LNG.of(tag) : tag; } catch (e) { return tag; } };
  const flag = cc => /^[A-Z]{2}$/.test(cc || "") ? `<img class="flag" src="/flags/${cc.toLowerCase()}.svg" alt="" width="20" height="15">` : "";
  // A flag and the text after it, the flag kept on the line of the text's first word; that word can be a link.
  const flagged = (cc, s, href) => {
    const m = String(s).match(/^(\S+)([\s\S]*)$/) || ["", "", ""];
    const w = href ? `<a href="${esc(href)}" target="_blank" rel="noopener" title="${esc(t("go_ipqs"))}">${esc(m[1])}</a>` : esc(m[1]);
    return `<span class="nw">${flag(cc)}${w}</span>${esc(m[2])}`;
  };
  // other 1ms.dog tools, when the host announces them (absent when self-hosted)
  const META = n => (document.querySelector(`meta[name="${n}"]`) || {}).content || "";
  // Embedded in Connection Checkup: only when opened with ?embed=checkup by the report page the host names in
  // <meta name="check">; anything else (no meta when self-hosted, another referrer) is an ordinary page. The report
  // page is the only origin the page talks to. Only the home page embeds: not a topic page, not a shared portrait.
  const EMBED = (() => {
    const check = META("check");
    if (new URLSearchParams(location.search).get("embed") !== "checkup" || !check || window.parent === window) return "";
    if (D.focus || parsePath(location.pathname)) return "";
    try { const o = new URL(check).origin; return new URL(document.referrer).origin === o ? o : ""; } catch (e) { return ""; }
  })();
  if (EMBED) document.documentElement.setAttribute("data-who-embed", "");
  const post = m => { if (EMBED) window.parent.postMessage({ ms: "checkup", v: 1, tool: "who", ...m }, EMBED); };
  // a run that can't report anything says so once, and then sends no result (the page itself still finishes)
  let failed = false;
  const fail = () => { if (!failed) { failed = true; post({ type: "error", text: t("em_blocked") }); } };
  // the icon that ends a link to another tool (the same as the build's EXT)
  const EXT = '<svg class="ext" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 10v3.5H2.5V4H6"/></svg>';
  const IPQS = META("ipqs"), EGRESS = META("egress"), DNSTEST = META("dns"), ASN = META("asn"), IPV6 = META("ipv6");
  // another tool's page in this page's language (every 1ms.dog tool keeps the same language folders)
  const inLang = host => host.replace(/\/$/, "") + ((D.base || D.paths)[LANG] || "/");
  // only public addresses get a link: there is nothing to look up about a private, loopback or link-local one
  const PRIVATE = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1?$|f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/i;
  const ipqsOf = ip => IPQS && ip && !PRIVATE.test(ip) ? inLang(IPQS) + "?ip=" + encodeURIComponent(ip) : "";
  // a public address's page on ASN Lookup (who runs the network it belongs to)
  const ipLink = ip => ASN && !PRIVATE.test(ip) ? `<a href="${esc(inLang(ASN) + "ip/" + ip)}" target="_blank" rel="noopener" title="${esc(t("go_asn"))}">${esc(ip)}</a>` : esc(ip);
  if (EGRESS && $("#egLink")) { $("#egLink").href = inLang(EGRESS); $("#egLink").hidden = false; }
  // a topic page's link to the tool that looks deeper: DNS Test, or EgressLens for every exit
  const focusHref = D.focus && ({ dns: DNSTEST && inLang(DNSTEST), egress: EGRESS && inLang(EGRESS) })[D.focus.go];
  if (focusHref && $("#focusGo")) { $("#focusGo").href = focusHref; $("#focusGo").hidden = false; }
  // an AS number links to its page on ASN Lookup
  const asnOf = n => ASN && n ? inLang(ASN) + "AS" + n : "";
  const asnLink = n => { const h = asnOf(n); return h ? `<a href="${esc(h)}" target="_blank" rel="noopener" title="${esc(t("go_asn"))}">AS${n}</a>` : "AS" + n; };
  const list = a => a.join(t("v_join"));
  // a network's everyday name: "Alibaba Cloud (Singapore) Private Limited" → "Alibaba Cloud", "Amazon.com, Inc." → "Amazon.com"
  const shortOrg = s => {
    let x = String(s || "").replace(/\s*\([^)]*\)/g, "").trim(), y;
    do { y = x; x = x.replace(/[,.]?\s+(inc|llc|l\.l\.c|ltd|limited|co|corp|corporation|company|gmbh|ag|s\.?a\.?|b\.?v\.?|pte|private|plc|oy|ab|as|srl|sas|kg)\.?$/i, "").trim(); } while (x !== y && x);
    return x || String(s || "");
  };
  const within = (p, ms, fb) => Promise.race([p, new Promise(r => setTimeout(() => r(fb), ms))]);
  const sha = async s => {
    try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
    catch (e) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16).padStart(8, "0"); }
  };
  const mq = q => matchMedia(q).matches;
  const getJ = (u, ms = 5000) => fetch(u, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(ms) }).then(r => r.ok ? r.json() : Promise.reject());
  const getT = (u, ms = 5000) => fetch(u, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(ms) }).then(r => r.ok ? r.text() : Promise.reject());

  /* ---------- theme and language (synced across the 1ms.dog tools) ---------- */
  const thBtn = $("#theme"), TH = ["system", "light", "dark"];
  const applyTheme = th => {
    if (th === "light" || th === "dark") document.documentElement.setAttribute("data-theme", th); else document.documentElement.removeAttribute("data-theme");
    thBtn.dataset.th = th; thBtn.title = t("th_" + th); thBtn.setAttribute("aria-label", t("th_" + th));
  };
  applyTheme(TH.includes(store.get(K.theme)) ? store.get(K.theme) : "system");
  thBtn.onclick = () => { const n = TH[(TH.indexOf(thBtn.dataset.th) + 1) % 3]; store.set(K.theme, n); applyTheme(n); };
  $("#lang").onchange = e => { const l = e.target.value; store.set(K.lang, l); const r = parsePath(location.pathname); location.href = r ? linkPath(l, r.code) : D.paths[l] + location.search + location.hash; };   // a shared portrait comes along

  /* ---------- dialogs ---------- */
  function openDlg(id) { $("#" + id).hidden = false; document.documentElement.style.overflow = "hidden"; $("#" + id + " [data-close]").focus(); }
  function closeDlg() { $$(".scrim").forEach(s => { s.hidden = true; }); document.documentElement.style.overflow = ""; }
  $$("[data-close]").forEach(b => { b.onclick = closeDlg; });
  $$(".scrim").forEach(s => s.addEventListener("click", e => { if (e.target === s) closeDlg(); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDlg(); });
  // help: one answer at a time; a picker with previous / next on phones
  let helpIdx = 0;
  const helpN = $$("#helpNav [data-hq]").length;
  $("#helpSel").innerHTML = $$("#helpNav [data-hq]").map((b, i) => `<option value="${i}">${i + 1} / ${helpN} · ${esc(b.textContent)}</option>`).join("");
  function showHelp(i) {
    helpIdx = Math.max(0, Math.min(helpN - 1, i));
    $$("#helpNav [data-hq]").forEach(b => b.setAttribute("aria-selected", +b.dataset.hq === helpIdx));
    $$("#helpC [data-hqb]").forEach(a => { a.hidden = +a.dataset.hqb !== helpIdx; });
    $("#helpSel").value = helpIdx;
    $$("[data-hstep]").forEach(b => { b.disabled = helpIdx + +b.dataset.hstep < 0 || helpIdx + +b.dataset.hstep >= helpN; });
    $("#helpC").scrollTop = 0;
  }
  $("#helpBtn").onclick = () => { showHelp(helpIdx); openDlg("help"); };
  $$("#helpNav [data-hq]").forEach(b => { b.onclick = () => showHelp(+b.dataset.hq); });
  $("#helpSel").onchange = e => showHelp(+e.target.value);
  $$("[data-hstep]").forEach(b => { b.onclick = () => showHelp(helpIdx + +b.dataset.hstep); });

  /* ---------- blur the address and location (for screenshots) ---------- */
  const masked = () => store.get(K.mask) === "1";
  const applyMask = () => { $("#main").classList.toggle("masked", masked()); $("#eyeT").textContent = t(masked() ? "show" : "hide"); $("#eye").setAttribute("aria-pressed", masked()); };
  $("#eye").onclick = () => { store.set(K.mask, masked() ? "0" : "1"); applyMask(); };
  applyMask();

  // the tooltip: blanks, rows and checks that explain themselves on hover (data-why)
  let tipEl;
  function showTip(el) {
    if (!tipEl) { tipEl = document.body.appendChild(Object.assign(document.createElement("div"), { className: "tip" })); addEventListener("scroll", () => tipEl.classList.remove("on"), { passive: true }); }
    tipEl.textContent = el.dataset.why;
    const b = el.getBoundingClientRect(), w = tipEl.offsetWidth;
    tipEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, b.left + b.width / 2 - w / 2)) + "px";
    tipEl.style.top = b.bottom + 6 + "px"; tipEl.classList.add("on");
  }
  document.addEventListener("mouseover", e => { const el = e.target.closest && e.target.closest("[data-why]"); if (el) showTip(el); else if (tipEl) tipEl.classList.remove("on"); });
  document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest("[data-why]"); if (el) showTip(el); });
  // a blank points at the rows it came from: hovering it lights them up
  document.addEventListener("mouseover", e => {
    const b = e.target.closest && e.target.closest(".bl[data-b]");
    $$(".pr.lit").forEach(r => r.classList.remove("lit"));
    if (b) for (const id of (b.dataset.from || "").split(" ")) { const r = PR[id]; if (r) r.classList.add("lit"); }
  });

  /* ---------- rows: each keeps its size from the first paint; only the text changes ---------- */
  const PR = Object.fromEntries($$(".pr[data-s]").map(r => [r.dataset.s, r]));
  const FR = Object.fromEntries($$(".focus-rows [data-f]").map(r => [r.dataset.f, r]));
  const N = SNIFFERS.length;
  // Network Checkup, the run of every 1ms.dog tool at once, beside the verdict (when the host announces it; never
  // inside it)
  const CHECK = META("check");
  if (CHECK && !EMBED) { const a = $("#checkGo"); a.href = inLang(CHECK); a.innerHTML = esc(t("go_check")) + EXT; a.hidden = false; }
  let gen = 0, done = new Set();
  // fill a row: html is trusted markup built here, everything read from the browser or the server goes through esc()
  function row(id, html, opt = {}) {
    const r = PR[id]; if (!r || done.has(id)) return;
    done.add(id);
    r.classList.remove("wait"); r.classList.toggle("na", !!opt.na);
    const a = r.querySelector(".pa"); a.innerHTML = html;
    if (FR[id]) { FR[id].querySelector("b").innerHTML = html; FR[id].classList.toggle("na", !!opt.na); }
    const why = opt.why || (a.scrollWidth > a.clientWidth + 1 ? a.textContent : "");
    if (why) { r.dataset.why = why; r.tabIndex = 0; } else { delete r.dataset.why; r.removeAttribute("tabindex"); }
    progress();
  }
  const txt = (id, s, opt) => row(id, esc(s), opt);
  const na = (id, key = "v_unsup") => row(id, esc(t(key)), { na: true });
  function progress() {
    const n = done.size;
    $("#prog i").style.transform = `scaleX(${n / N})`;
    $("#prog").classList.toggle("end", n >= N);
    $("#progTxt").textContent = n >= N ? t("done_n", { n: N }) : t("progress", { n, of: N });
    post({ type: "progress", done: n, total: N, text: $("#progTxt").textContent });
  }
  // run a sniffer; one that throws marks its rows as unreadable
  const guard = async (ids, f) => { try { await f(); } catch (e) { for (const id of [].concat(ids)) na(id, "v_fail"); } };

  /* ---------- the sniffers ---------- */
  let R;   // this run's readings

  // what the server saw: the address, Cloudflare's data for it, TLS, the headers, the clock
  async function server() {
    const ids = ["ip", "geo", "coords", "isp", "tzip", "ptr", "edge", "proto", "tlsfp", "clock", "h_ua", "h_lang", "h_chua", "h_plat", "h_enc", "h_dnt"];
    let j, t0, t1;
    try {
      t0 = Date.now();
      const r = await fetch("/api/me", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      j = await r.json(); t1 = Date.now();
    } catch (e) { for (const id of ids) na(id, "v_fail"); R.srv = {}; return; }
    const c = j.cf || {}, h = j.h || {};
    R.srv = j;
    row("ip", flagged(null, j.ip + " · IPv" + j.v, ipqsOf(j.ip)));
    row("geo", c.country ? flagged(c.country, [c.city, c.region, country(c.country)].filter(Boolean).join(", ")) : esc(t("v_empty")), { na: !c.country });
    if (c.latitude != null) txt("coords", [(+c.latitude).toFixed(2) + ", " + (+c.longitude).toFixed(2), c.postalCode].filter(Boolean).join(" · ")); else na("coords", "v_empty");
    if (c.asn) row("isp", asnLink(c.asn) + esc(" · " + (c.asOrganization || ""))); else na("isp", "v_empty");
    if (c.timezone) txt("tzip", c.timezone + " · UTC" + offTxt(tzOffset(c.timezone))); else na("tzip", "v_empty");
    if (j.ptr) txt("ptr", j.ptr); else na("ptr", "v_empty");
    if (c.colo) txt("edge", c.colo + (c.clientTcpRtt ? " · RTT " + c.clientTcpRtt + " ms" : "")); else na("edge", "v_empty");
    txt("proto", [c.httpProtocol, c.tlsVersion, c.tlsCipher].filter(Boolean).join(" · ") || "–");
    if (c.tlsClientExtensionsSha1) txt("tlsfp", (await sha(c.tlsClientExtensionsSha1)).slice(0, 12) + (c.tlsClientHelloLength ? " · " + c.tlsClientHelloLength + " B" : "")); else na("tlsfp", "v_empty");
    // the server's clock at the request, against the middle of the round trip on this one
    const skew = (t0 + t1) / 2 - j.at, sec = Math.abs(skew) / 1000;
    txt("clock", sec < 1 ? t("clk_ok", { ms: Math.round(Math.abs(skew)) }) : t(skew > 0 ? "clk_fast" : "clk_slow", { s: sec < 10 ? sec.toFixed(1) : Math.round(sec) }));
    const hv = (id, v) => v ? txt(id, v) : na(id, "v_none");
    hv("h_ua", h["user-agent"]); hv("h_lang", h["accept-language"]); hv("h_chua", h["sec-ch-ua"]);
    hv("h_plat", [h["sec-ch-ua-platform"], h["sec-ch-ua-mobile"] === "?1" ? "mobile" : ""].filter(Boolean).join(" · "));
    hv("h_enc", h["accept-encoding"]);
    hv("h_dnt", [h.dnt != null ? "DNT: " + h.dnt : "", h["sec-gpc"] != null ? "Sec-GPC: " + h["sec-gpc"] : ""].filter(Boolean).join(" · "));
  }

  // a time zone's name in the page's language ("北美太平洋时间"), with its offset
  // (a shared link leaves the address's zone out unless it shows the city: its country stands in, "日本 UTC+09:00")
  function zoneLabel(tz, off, cc) {
    let name = "";
    try { if (tz) name = new Intl.DateTimeFormat(LANG, { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date()).find(x => x.type === "timeZoneName").value; } catch (e) {}
    if (!name && cc) name = country(cc);
    return (name && !/^GMT|^UTC/.test(name) ? name + " " : "") + "UTC" + off;
  }

  // a time zone's UTC offset now, in minutes
  function tzOffset(tz) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(new Date()).find(x => x.type === "timeZoneName").value;
      const m = p.match(/GMT([+-−])(\d{2}):?(\d{2})?/);
      return m ? (m[1] === "+" ? 1 : -1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
    } catch (e) { return null; }
  }

  function referrer() {
    txt("h_ref", document.referrer || t("v_none"), { na: !document.referrer });
    txt("history", t("hist_v", { n: history.length }));
  }

  // language, region and formats
  function locale() {
    const langs = navigator.languages && navigator.languages.length ? [...navigator.languages] : [navigator.language].filter(Boolean);
    R.langs = langs;
    txt("langs", langs.join(", ") || "–");
    const ro = Intl.DateTimeFormat().resolvedOptions();
    R.tz = ro.timeZone; R.tzOff = tzOffset(ro.timeZone);
    txt("locale", [ro.locale, ro.calendar, ro.numberingSystem].filter(Boolean).join(" · "));
    let tzName = "";
    try { tzName = new Intl.DateTimeFormat(LANG, { timeZone: R.tz, timeZoneName: "longGeneric" }).formatToParts(new Date()).find(x => x.type === "timeZoneName").value; } catch (e) {}
    R.tzName = tzName || R.tz;
    txt("tz", R.tz + " · UTC" + offTxt(R.tzOff), { why: tzName });
    const hc = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
    R.h12 = hc === "h11" || hc === "h12";
    txt("hour", t(R.h12 ? "ck_12" : "ck_24") + " · " + new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date()));
    try {
      const loc = new Intl.Locale(langs[0] || ro.locale), wi = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
      if (!wi) throw 0;
      // 2024-01-01 was a Monday: day d (1 = Monday … 7 = Sunday) is January d
      txt("week", t("week_v", { d: new Intl.DateTimeFormat(LANG, { weekday: "long" }).format(new Date(2024, 0, wi.firstDay)) }));
    } catch (e) { na("week"); }
    txt("fmt", new Intl.NumberFormat().format(1234567.89) + " · " + new Intl.DateTimeFormat().format(new Date()));
  }

  async function keyboard() {
    if (!navigator.keyboard || !navigator.keyboard.getLayoutMap) return na("kbd");
    const map = await within(navigator.keyboard.getLayoutMap(), 1500, null);
    const k = kbdLayout(map);
    if (k) txt("kbd", k); else na("kbd");
  }

  async function voices() {
    if (!window.speechSynthesis) return na("voices");
    let v = speechSynthesis.getVoices();
    if (!v.length) v = await within(new Promise(r => speechSynthesis.addEventListener("voiceschanged", () => r(speechSynthesis.getVoices()), { once: true })), 1500, []);
    if (!v.length) return na("voices", "v_none");
    const langs = [...new Set(v.map(x => (x.lang || "").split(/[-_]/)[0]).filter(Boolean))];
    txt("voices", t("voices_v", { n: v.length, list: list(langs.slice(0, 6).map(language)) + (langs.length > 6 ? "…" : "") }), { why: langs.map(language).join(", ") });
  }

  // the system, the browser, the hardware
  async function hardware() {
    const ua = navigator.userAgent, uad = navigator.userAgentData;
    let hi = {};
    if (uad) {
      hi = { platform: uad.platform, mobile: uad.mobile, brands: uad.brands };
      try { Object.assign(hi, await within(uad.getHighEntropyValues(["platformVersion", "architecture", "bitness", "model", "fullVersionList"]), 1500, {})); } catch (e) {}
    }
    R.hi = hi;
    const dv = device(ua, hi, navigator.maxTouchPoints || 0);
    R.dev = dv;
    R.osTxt = [dv.os, dv.osv].filter(Boolean).join(" ");
    txt("os", R.osTxt || navigator.platform || "–");
    const b = browser(ua, hi.fullVersionList || hi.brands || []);
    R.br = b;
    R.browser = [b.name, b.v].filter(Boolean).join(" ");
    txt("browser", R.browser || "–");
    if (hi.architecture) txt("arch", t("arch_v", { a: hi.architecture, b: hi.bitness || "?" }) + (dv.model ? " · " + dv.model : ""));
    else if (navigator.platform) txt("arch", navigator.platform);
    else na("arch");
    const s = screen, dpr = Math.round((devicePixelRatio || 1) * 100) / 100;
    R.screen = s.width ? s.width + "×" + s.height : t("v_unknown");
    if (!s.width) na("screen"); else txt("screen", t("scr_v", { w: s.width, h: s.height, dpr, d: s.colorDepth }), { why: t("scr_avail", { w: s.availWidth, h: s.availHeight, iw: innerWidth, ih: innerHeight }) });
    if (navigator.hardwareConcurrency) txt("cpu", t("cores", { n: navigator.hardwareConcurrency })); else na("cpu");
    if (navigator.deviceMemory) txt("mem", t("mem_v", { n: navigator.deviceMemory })); else na("mem");
    txt("touch", [t("touch_v", { n: navigator.maxTouchPoints || 0 }), t(mq("(pointer: coarse)") ? "ptr_coarse" : "ptr_fine")].join(" · "));
    const c = navigator.connection;
    if (c && (c.effectiveType || c.type)) txt("conn", [c.type, c.effectiveType, c.rtt != null ? c.rtt + " ms" : "", c.downlink ? c.downlink + " Mbps" : "", c.saveData ? "save-data" : ""].filter(Boolean).join(" · "));
    else na("conn");
  }

  function gpu() {
    const cv = document.createElement("canvas");
    const gl = cv.getContext("webgl") || cv.getContext("experimental-webgl");
    if (!gl) { R.gpuRaw = null; na("gpu"); na("webgl"); return null; }
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const ren = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const ven = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    R.gpuRaw = ren; R.gpu = gpuName(ren);
    txt("gpu", R.gpu || ren || "–", { why: [ven, ren].filter(Boolean).join(" · ") });
    // everything WebGL reports about the card and driver, for the WebGL fingerprint
    const P = ["MAX_TEXTURE_SIZE", "MAX_RENDERBUFFER_SIZE", "MAX_VIEWPORT_DIMS", "MAX_VERTEX_ATTRIBS", "MAX_VERTEX_UNIFORM_VECTORS", "MAX_FRAGMENT_UNIFORM_VECTORS",
      "MAX_VARYING_VECTORS", "MAX_COMBINED_TEXTURE_IMAGE_UNITS", "ALIASED_LINE_WIDTH_RANGE", "ALIASED_POINT_SIZE_RANGE", "SHADING_LANGUAGE_VERSION", "VERSION"];
    return [ven, ren, ...P.map(p => String(gl.getParameter(gl[p]))), (gl.getSupportedExtensions() || []).join(",")].join("|");
  }

  async function battery() {
    if (!navigator.getBattery) return na("battery");
    const b = await within(navigator.getBattery(), 1500, null);
    if (!b) return na("battery");
    R.battery = b;
    // a desktop reports a full battery that is always charging and never needs to
    if (b.level === 1 && b.charging && b.chargingTime === 0) txt("battery", t("bat_ac"));
    else txt("battery", t("bat_v", { p: Math.round(b.level * 100), s: t(b.charging ? "bat_chg" : "bat_dis") }));
  }

  async function media() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return na("media");
    const l = await within(navigator.mediaDevices.enumerateDevices(), 1500, null);
    if (!l) return na("media");
    const n = k => l.filter(d => d.kind === k).length;
    txt("media", t("med_v", { c: n("videoinput"), m: n("audioinput"), s: n("audiooutput") }));
  }

  async function storage() {
    if (!navigator.storage || !navigator.storage.estimate) return na("storage");
    const e = await within(navigator.storage.estimate(), 1500, null);
    if (!e || !e.quota) return na("storage");
    txt("storage", t("sto_v", { n: e.quota >= 1e9 ? Math.round(e.quota / 1e9) + " GB" : Math.round(e.quota / 1e6) + " MB" }));
  }

  // settings and preferences the browser shares
  function prefs() {
    R.dark = mq("(prefers-color-scheme: dark)");
    txt("scheme", t(R.dark ? "sch_dark" : "sch_light") + (mq("(prefers-contrast: more)") ? " · " + t("sch_contrast") : "") + (mq("(forced-colors: active)") ? " · forced-colors" : ""));
    txt("motion", t(mq("(prefers-reduced-motion: reduce)") ? "mo_reduce" : "mo_no"));
    const g = mq("(color-gamut: rec2020)") ? "Rec.2020" : mq("(color-gamut: p3)") ? "Display P3" : mq("(color-gamut: srgb)") ? "sRGB" : "–";
    txt("gamut", g + " · " + (mq("(dynamic-range: high)") ? "HDR" : "SDR"));
    const dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1";
    txt("dnt", "DNT " + t(dnt ? "v_on" : "v_off") + " · GPC " + t(navigator.globalPrivacyControl ? "v_on" : "v_off"));
    txt("cookies", t(navigator.cookieEnabled ? "v_on" : "v_off"));
    if (navigator.pdfViewerEnabled != null) txt("pdf", t(navigator.pdfViewerEnabled ? "v_yes" : "v_no")); else na("pdf");
    R.webdriver = !!navigator.webdriver;
    txt("webdriver", t(R.webdriver ? "wd_yes" : "wd_no"));
  }

  // an element with the class names ad blockers hide: if it has no height, something hid it
  async function adblock() {
    await new Promise(r => setTimeout(r, 120));
    const el = $("#ad-slot"), cs = el && getComputedStyle(el);
    R.adblock = !el || el.offsetHeight === 0 || cs.display === "none" || cs.visibility === "hidden";
    txt("adblock", t(R.adblock ? "ab_on" : "ab_off"));
  }

  // Fonts: a word set in a font is measured against the generic fallbacks; a different width means the font is there.
  const FONTS = ["Segoe UI", "Calibri", "Cambria", "Consolas", "Microsoft YaHei", "SimSun", "Microsoft JhengHei", "Yu Gothic", "Meiryo", "MS Gothic",
    "Malgun Gothic", "Leelawadee UI", "Nirmala UI", "Helvetica Neue", "PingFang SC", "PingFang TC", "Hiragino Sans", "Apple SD Gothic Neo", "Menlo",
    "Avenir", "Songti SC", "Ubuntu", "DejaVu Sans", "Liberation Sans", "Noto Sans CJK SC", "WenQuanYi Micro Hei", "Cantarell", "Roboto", "Noto Color Emoji",
    "Aptos", "Myriad Pro", "Minion Pro", "Source Han Sans", "Adobe Clean", "JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", "Hack", "Inconsolata",
    "Comic Sans MS", "Arial", "Times New Roman", "Courier New", "Verdana", "Georgia"];
  function fonts() {
    const c = document.createElement("canvas").getContext("2d");
    if (!c) { R.fonts = []; na("fonts"); return; }
    const W = "mmmmmmmmmlli你是谁あア한1WO@", base = ["monospace", "sans-serif", "serif"];
    const w = f => { c.font = "72px " + f; return c.measureText(W).width; };
    const b = base.map(w);
    R.fonts = FONTS.filter(f => base.some((g, i) => w(`"${f}", ${g}`) !== b[i]));
    txt("fonts", t("fonts_v", { n: R.fonts.length, of: FONTS.length }) + " " + R.fonts.join(", "), { why: R.fonts.join(", ") });
  }

  // fingerprints: the same drawing, sound or setup comes out slightly differently on every system
  function canvasPrint() {
    const cv = document.createElement("canvas"); cv.width = 280; cv.height = 60;
    const c = cv.getContext("2d"); if (!c) return null;
    const g = c.createLinearGradient(0, 0, 280, 0); g.addColorStop(0, "#f60"); g.addColorStop(1, "#06c");
    c.fillStyle = g; c.fillRect(0, 0, 280, 60);
    c.textBaseline = "top"; c.font = "18px Arial"; c.fillStyle = "#069"; c.fillText("Who are you? 你是谁 😃 1ms", 4, 8);
    c.font = "bold 15px serif"; c.fillStyle = "rgba(255,255,255,.7)"; c.fillText("Cwm fjordbank glyphs vext quiz", 6, 32);
    c.beginPath(); c.arc(250, 30, 18, 0, Math.PI * 2); c.strokeStyle = "#fc0"; c.lineWidth = 3; c.stroke();
    return cv.toDataURL();
  }
  async function audioPrint() {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AC) return null;
    const ctx = new AC(1, 5000, 44100), o = ctx.createOscillator(), k = ctx.createDynamicsCompressor();
    o.type = "triangle"; o.frequency.value = 10000;
    k.threshold.value = -50; k.knee.value = 40; k.ratio.value = 12; k.attack.value = 0; k.release.value = 0.25;
    o.connect(k); k.connect(ctx.destination); o.start(0);
    const buf = await within(ctx.startRendering(), 2000, null);
    if (!buf) return null;
    const d = buf.getChannelData(0); let s = 0;
    for (let i = 4500; i < 5000; i++) s += Math.abs(d[i]);
    return s.toString();
  }
  async function prints(glInfo) {
    const short = h => h.slice(0, 8) + "·" + h.slice(8, 16);
    const c1 = canvasPrint(), c2 = canvasPrint();
    const ch = c1 ? await sha(c1) : null;
    if (ch) txt("canvas", short(ch)); else na("canvas");
    const gh = glInfo ? await sha(glInfo) : null;
    if (gh) txt("webgl", short(gh));
    const a = await audioPrint().catch(() => null), ah = a ? await sha(a) : null;
    if (ah) txt("audio", short(ah)); else na("audio");
    const fh = await sha(R.fonts.join(","));
    txt("fontfp", short(fh));
    // a browser that adds noise to protect the visitor draws the same picture differently each time
    R.rand = !!(c1 && c2 && c1 !== c2);
    txt("rand", t(R.rand ? "rand_yes" : "rand_no"));
    // everything that stays put on this device and browser; the address is left out, so it survives a VPN
    const all = [ch, gh, ah, fh, screen.width + "x" + screen.height + "x" + screen.colorDepth, devicePixelRatio, R.tz, (R.langs || []).join(), navigator.hardwareConcurrency,
      navigator.deviceMemory, navigator.platform, navigator.maxTouchPoints].join("|");
    R.fpHex = await sha(all); R.fp = short(R.fpHex);
    txt("fpid", R.fp);
  }

  // WebRTC: the public addresses STUN servers see, which can be another than the one the page's requests come from
  async function webrtc() {
    if (!window.RTCPeerConnection) { R.rtc = false; na("lan", "rtc_off"); return txt("webrtc", t("rtc_off")); }
    const ips = new Set(), lan = new Set();
    const one = async url => {
      let pc;
      try {
        pc = new RTCPeerConnection({ iceServers: [{ urls: url }] });
        pc.createDataChannel("x");
        const fin = new Promise(res => {
          pc.onicecandidate = e => {
            if (!e.candidate) return res();
            const m = (e.candidate.candidate || "").match(/ ([0-9a-f.:]+) \d+ typ srflx/i);
            if (m) ips.add(m[1]);
            const h = (e.candidate.candidate || "").match(/ (\S+) \d+ typ host/i);
            if (h) lan.add(h[1]);
          };
          setTimeout(res, 3500);
        });
        await pc.setLocalDescription(await pc.createOffer());
        await fin;
      } catch (e) {} finally { try { pc && pc.close(); } catch (e) {} }
    };
    await Promise.all(["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"].map(one));
    R.rtc = [...ips];
    // IPv4 first, each public address linked to its network
    R.rtc.sort((x, y) => x.includes(":") - y.includes(":"));
    if (R.rtc.length) row("webrtc", R.rtc.map(ipLink).join(", ")); else na("webrtc", "rtc_none");
    // local addresses as they are; an mDNS name (a random one ending in .local) only says the browser hides them
    const local = [...lan], shown = local.filter(x => !/\.local$/i.test(x)), mdns = local.length > shown.length;
    if (shown.length || mdns) txt("lan", [...shown, mdns ? t("lan_mdns") : ""].filter(Boolean).join(", "), mdns ? { why: t("lan_mdns_why") } : {});
    else na("lan", "v_empty");
  }

  // The address each kind of destination sees: a site in mainland China, an IP service abroad, two AI services and
  // Cloudflare (its trace on each service's own domain). A rule-based proxy or VPN picks the route by destination.
  const EXITS = [
    ["ex_cn", () => getJ("https://myip.ipip.net/json").then(b => ({ ip: b.data.ip, cc: null, note: (b.data.location || []).filter(Boolean).join(" ") }))],
    ["ex_intl", () => getJ("https://api.ip.sb/geoip").then(b => ({ ip: b.ip, cc: b.country_code, note: b.isp || b.asn_organization || "" }))],
    ...[["ex_gpt", "chatgpt.com"], ["ex_claude", "claude.ai"], ["ex_cf", "www.cloudflare.com"]].map(([id, host]) => [id, () => getT(`https://${host}/cdn-cgi/trace`).then(s => {
      const v = Object.fromEntries(s.split("\n").map(l => l.split("=")).filter(p => p.length === 2));
      return { ip: v.ip, cc: v.loc, note: [v.colo, v.warp && v.warp !== "off" ? "WARP" : ""].filter(Boolean).join(" · ") };
    })]),
  ];
  async function exits() {
    R.ex = {};
    await Promise.all(EXITS.map(async ([id, get]) => {
      let r = null;
      try { r = await get(); } catch (e) {}
      if (!r || !r.ip) { R.ex[id] = null; return na(id, "v_fail"); }
      R.ex[id] = r.ip;
      const cc = /^[A-Z]{2}$/.test(r.cc || "") && r.cc !== "XX" ? r.cc : null;
      row(id, flagged(cc, [r.ip, r.note].filter(Boolean).join(" · "), ipqsOf(r.ip)));
    }));
    R.exDone = true;
  }

  // the addresses this browser leaves by over IPv4 and over IPv6, from Cloudflare Radar's single-stack hosts
  async function stack() {
    const one = fam => getJ(`https://ipv${fam}-check-perf.radar.cloudflare.com/`).then(b => b.ip_address || null).catch(() => null);
    const [v4, v6] = await Promise.all([one(4), one(6)]);
    R.stack = [v4, v6].filter(Boolean);
    if (!v4 && !v6) return na("stack", "v_empty");
    const s = esc("IPv4 " + (v4 || "–") + " · IPv6 " + (v6 || "–"));
    row("stack", IPV6 ? `<span class="pa-t">${s}</span><a class="pa-go" href="${esc(inLang(IPV6))}" target="_blank" rel="noopener">${esc(t("go_ipv6"))}${EXT}</a>` : s);
  }

  // The DNS resolver: a name nobody looked up before goes to the visitor's resolver, and ip-api's name server tells
  // who asked (and the client subnet the resolver passed along, if any). Its answer names the country in English.
  const CC_ALIAS = { "Hong Kong": "HK", Macao: "MO", Macau: "MO", Taiwan: "TW", "South Korea": "KR", Russia: "RU", Vietnam: "VN", Turkey: "TR", "Türkiye": "TR",
    Czechia: "CZ", "The Netherlands": "NL", Netherlands: "NL", "United States": "US", "United Kingdom": "GB" };
  let EN_CC;
  function ccOfName(name) {
    if (CC_ALIAS[name]) return CC_ALIAS[name];
    if (!EN_CC) {
      EN_CC = {};
      try {
        const en = new Intl.DisplayNames(["en"], { type: "region" }), A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (const x of A) for (const y of A) { const c = x + y, n = en.of(c); if (n && n !== c) EN_CC[n] = c; }
      } catch (e) {}
    }
    return EN_CC[name] || null;
  }
  async function dnsResolver() {
    const id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join("");
    let j;
    try { j = await getJ(`https://${id}.edns.ip-api.com/json`, 6000); } catch (e) { R.dnsCC = null; return na("dns", "v_fail"); }
    const d = j.dns || {}, geo = String(d.geo || ""), parts = geo.split(" - "), cname = parts[0].trim();
    R.dnsCC = ccOfName(cname); R.dnsOrg = parts.slice(1).join(" - ").trim();
    const ecs = j.edns && j.edns.ip ? "ECS " + j.edns.ip : "";
    row("dns", flagged(R.dnsCC, [d.ip, R.dnsOrg || cname, ecs].filter(Boolean).join(" · ")), { why: [d.ip, geo, ecs].filter(Boolean).join("\n") });
  }

  // Cloudflare's own trace on this domain: the key exchange (post-quantum or not), encrypted ClientHello, WARP
  async function trace() {
    const s = await getT("/cdn-cgi/trace").catch(() => "");
    const v = Object.fromEntries(s.split("\n").map(l => l.split("=")).filter(p => p.length === 2));
    R.tr = v;
    if (!v.kex && !v.warp) { na("kex"); na("warp"); return; }
    if (v.kex) txt("kex", v.kex + (/MLKEM|Kyber/i.test(v.kex) ? " · " + t("kex_pq") : "") + " · ECH " + t(v.sni === "encrypted" ? "v_on" : "v_off")); else na("kex");
    txt("warp", "WARP " + (v.warp || "–") + " · Gateway " + (v.gateway || "–"));
  }

  // Whether this browser reaches the site over HTTP/3: the page's own request often comes over TCP (the browser
  // learns from that first answer that the site speaks HTTP/3), so the trace is asked again a few times, a moment
  // apart, until one comes over QUIC
  async function http3() {
    R.http = [];
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 700));
      const s = await getT("/cdn-cgi/trace").catch(() => "");
      const m = s.match(/^http=(.+)$/m);
      if (m) R.http.push(m[1].trim());
      if (m && /^http\/3$/i.test(m[1].trim())) break;
    }
  }

  async function webgpu() {
    if (!navigator.gpu) return na("webgpu");
    const ad = await within(navigator.gpu.requestAdapter(), 2000, null);
    if (!ad) return na("webgpu", "v_empty");
    const i = ad.info || (ad.requestAdapterInfo ? await within(ad.requestAdapterInfo(), 1000, {}) : {});
    const s = [i.vendor, i.architecture, i.device, i.description].filter(Boolean).join(" · ");
    if (s) txt("webgpu", s); else na("webgpu", "v_empty");
  }

  // the display's refresh rate, from the time between animation frames
  async function refresh() {
    const ts = await within(new Promise(res => { const a = []; const f = x => { a.push(x); if (a.length < 40) requestAnimationFrame(f); else res(a); }; requestAnimationFrame(f); }), 2000, null);
    if (!ts) return na("hz");
    const d = ts.slice(1).map((x, i) => x - ts[i]).sort((x, y) => x - y), hz = 1000 / d[d.length >> 1];
    const near = [24, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240, 360].reduce((b, x) => Math.abs(x - hz) < Math.abs(b - hz) ? x : b);
    txt("hz", t("hz_v", { n: Math.abs(near - hz) < 4 ? near : Math.round(hz) }));
  }

  function screens() {
    const ext = screen.isExtended;
    txt("screens", (ext == null ? t("v_unsup") : t(ext ? "scr_multi" : "scr_single")) + " · " + t("win_at", { x: screenX, y: screenY }));
  }

  function codecs() {
    const v = document.createElement("video");
    const ok = type => { try { return window.MediaSource && MediaSource.isTypeSupported ? MediaSource.isTypeSupported(type) : !!v.canPlayType(type); } catch (e) { return false; } };
    const L = [["H.264", 'video/mp4; codecs="avc1.42E01E"'], ["VP9", 'video/webm; codecs="vp9"'], ["AV1", 'video/mp4; codecs="av01.0.05M.08"'],
      ["HEVC", 'video/mp4; codecs="hvc1.1.6.L93.B0"'], ["Dolby Vision", 'video/mp4; codecs="dvh1.05.06"'], ["E-AC-3", 'audio/mp4; codecs="ec-3"']];
    const yes = L.filter(([, ty]) => ok(ty)).map(([n]) => n);
    if (yes.length) txt("codecs", yes.join(" · ")); else na("codecs", "v_empty");
  }

  // DRM systems the browser can use; Firefox asks the visitor before it turns DRM on, so it isn't asked there
  async function drm() {
    if (!navigator.requestMediaKeySystemAccess || /Firefox\//.test(navigator.userAgent)) return na("drm");
    const cfg = [{ initDataTypes: ["cenc"], videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }] }];
    const L = [["Widevine", "com.widevine.alpha"], ["PlayReady", "com.microsoft.playready.recommendation"], ["FairPlay", "com.apple.fps"], ["ClearKey", "org.w3.clearkey"]];
    const r = await Promise.all(L.map(([n, ks]) => within(navigator.requestMediaKeySystemAccess(ks, cfg).then(() => n, () => null), 2000, null)));
    const yes = r.filter(Boolean);
    if (yes.length) txt("drm", yes.join(" · ")); else na("drm", "v_empty");
  }

  // what this site may already use: granted, blocked or still to be asked (a query never asks)
  async function perms() {
    if (!navigator.permissions) return na("perms");
    const L = [["geolocation", "perm_geo"], ["notifications", "perm_notif"], ["camera", "perm_cam"], ["microphone", "perm_mic"]];
    const r = await Promise.all(L.map(([p, k]) => navigator.permissions.query({ name: p }).then(s => t(k) + " " + t("ps_" + s.state), () => null)));
    const s = r.filter(Boolean);
    if (s.length) txt("perms", s.join(" · ")); else na("perms");
  }

  // Extensions that leave a mark any page can see: crypto wallets announce themselves to the page, developer tools
  // install a global hook, some extensions tag the document. Read a moment after load, when they have run.
  async function extensions() {
    await new Promise(r => setTimeout(r, 1200));
    const w = window, d = document.documentElement, b = document.body, q = s => { try { return !!document.querySelector(s); } catch (e) { return false; } };
    const found = [], eth = w.ethereum;
    if (eth) found.push(["crypto", eth.isRabby ? "Rabby" : eth.isCoinbaseWallet ? "Coinbase Wallet" : eth.isBraveWallet ? "Brave Wallet" : eth.isOkxWallet || w.okxwallet ? "OKX Wallet"
      : eth.isTrust ? "Trust Wallet" : eth.isTokenPocket ? "TokenPocket" : eth.isMetaMask ? "MetaMask" : "Ethereum wallet"]);
    else if (w.okxwallet) found.push(["crypto", "OKX Wallet"]);
    if (w.phantom || (w.solana && w.solana.isPhantom)) found.push(["crypto", "Phantom"]);
    if (w.tronLink || w.tronWeb) found.push(["crypto", "TronLink"]);
    if (w.__REACT_DEVTOOLS_GLOBAL_HOOK__) found.push(["dev", "React DevTools"]);
    if (w.__VUE_DEVTOOLS_GLOBAL_HOOK__) found.push(["dev", "Vue DevTools"]);
    if (w.__REDUX_DEVTOOLS_EXTENSION__) found.push(["dev", "Redux DevTools"]);
    if (b.hasAttribute("data-gr-ext-installed") || b.hasAttribute("data-new-gr-c-s-check-loaded")) found.push(["", "Grammarly"]);
    if (d.hasAttribute("data-darkreader-mode") || d.hasAttribute("data-darkreader-scheme") || q('meta[name="darkreader"]')) found.push(["", "Dark Reader"]);
    if (q('[id*="immersive-translate"],[class*="immersive-translate"]') || d.hasAttribute("imt-state")) found.push(["", "Immersive Translate"]);
    R.ext = found;
    if (found.length) txt("ext", found.map(([, n]) => n).join(" · ")); else txt("ext", t("ext_none"), { na: true });
  }

  /* ---------- the portrait: what the paragraph, the ID card and a shared link are drawn from ---------- */
  // Language-neutral, so a shared link reads in its viewer's language. The local view adds tooltips (X) that a shared
  // one leaves out, and a shared one has no address, no city and no addresses in the checks.
  const allExits = () => R.exDone && R.stack && R.srv
    ? [["ip", R.srv.ip], ...EXITS.map(([id]) => [id, R.ex[id]]), ...R.stack.map(ip => ["stack", ip])].filter(([, ip]) => ip)
    : null;
  function jobsOf() {
    const out = [...fontHints(R.fonts || [], R.dev && R.dev.os), ...(R.ext || []).filter(([k]) => k)];
    return out.filter(([k], i) => out.findIndex(([x]) => x === k) === i);
  }
  function portrait() {
    const c = (R.srv && R.srv.cf) || {}, d = R.dev || {};
    const nat = nationality({ langs: R.langs, tz: R.tz, ipcc: c.country });
    const ex = allExits(), split = ex && splitOf(ex);
    return { v: 1, nat: nat ? nat.cc : null, natFrom: nat ? nat.from : null, cc: c.country || null, city: c.city || null, langs: R.langs || [],
      tz: R.tz || null, h12: !!R.h12, os: R.osTxt || null, kind: d.kind || null, model: d.model || null, browser: R.browser || null,
      screen: R.screen || null, gpu: R.gpu || null, org: c.asOrganization ? shortOrg(c.asOrganization) : c.asn ? "AS" + c.asn : null, asn: c.asn ?? null,
      nt: split ? "split" : c.asn == null ? null : isDataCenter(c.asn, c.asOrganization) ? "dc" : "home", nx: split ? split.n : 0,
      dns: R.dnsCC || null, dark: !!R.dark, ab: !!R.adblock, jobs: jobsOf(), fp: R.fp || null, rand: !!R.rand,
      x: { split, fullOrg: [c.asn ? "AS" + c.asn : "", c.asOrganization].filter(Boolean).join(" · "), dnsOrg: R.dnsOrg || "", fpHex: R.fpHex } };
  }

  /* ---------- the fingerprint ID card ---------- */
  function fpArt(hex) {
    const by = i => parseInt(hex.substr((i * 2) % hex.length, 2), 16);
    const pt = (r, deg) => { const t = (deg - 90) * Math.PI / 180; return (32 + r * Math.cos(t)).toFixed(2) + " " + (32 + r * Math.sin(t)).toFixed(2); };
    let d = "", k = 0;
    for (let i = 0; i < 7; i++) {
      const r = 6 + i * 3.9, parts = 1 + (by(k++) % 3), turn = 360 / parts;
      for (let p = 0; p < parts; p++) {
        const s = p * turn + (by(k++) / 255) * turn * 0.5, len = turn * (0.45 + (by(k++) / 255) * 0.45);
        d += `M${pt(r, s)}A${r} ${r} 0 ${len > 180 ? 1 : 0} 1 ${pt(r, s + len)}`;
      }
    }
    return `<circle cx="32" cy="32" r="2.2"/><path d="${d}"/>`;
  }
  // "3 days ago", in the page's language
  function ago(ts) {
    const s = Math.max(1, (Date.now() - ts) / 1000);
    const [n, u] = s < 60 ? [s, "second"] : s < 3600 ? [s / 60, "minute"] : s < 86400 ? [s / 3600, "hour"] : s < 2592000 ? [s / 86400, "day"] : s < 31536000 ? [s / 2592000, "month"] : [s / 31536000, "year"];
    try { return new Intl.RelativeTimeFormat(LANG, { numeric: "auto" }).format(-Math.floor(n), u); } catch (e) { return Math.floor(n) + " " + u; }
  }
  // The visit before this one, kept in this browser only: was the fingerprint the same? That is how a site that
  // never set a cookie still knows you came back.
  function returnVisit(P) {
    let last = null;
    try { last = JSON.parse(store.get(K.last) || "null"); } catch (e) {}
    const where = P.city || (P.cc ? country(P.cc) : "");
    store.set(K.last, JSON.stringify({ at: Date.now(), fp: P.rand ? null : P.fp, where }));
    $("#forget").hidden = false;
    if (P.rand) return t("rv_rand");
    if (!last || !last.at) return t("rv_first");
    return t(last.fp === P.fp ? "rv_same" : "rv_diff", { ago: ago(last.at), where: last.where || "?" });
  }
  $("#forget").onclick = () => { try { localStorage.removeItem(K.last); } catch (e) {} $("#fpRet").textContent = t("rv_forgot"); $("#forget").hidden = true; };
  function idCard(P, shared) {
    $("#fpId").textContent = P.rand ? t("fp_rand") : P.fp || t("masked");
    $("#fpNote").textContent = t(shared ? "sh_fp" : P.rand ? "id_note_rand" : "id_note");
    $("#fpArt").innerHTML = P.rand || !P.x.fpHex ? "" : fpArt(P.x.fpHex);
    $("#idc").classList.toggle("rand", !!P.rand);
    $("#fpRet").textContent = shared ? " " : returnVisit(P);
  }

  /* ---------- the paragraph ---------- */
  const BL = Object.fromEntries($$("#story .bl[data-b]").map(b => [b.dataset.b, b]));
  const rowName = id => t("s_" + id);
  // a destination in the exits: the page's own request is "this site"
  const exitName = id => id === "ip" ? t("ex_self") : rowName(id);
  function blank(k, html, from = BLANKS[k], why) {
    const b = BL[k]; if (!b) return;
    b.innerHTML = html; b.classList.remove("wait");
    b.dataset.from = from.join(" ");
    b.dataset.why = why || (from.length ? t("from", { list: list(from.map(rowName)) }) : "");
    b.tabIndex = 0;
  }
  function tzLabel(tz) {
    try { return new Intl.DateTimeFormat(LANG, { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date()).find(x => x.type === "timeZoneName").value; } catch (e) { return tz; }
  }
  function paint(P, shared) {
    const X = P.x || {}, U = esc(t("v_unknown"));
    blank("nat", P.nat ? flagged(P.nat, country(P.nat)) : U, P.natFrom || BLANKS.nat);
    blank("city", shared && !P.city ? esc(t("masked")) : P.cc ? flagged(P.cc, [P.city, country(P.cc)].filter(Boolean).join(", ")) : U, BLANKS.city, shared ? t("masked_why") : "");
    BL.city.classList.toggle("hid", shared && !P.city);
    BL.isp.classList.toggle("hid", shared && !P.org);
    blank("lang", P.langs.length ? esc(language(P.langs[0])) : U, BLANKS.lang, P.langs.map(language).join(", "));
    blank("tz", P.tz ? esc(tzLabel(P.tz)) : U, BLANKS.tz, P.tz || "");
    blank("clock", esc(t(P.h12 ? "ck_12" : "ck_24")));
    blank("device", esc(!P.os ? t("dv_unknown") : (P.kind === "phone" || P.kind === "tablet") && P.model ? t("dv_model", { model: P.model, os: P.os }) : t("dv_" + (P.kind || "pc"), { os: P.os })));
    blank("browser", P.browser ? esc(P.browser) : U);
    blank("screen", P.screen ? esc(P.screen) : U);
    blank("gpu", esc(P.gpu || t("gpu_unknown")));
    blank("isp", P.org ? (!shared && asnOf(P.asn) ? `<a href="${esc(asnOf(P.asn))}" target="_blank" rel="noopener" title="${esc(t("go_asn"))}">${esc(P.org)}</a>` : esc(P.org)) : shared ? esc(t("masked")) : U, BLANKS.isp, X.fullOrg || (shared && !P.org ? t("masked_why") : ""));
    blank("dns", P.dns ? flagged(P.dns, country(P.dns)) : U, BLANKS.dns, X.dnsOrg || "");
    const sp = X.split;
    blank("nettype", esc(P.nt === "split" ? t("nt_split", { n: P.nx }) : P.nt ? t("nt_" + P.nt) : t("v_unknown")),
      BLANKS.nettype, sp ? exitName(sp.a) + ": " + sp.ipA + "\n" + exitName(sp.b) + ": " + sp.ipB : "");
    blank("age", esc(t("age_v")), [], t("age_why"));
    blank("theme", esc(t(P.dark ? "pt_dark" : "pt_light")));
    blank("adblock", esc(t(P.ab ? "pt_ab" : "pt_noab")));
    blank("job", esc(P.jobs.length ? list(P.jobs.map(([k]) => t("jb_" + k))) : t("jb_none")), BLANKS.job, P.jobs.length ? t("from", { list: P.jobs.map(([, f]) => f).join(", ") }) : "");
    $("#story").classList.remove("wait"); $("#storySk").hidden = true;
    idCard(P, shared);
  }

  /* ---------- the disguise checks ---------- */
  const CK = Object.fromEntries($$(".ckr[data-c]").map(r => [r.dataset.c, r]));
  // a check's result as text: [level, key, vars]; ipc: the address's country
  function ckText(id, [, key, vars], ipc) {
    const vv = Object.fromEntries(Object.entries(vars).map(([k, x]) => [k, k === "cc" ? country(x) : id === "split" ? exitName(x) : x]));
    if (id === "tz" || id === "lang" || id === "dns") vv.ipc = ipc ? country(ipc) : "?";
    // each side as its zone's name with the offset ("Pacific Time UTC-08:00"), or the offset alone
    if (id === "tz") { vv.A = zoneLabel(vars.za, vars.a, ipc); vv.B = zoneLabel(vars.zb, vars.b); }
    return t(key, vv);
  }
  // res: check id → [level, key, vars]; ipc: the address's country
  function paintChecks(res, ipc, final) {
    let bad = 0, warn = 0;
    for (const id of [...CHECKS, ...PROTO]) {
      const r = CK[id], v = res[id];
      if (!v) continue;
      const [lv] = v;
      if (CHECKS.includes(id)) { if (lv === "bad") bad++; if (lv === "warn") warn++; }
      r.className = "ckr st-" + lv;
      const sg = $(`#segs [data-c="${id}"]`); if (sg) sg.className = "st-" + lv;
      // the whole text on hover only when two lines cut it short; otherwise it would just repeat the row
      const cv = r.querySelector(".ck-v"); cv.textContent = ckText(id, v, ipc);
      if (cv.scrollHeight > cv.clientHeight + 1) r.dataset.why = cv.textContent; else delete r.dataset.why;
      r.querySelector(".st").textContent = lv === "ok" ? "✓" : lv === "info" ? "i" : "!";
      if (D.focus && D.focus.check === id) {
        const fv = $("#focusV"); fv.className = "focus-v st-" + lv;
        fv.querySelector("b").textContent = cv.textContent; fv.querySelector(".st").textContent = r.querySelector(".st").textContent;
      }
      // a check that gives you away says how to fix it
      r.querySelector(".ck-fix").hidden = lv !== "bad" && lv !== "warn";
      const go = r.querySelector(".ck-go");
      if (go) {
        // only when the check gives you away
        const href = id === "dns" ? DNSTEST && inLang(DNSTEST) : id === "dc" ? ipqsOf(R && R.srv && R.srv.ip) : EGRESS && inLang(EGRESS);
        go.hidden = !href || (lv !== "bad" && lv !== "warn"); if (href) go.href = href;
      }
    }
    if (!final) return;
    // a portrait shared before the protocols were judged has none: their rows step aside
    $("#protoBox").hidden = !PROTO.some(id => res[id]);
    const n = bad + warn;
    $("#vHead").textContent = n ? t("v_found", { n }) : t("v_clean");
    $("#vText").textContent = t(n ? "v_found_d" : "v_clean_d");
    $("#vHead").className = "v-h" + (bad ? " bad" : warn ? " warn" : " ok");
    $("#mNum").textContent = n; $("#mNum").className = "m-num " + (bad ? "bad" : warn ? "warn" : "ok");
  }
  $$(".ck-fix").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const tip = btn.closest(".ckr").querySelector(".ck-tip"), open = tip.hidden;
      tip.hidden = !open; btn.setAttribute("aria-expanded", open);
    };
  });
  function judge(final) {
    const c = (R.srv && R.srv.cf) || {};
    const res = checks({
      tz: R.tz, tzOff: R.tzOff == null ? null : offTxt(R.tzOff), ipTzOff: c.timezone ? offTxt(tzOffset(c.timezone)) : null, ipTz: c.timezone || null, ipcc: c.country,
      langs: R.langs, dnsCC: R.dnsCC, exits: allExits(), rtc: R.rtc, ip: R.srv && R.srv.ip, asn: c.asn, org: c.asOrganization && shortOrg(c.asOrganization),
      uaOS: R.dev && R.dev.os, real: !!R.dev, hintOS: R.hi && R.hi.platform, gpuOS: gpuOS(R.gpuRaw), rand: R.rand, webdriver: R.webdriver,
    });
    if (res.dc === null && R.srv && !c.asn) res.dc = ["info", "c_na", {}];
    const tr = R.tr || {};
    Object.assign(res, protocols({ http: R.http && R.h3done ? [c.httpProtocol, ...R.http].filter(Boolean) : null, rtc: R.rtc, br: R.br,
      sni: tr.sni, kex: tr.kex, warp: tr.warp, gateway: tr.gateway }));
    // at the end, a protocol nothing could be read for (no trace: blocked, or not behind Cloudflare) says so
    if (final) for (const id of PROTO) if (!res[id]) res[id] = ["info", "c_na", {}];
    R.ck = res;
    paintChecks(res, c.country, final);
  }

  /* ---------- sharing: 1ms.dog's share dialog (/assets/share/), with a link and a card drawn here ---------- */
  // Neither carries the address or the fingerprint (the very thing that would let anyone follow the sharer); the city
  // and the network only when the sharer ticks the dialog's box. Addresses in the checks are cut to their network.
  const maskIp = ip => ip.includes(":") ? ip.split(":").slice(0, 2).join(":") + ":…" : ip.split(".").slice(0, 2).join(".") + ".•.•";
  function sharedPortrait(show) {
    const P = portrait();
    delete P.x; delete P.fp;
    if (!show) { P.city = null; P.org = null; }
    delete P.asn;
    P.l = LANG;
    P.ck = Object.fromEntries(Object.entries(R.ck || {}).filter(([, v]) => v).map(([id, [lv, key, vars]]) =>
      [id, [lv, key, Object.fromEntries(Object.entries(vars).map(([k, x]) => [k, k === "ip" ? maskIp(String(x)) : k === "org" && !show ? t("masked") : k === "za" && !show ? null : x]))]]));
    return P;
  }

  // The card's middle: the paragraph as the page shows it (masked blanks stay masked), then the count with every
  // check. Laid out once to measure the height and once to paint, in the page's theme colors.
  function cardBody(c, kit, paint) {
    const { W, P, F, v } = kit, show = kit.show, FG = v("fg"), MUT = v("muted"), INK = v("ink"), LINE = v("line");
    const LV = { ok: v("t1"), warn: v("t3"), bad: v("t5"), info: MUT };
    // the paragraph as segments: [text, answer?]
    const lines = $$("#story p").map(p => [...p.childNodes].map(n => {
      if (n.nodeType === 3) return [n.textContent, false];
      const k = n.dataset && n.dataset.b;
      return [(k === "city" || k === "isp") && !show ? t("masked") : n.textContent, k !== "age"];
    }));
    const res = R.ck || {}, n = CHECKS.filter(id => res[id] && (res[id][0] === "bad" || res[id][0] === "warn")).length;
    c.textBaseline = "alphabetic"; c.textAlign = "left";
    let y = kit.top + 20;
    c.font = `800 52px ${F}`; c.fillStyle = FG; if (paint) c.fillText(t("card_me"), P, y); y += 40;
    // wrapped word by word (character by character for CJK)
    const size = 28, lh = 48;
    for (const segs of lines) {
      let x = P; y += lh;
      for (const [text, ans] of segs) {
        c.font = `${ans ? 700 : 400} ${size}px ${F}`;
        for (const tok of text.match(/[　-鿿가-힯＀-￯]|[^\s　-鿿가-힯＀-￯]+\s*|\s+/g) || []) {
          const w = c.measureText(tok).width;
          if (x + w > W - P && x > P) { x = P; y += lh; if (/^\s+$/.test(tok)) continue; }
          if (paint) {
            if (ans) { c.globalAlpha = .3; c.fillStyle = INK; c.fillRect(x, y + 6, w, 10); c.globalAlpha = 1; }
            c.fillStyle = ans ? FG : MUT; c.fillText(tok, x, y);
          }
          x += w;
        }
      }
      y += 10;
    }
    y += 40;
    if (paint) { c.fillStyle = LINE; c.fillRect(P, y, W - 2 * P, 2); }
    y += 70;
    c.font = `800 72px ${F}`; c.fillStyle = n ? (CHECKS.some(id => res[id] && res[id][0] === "bad") ? LV.bad : LV.warn) : LV.ok;
    if (paint) c.fillText(String(n), P, y);
    const nw = c.measureText(String(n)).width;
    c.font = `700 30px ${F}`; c.fillStyle = FG; if (paint) c.fillText(n ? t("v_found", { n }) : t("v_clean"), P + nw + 24, y - 14);
    y += 30;
    const colW = (W - 2 * P) / 2;
    if (paint) CHECKS.forEach((id, i) => {
      const r = res[id], cx = P + (i % 2) * colW, cy = y + 52 * Math.floor(i / 2) + 30;
      c.fillStyle = r ? LV[r[0]] : LV.info; c.beginPath(); c.arc(cx + 9, cy - 9, 9, 0, Math.PI * 2); c.fill();
      c.font = `500 25px ${F}`; c.fillStyle = FG; c.fillText(t("c_" + id), cx + 30, cy);
    });
    return y + 52 * Math.ceil(CHECKS.length / 2);
  }

  $("#share").onclick = async () => {
    const { share } = await import("/assets/share/share.js");
    const link = show => location.origin + linkPath(LANG, encode(sharedPortrait(show)));
    share({
      lang: LANG, name: t("app_name"), file: "who-1ms-dog", show: ["city", "isp"], never: ["ip"], ts: Date.now(),
      link, home: location.origin + (D.paths[LANG] || "/"), text: () => t("card_me"),
      height: (c, kit) => cardBody(c, kit, false) + 30 + 70,
      draw: (c, kit) => { cardBody(c, kit, true); },
      foot: () => [t("card_cta")],
    }).open();
  };

  // Someone else's portrait: from /r/<code> (or an older #p=<code> link), drawn from the link with nothing sniffed;
  // the sniffers card and the run controls step aside.
  function showShared(code) {
    const P = decode(code);
    if (!P) return false;
    P.langs = P.langs || []; P.jobs = P.jobs || []; P.x = {};
    document.documentElement.classList.add("shared");
    $(".eyebrow").lastChild.textContent = t("sh_eyebrow");
    $("#mine").hidden = false; $("#share").hidden = true; $("#rerun").hidden = true;
    $("#mine").onclick = () => { location.href = D.paths[LANG] || "/"; };
    $("#progTxt").textContent = " ";
    paint(P, true);
    paintChecks(P.ck || {}, P.cc, true);
    return true;
  }
  const sharedCode = (parsePath(location.pathname) || {}).code || (/^#p=/.test(location.hash) ? location.hash.slice(3) : null);

  /* ---------- a run ---------- */
  async function run() {
    const g = ++gen;
    R = {}; done = new Set();
    for (const r of Object.values(PR)) { r.classList.add("wait"); r.classList.remove("na"); r.querySelector(".pa").textContent = "…"; delete r.dataset.why; }
    for (const r of Object.values(FR)) { r.classList.remove("na"); r.querySelector("b").textContent = "…"; }
    if ($("#focusV")) { $("#focusV").className = "focus-v"; $("#focusV b").innerHTML = '<i class="skl"></i>'; $("#focusV .st").textContent = ""; }
    // the paragraph stays invisible (its skeleton on top) until every blank is in, so its text never reflows on screen
    $("#story").classList.add("wait"); $("#storySk").hidden = false;
    for (const b of Object.values(BL)) { b.classList.add("wait"); b.innerHTML = '<i class="skl"></i>'; delete b.dataset.why; b.removeAttribute("tabindex"); }
    for (const r of Object.values(CK)) {
      r.className = "ckr"; delete r.dataset.why; r.querySelector(".ck-v").innerHTML = '<i class="skl"></i>'; r.querySelector(".st").textContent = "";
      r.querySelector(".ck-fix").hidden = true; r.querySelector(".ck-tip").hidden = true;
      const go = r.querySelector(".ck-go"); if (go) go.hidden = true;
    }
    $("#vHead").textContent = t("checking"); $("#vHead").className = "v-h";
    $("#mNum").textContent = "–"; $("#mNum").className = "m-num"; $$("#segs i").forEach(i => { i.className = ""; });
    $("#fpId").innerHTML = '<i class="skl"></i>'; $("#fpArt").innerHTML = ""; $("#fpNote").textContent = t("id_note"); $("#vText").innerHTML = "&nbsp;";
    $("#rerun").disabled = true; $("#share").disabled = true; progress();

    referrer(); locale(); prefs();
    const glInfo = gpu();
    fonts();
    const rtc = webrtc().then(() => g === gen && judge(false));
    const h3 = http3().then(() => { R.h3done = true; });
    // the page's own request, and the probes that ask other sites who you are
    const srv = server(), probes = [guard("stack", stack), guard(EXITS.map(([id]) => id), exits), guard("dns", () => dnsResolver().catch(e => { R.dnsCC = null; throw e; }))];
    // Embedded, a run with no answer from this site's server, or none from any other site (an ad blocker drops the
    // probes all together, at once), has nothing to report: say so as soon as that's clear, not when the slowest
    // sniffer gives up
    if (EMBED) {
      srv.then(() => { if (g === gen && !R.srv.ip) fail(); });
      Promise.all(probes).then(() => { if (g === gen && !R.dnsCC && !(R.stack || []).length && !Object.values(R.ex || {}).some(Boolean)) fail(); });
    }
    await Promise.all([
      srv, guard("kbd", keyboard), guard("voices", voices), guard(["os", "browser", "arch", "screen", "cpu", "mem", "touch", "conn"], hardware),
      guard("battery", battery), guard("media", media), guard("storage", storage), guard("adblock", adblock), guard("ext", extensions),
      guard(["canvas", "audio", "fontfp", "rand", "fpid"], () => prints(glInfo)),
      ...probes, guard(["kex", "warp"], trace),
      guard("webgpu", webgpu), guard("hz", refresh), guard("screens", screens), guard("codecs", codecs), guard("drm", drm), guard("perms", perms),
    ]);
    if (g !== gen) return;
    paint(portrait(), false); judge(false);
    await rtc; await h3;
    if (g !== gen) return;
    for (const id of Object.keys(PR)) if (!done.has(id)) na(id);   // anything a sniffer couldn't reach
    judge(true);
    $("#rerun").disabled = false; $("#share").disabled = false;
    if (EMBED && !failed) post(embedResult());
  }

  // The result for the report page: the headline and checks as the page shows them, the link a share would give
  // (without city and network, the share box's default), and facts for its cross-tool rules. Addresses in the
  // findings are cut to their network, as in a shared link.
  function embedResult() {
    const c = (R.srv && R.srv.cf) || {}, ck = R.ck || {}, P = sharedPortrait(false), lv = id => ck[id] && ck[id][0];
    const found = CHECKS.filter(id => ck[id] && (ck[id][0] === "bad" || ck[id][0] === "warn")).length;
    const RANK = { bad: 0, warn: 1, ok: 2 };
    const findings = [...CHECKS, ...PROTO].filter(id => P.ck[id] && P.ck[id][0] in RANK).sort((a, b) => RANK[P.ck[a][0]] - RANK[P.ck[b][0]]).slice(0, 4)
      .map(id => ({ level: P.ck[id][0], text: t("c_" + id) + " · " + ckText(id, P.ck[id], c.country) }));
    const stats = [{ label: t("h_checks"), value: found + " / " + CHECKS.length }];
    if (c.country) stats.push({ label: t("s_geo"), value: country(c.country) });
    if (R.dnsCC) stats.push({ label: t("s_dns"), value: country(R.dnsCC) });
    const facts = { problems: found };
    if (c.country) facts.ipCountry = c.country;
    if (ck.tz) facts.tzMismatch = lv("tz") === "bad";                    // another country's zone; one of the same country is only a warning
    if (ck.lang && lv("lang") !== "info") facts.langMismatch = lv("lang") !== "ok";
    if (ck.webrtc) facts.webrtcLeak = lv("webrtc") === "bad";
    if (R.dnsCC) facts.dnsCountry = R.dnsCC;
    if (ck.dc && lv("dc") !== "info") facts.dc = lv("dc") !== "ok";
    if (ck.fp) facts.fpSame = ck.fp[1] === "c_fp_same";
    // HTTP/3 true once seen, false when UDP gets out nowhere, left out when there's no telling
    if (ck.h3 && (lv("h3") === "ok" || lv("h3") === "warn")) facts.h3 = lv("h3") === "ok";
    if (ck.ech) facts.ech = lv("ech") === "ok";
    if (ck.pq) facts.pq = lv("pq") === "ok";
    if (ck.warp) facts.warp = ck.warp[1] === "c_warp_on";
    return { type: "result", lang: LANG, path: linkPath(LANG, encode(P)), grade: null, score: null, headline: $("#vHead").textContent, stats, findings, facts };
  }
  // the report page sizes the frame to the content
  if (EMBED && window.ResizeObserver) {
    let h = 0;
    new ResizeObserver(() => { const n = Math.ceil($(".app").getBoundingClientRect().height); if (n !== h) post({ type: "size", height: h = n }); }).observe($(".app"));
  }

  $("#rerun").onclick = run;
  const shared = !EMBED && sharedCode && showShared(sharedCode);
  if (!shared) run();
})();
