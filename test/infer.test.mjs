// What the readings are taken to mean: system and browser, graphics card, keyboard, network, nationality, checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { langCC, nationality, device, browser, gpuName, gpuOS, kbdLayout, isDataCenter, fontHints, checks, protocols, offTxt, splitOf, netOf } from "../src/infer.mjs";

const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const MAC_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0";

test("language tags point at countries only when they can", () => {
  assert.equal(langCC("zh-CN"), "CN");
  assert.equal(langCC("zh-Hant"), "TW");
  assert.equal(langCC("pt-BR"), "BR");
  assert.equal(langCC("ja"), "JP");
  assert.equal(langCC("es"), null);
  assert.equal(langCC("zh-Hans-CN"), "CN");
});

test("nationality: the language first, plain English defers to the time zone", () => {
  assert.deepEqual(nationality({ langs: ["zh-CN"], tz: "Asia/Shanghai", ipcc: "JP" }), { cc: "CN", from: ["langs", "tz"] });
  assert.deepEqual(nationality({ langs: ["en-US"], tz: "Europe/Berlin", ipcc: "US" }), { cc: "DE", from: ["tz"] });
  assert.deepEqual(nationality({ langs: ["ko"], tz: "America/Los_Angeles" }), { cc: "KR", from: ["langs"] });
  assert.deepEqual(nationality({ langs: ["en"], tz: "Etc/UTC", ipcc: "GB" }), { cc: "GB", from: ["geo"] });
});

test("system and kind of device", () => {
  assert.deepEqual(device(WIN, { platform: "Windows", platformVersion: "19.0.0" }), { os: "Windows", osv: "11", kind: "pc", model: "" });
  assert.deepEqual(device(WIN, { platform: "Windows", platformVersion: "10.0.0" }).osv, "10");
  assert.equal(device(WIN).osv, "10/11");
  assert.deepEqual(device(MAC_SAFARI), { os: "macOS", osv: "10.15", kind: "mac", model: "" });
  assert.equal(device(MAC_SAFARI, { platform: "macOS", platformVersion: "15.1.0" }).osv, "15.1");
  assert.deepEqual(device(IPHONE), { os: "iOS", osv: "18.1", kind: "phone", model: "iPhone" });
  assert.equal(device(MAC_SAFARI, {}, 5).os, "iPadOS");   // iPads ask for the desktop site
  assert.deepEqual(device(ANDROID, { platform: "Android", platformVersion: "15.0.0", model: "Pixel 8", mobile: true }), { os: "Android", osv: "15", kind: "phone", model: "Pixel 8" });
  assert.equal(device(FIREFOX).os, "Linux");
});

test("browser and version", () => {
  assert.deepEqual(browser(WIN, [{ brand: "Not)A;Brand", version: "8" }, { brand: "Chromium", version: "142" }, { brand: "Google Chrome", version: "142.0.7444.60" }]), { name: "Chrome", v: "142" });
  assert.deepEqual(browser(WIN, [{ brand: "Chromium", version: "142" }, { brand: "Microsoft Edge", version: "142.0.1" }, { brand: "Not_A Brand", version: "99" }]), { name: "Edge", v: "142" });
  assert.deepEqual(browser(MAC_SAFARI), { name: "Safari", v: "18" });
  assert.deepEqual(browser(FIREFOX), { name: "Firefox", v: "144" });
});

test("graphics card names and the system they give away", () => {
  assert.equal(gpuName("ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "NVIDIA GeForce RTX 4080 SUPER");
  assert.equal(gpuName("ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)"), "Apple M2");
  assert.equal(gpuName("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)"), "Intel UHD Graphics 620");
  assert.equal(gpuName("Apple GPU"), "Apple GPU");
  assert.equal(gpuName(""), null);
  assert.equal(gpuOS("ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "Windows");
  assert.equal(gpuOS("Adreno (TM) 740"), "Android");
  assert.equal(gpuOS("Mesa Intel(R) UHD Graphics 620"), null);
});

test("keyboard layouts", () => {
  const m = o => new Map(Object.entries(o));
  assert.equal(kbdLayout(m({ KeyQ: "q", KeyW: "w", KeyY: "y", KeyZ: "z" })), "QWERTY");
  assert.equal(kbdLayout(m({ KeyQ: "a", KeyW: "z", KeyY: "y", KeyZ: "w" })), "AZERTY");
  assert.equal(kbdLayout(m({ KeyQ: "q", KeyW: "w", KeyY: "z", KeyZ: "y" })), "QWERTZ");
  assert.equal(kbdLayout(m({ KeyQ: "й", KeyW: "ц" })), "ЙЦУКЕН");
  assert.equal(kbdLayout(new Map()), null);
});

test("data center networks", () => {
  assert.ok(isDataCenter(16509, "Amazon.com, Inc."));
  assert.ok(isDataCenter(999999, "Some Hosting Ltd"));
  assert.ok(isDataCenter(45102, "Alibaba Cloud (Singapore) Private Limited"));
  assert.ok(!isDataCenter(4134, "Chinanet"));
  assert.ok(!isDataCenter(7922, "Comcast Cable Communications, LLC"));
});

test("fonts: only ones the system doesn't bring say something", () => {
  assert.deepEqual(fontHints(["Segoe UI", "Calibri", "Cascadia Code"], "Windows"), []);
  assert.deepEqual(fontHints(["Calibri", "JetBrains Mono"], "macOS"), [["dev", "JetBrains Mono"], ["office", "Calibri"]]);
  assert.deepEqual(fontHints(["Aptos", "Calibri"], "Windows"), [["office", "Aptos"]]);
});

test("disguise checks", () => {
  const base = { tz: "Asia/Shanghai", tzOff: "+08:00", ipTzOff: "+08:00", ipcc: "CN", langs: ["zh-CN"], rtc: ["1.2.3.4"], ip: "1.2.3.4",
    asn: 4134, org: "Chinanet", uaOS: "Windows", real: true, hintOS: "Windows", gpuOS: "Windows", rand: false, webdriver: false,
    dnsCC: "CN", exits: [["ip", "1.2.3.4"], ["ex_cn", "1.2.3.4"]] };
  const c = checks(base);
  assert.deepEqual(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v[0]])), { tz: "ok", lang: "ok", dns: "ok", split: "ok", webrtc: "ok", dc: "ok", ua: "ok", fp: "warn", bot: "ok" });
  // through a VPN in Japan
  const v = checks({ ...base, ipTzOff: "+09:00", ipcc: "JP", asn: 16509, org: "Amazon.com, Inc.", rtc: ["1.2.3.4", "5.6.7.8"], ip: "5.6.7.8" });
  assert.equal(v.tz[0], "bad"); assert.equal(v.lang[0], "warn"); assert.equal(v.dc[0], "warn"); assert.equal(v.webrtc[0], "bad");
  assert.deepEqual(v.webrtc[2], { ip: "1.2.3.4" });
  assert.deepEqual(v.tz, ["bad", "c_tz_off", { a: "+09:00", b: "+08:00", za: null, zb: "Asia/Shanghai" }]);
  // another zone of the IP's own country only hints: New York against an address placed in Los Angeles
  const us = { ...base, tz: "America/New_York", tzOff: "-05:00", ipTz: "America/Los_Angeles", ipTzOff: "-08:00", ipcc: "US" };
  assert.deepEqual(checks(us).tz, ["warn", "c_tz_near", { a: "-08:00", b: "-05:00", za: "America/Los_Angeles", zb: "America/New_York" }]);
  assert.equal(checks({ ...base, tz: "Europe/Moscow", tzOff: "+03:00", ipTz: "Asia/Vladivostok", ipTzOff: "+10:00", ipcc: "RU" }).tz[0], "warn");
  // New York's clock behind an address in Japan is a contradiction; the same offset in another country is not
  assert.equal(checks({ ...us, ipTz: "Asia/Tokyo", ipTzOff: "+09:00", ipcc: "JP" }).tz[0], "bad");
  assert.equal(checks({ ...base, ipTz: "Asia/Singapore", ipcc: "SG" }).tz[0], "ok");
  // an IPv6 address next to an IPv4 page request is only a warning
  assert.equal(checks({ ...base, rtc: ["2001:db8::1", "1.2.3.4"] }).webrtc[0], "warn");
  // an IPv6 address this site sees too is no leak; one that differs from it is
  const v6 = [["ip", "1.2.3.4"], ["stack", "1.2.3.4"], ["stack", "2001:db8::1"]];
  assert.equal(checks({ ...base, exits: v6, rtc: ["2001:db8::1", "1.2.3.4"] }).webrtc[0], "ok");
  assert.deepEqual(checks({ ...base, exits: v6, rtc: ["2001:db8::9", "1.2.3.4"] }).webrtc, ["bad", "c_rtc_bad", { ip: "2001:db8::9" }]);
  // the IPv4 / IPv6 test went direct while the page went through the proxy: its addresses are the ones that leak
  assert.deepEqual(checks({ ...base, ip: "2406:da14::1", exits: [["ip", "2406:da14::1"], ["stack", "1.2.3.4"], ["stack", "2408:8207::1"]], rtc: ["1.2.3.4", "2408:8207::1"] }).webrtc, ["bad", "c_rtc_bad", { ip: "2408:8207::1" }]);
  // the address another destination sees (a rule-based proxy's direct route) still leaks to this site
  assert.equal(checks({ ...base, ip: "5.6.7.8", exits: [["ip", "5.6.7.8"], ["ex_cn", "1.2.3.4"]], rtc: ["1.2.3.4"] }).webrtc[0], "bad");
  assert.equal(checks({ ...base, rtc: false }).webrtc[1], "c_rtc_off");
  // a user agent that claims a Mac on a Direct3D card
  assert.deepEqual(checks({ ...base, uaOS: "macOS", hintOS: null }).ua, ["bad", "c_ua_bad", { a: "macOS", b: "Windows" }]);
  assert.equal(checks({ ...base, langs: ["en-US"] }).lang[0], "info");
  assert.equal(checks({ ...base, rand: true }).fp[0], "ok");
  assert.equal(checks({ ...base, webdriver: true }).bot[0], "bad");
  // still waiting
  assert.equal(checks({ ...base, rtc: undefined }).webrtc, null);
});

test("UTC offsets", () => {
  assert.equal(offTxt(480), "+08:00");
  assert.equal(offTxt(-210), "−03:30");
  assert.equal(offTxt(0), "+00:00");
});

test("split routing: different networks over the same IP version", () => {
  assert.equal(splitOf([["ip", "1.2.3.4"], ["ex_cn", "1.2.9.9"], ["stack", "2001:db8::1"]]), null);   // same /16, and IPv6 beside IPv4
  assert.deepEqual(splitOf([["ip", "45.76.1.1"], ["ex_cn", "114.254.73.157"], ["ex_gpt", "45.76.1.1"]]), { a: "ip", b: "ex_cn", ipA: "45.76.1.1", ipB: "114.254.73.157", n: 2 });
  assert.equal(netOf("2406:da14:3c2:6400:f4b7:e910:7738:7af1"), "2406:da14:03c2:6400");
  const base = { ipcc: "JP" };
  assert.equal(checks({ ...base, exits: [["ip", "1.1.1.1"], ["ex_cn", "8.8.8.8"]] }).split[0], "warn");
  assert.equal(checks({ ...base, exits: [["ip", "1.1.1.1"], ["ex_cn", "1.1.2.2"]] }).split[0], "ok");
  assert.equal(checks(base).split, null);
});

test("DNS leak: the resolver's country against the address's", () => {
  assert.equal(checks({ ipcc: "JP", dnsCC: "CN" }).dns[0], "bad");
  assert.equal(checks({ ipcc: "JP", dnsCC: "JP" }).dns[0], "ok");
  assert.equal(checks({ ipcc: "JP", dnsCC: null }).dns[0], "info");
  assert.equal(checks({ ipcc: "JP" }).dns, null);
});

test("protocols", () => {
  const chrome = { name: "Chrome", v: "141" }, lv = x => Object.fromEntries(Object.entries(protocols(x)).map(([k, v]) => [k, v && v[1]]));
  const base = { http: ["HTTP/2", "http/2"], rtc: ["1.2.3.4"], br: chrome, sni: "encrypted", kex: "X25519MLKEM768", warp: "off", gateway: "off" };
  assert.deepEqual(lv(base), { h3: "c_h3_wait", ech: "c_ech_ok", pq: "c_pq_ok", warp: "c_warp_off" });
  // HTTP/3 once is enough; never, with no UDP at all, is a blocked or uncarried UDP; without WebRTC, no telling
  assert.equal(protocols({ ...base, http: ["HTTP/2", "http/3"] }).h3[0], "ok");
  assert.equal(protocols({ ...base, http: ["HTTP/3"] }).h3[0], "ok");
  assert.deepEqual(protocols({ ...base, rtc: [] }).h3, ["warn", "c_h3_udp", {}]);
  assert.equal(protocols({ ...base, rtc: false }).h3[1], "c_h3_unk");
  assert.equal(protocols({ ...base, rtc: undefined }).h3, null);
  // ECH off: the likeliest reason by browser
  assert.equal(protocols({ ...base, sni: "plaintext" }).ech[1], "c_ech_dns");
  assert.equal(protocols({ ...base, sni: "plaintext", br: { name: "Firefox", v: "140" } }).ech[1], "c_ech_ff");
  assert.equal(protocols({ ...base, sni: "plaintext", br: { name: "Safari", v: "18" } }).ech[1], "c_ech_safari");
  // a classical key exchange from a browser that offers post-quantum by default: something in between
  assert.deepEqual(protocols({ ...base, kex: "X25519" }).pq, ["warn", "c_pq_mitm", { kex: "X25519", b: "Chrome 141" }]);
  assert.equal(protocols({ ...base, kex: "X25519", br: { name: "Chrome", v: "110" } }).pq[1], "c_pq_old");
  assert.equal(protocols({ ...base, kex: "X25519", br: { name: "Safari", v: "18" } }).pq[1], "c_pq_old");
  assert.equal(protocols({ ...base, kex: "X25519", br: { name: "Firefox", v: "135" } }).pq[1], "c_pq_mitm");
  assert.deepEqual(protocols({ ...base, warp: "plus" }).warp, ["info", "c_warp_on", { w: "plus" }]);
  assert.equal(protocols({ ...base, gateway: "on" }).warp[1], "c_warp_gw");
  assert.deepEqual(protocols({ http: [] }), { h3: null, ech: null, pq: null, warp: null });
});
