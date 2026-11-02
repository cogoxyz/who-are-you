// Every sniffer the page runs, one row each, in the order they are drawn. Each is a long-standing source any site can
// read without asking: the request itself (what the server sees) or a standard browser API.
//   id  the row (its name is the string "s_<id>")
//   m   how it is read, shown as is in every language
//   s   sensitive: blurred when the visitor hides their address for a screenshot
export const GROUPS = [
  ["net", [
    { id: "ip", m: "CF-Connecting-IP", s: 1 },
    { id: "geo", m: "request.cf.city", s: 1 },
    { id: "coords", m: "request.cf.latitude", s: 1 },
    { id: "isp", m: "request.cf.asOrganization" },
    { id: "dns", m: "edns.ip-api.com", s: 1 },
    { id: "tzip", m: "request.cf.timezone" },
    { id: "ptr", m: "DNS PTR", s: 1 },
    { id: "edge", m: "request.cf.colo" },
    { id: "proto", m: "request.cf.tlsVersion" },
    { id: "kex", m: "/cdn-cgi/trace · kex, sni" },
    { id: "warp", m: "/cdn-cgi/trace · warp" },
    { id: "tlsfp", m: "TLS ClientHello" },
    { id: "clock", m: "Date.now()" },
    { id: "webrtc", m: "RTCPeerConnection · STUN", s: 1 },
    { id: "lan", m: "WebRTC host candidate" },
  ]],
  // one address per kind of destination: a rule-based proxy picks the route by destination, so a split shows here
  ["exit", [
    { id: "ex_cn", m: "myip.ipip.net", s: 1 },
    { id: "ex_intl", m: "api.ip.sb", s: 1 },
    { id: "ex_gpt", m: "chatgpt.com/cdn-cgi/trace", s: 1 },
    { id: "ex_claude", m: "claude.ai/cdn-cgi/trace", s: 1 },
    { id: "ex_cf", m: "www.cloudflare.com/cdn-cgi/trace", s: 1 },
    { id: "stack", m: "Cloudflare Radar · IPv4 / IPv6", s: 1 },
  ]],
  ["hdr", [
    { id: "h_ua", m: "User-Agent" },
    { id: "h_lang", m: "Accept-Language" },
    { id: "h_chua", m: "Sec-CH-UA" },
    { id: "h_plat", m: "Sec-CH-UA-Platform" },
    { id: "h_enc", m: "Accept-Encoding" },
    { id: "h_dnt", m: "DNT · Sec-GPC" },
    { id: "h_ref", m: "Referer · document.referrer" },
  ]],
  ["loc", [
    { id: "langs", m: "navigator.languages" },
    { id: "locale", m: "Intl.DateTimeFormat" },
    { id: "tz", m: "Intl …timeZone" },
    { id: "hour", m: "Intl …hourCycle" },
    { id: "week", m: "Intl.Locale weekInfo" },
    { id: "fmt", m: "Intl.NumberFormat" },
    { id: "kbd", m: "navigator.keyboard" },
    { id: "voices", m: "speechSynthesis" },
  ]],
  ["dev", [
    { id: "os", m: "userAgentData" },
    { id: "browser", m: "userAgentData.brands" },
    { id: "arch", m: "…architecture · bitness" },
    { id: "screen", m: "screen · devicePixelRatio" },
    { id: "hz", m: "requestAnimationFrame" },
    { id: "screens", m: "screen.isExtended · screenX" },
    { id: "gpu", m: "WebGL RENDERER" },
    { id: "webgpu", m: "navigator.gpu adapter.info" },
    { id: "cpu", m: "hardwareConcurrency" },
    { id: "mem", m: "navigator.deviceMemory" },
    { id: "touch", m: "maxTouchPoints · pointer" },
    { id: "battery", m: "navigator.getBattery" },
    { id: "conn", m: "navigator.connection" },
    { id: "media", m: "enumerateDevices" },
    { id: "codecs", m: "MediaSource.isTypeSupported" },
    { id: "drm", m: "requestMediaKeySystemAccess" },
    { id: "storage", m: "storage.estimate" },
  ]],
  ["brw", [
    { id: "scheme", m: "prefers-color-scheme" },
    { id: "motion", m: "prefers-reduced-motion" },
    { id: "gamut", m: "color-gamut · dynamic-range" },
    { id: "dnt", m: "doNotTrack · GPC" },
    { id: "cookies", m: "navigator.cookieEnabled" },
    { id: "perms", m: "permissions.query" },
    { id: "pdf", m: "pdfViewerEnabled" },
    { id: "webdriver", m: "navigator.webdriver" },
    { id: "adblock", m: "bait element" },
    { id: "ext", m: "window.ethereum · DOM marks" },
    { id: "history", m: "history.length" },
    { id: "fonts", m: "canvas measureText" },
  ]],
  ["fp", [
    { id: "canvas", m: "canvas.toDataURL" },
    { id: "webgl", m: "WebGL getParameter" },
    { id: "audio", m: "OfflineAudioContext" },
    { id: "fontfp", m: "fonts → SHA-256" },
    { id: "fpid", m: "SHA-256" },
    { id: "rand", m: "canvas × 2" },
  ]],
];
// the two columns of the sniffers card
export const COLUMNS = [["net", "exit", "hdr", "loc"], ["dev", "brw", "fp"]];
export const SNIFFERS = GROUPS.flatMap(([, l]) => l);

// the blanks of the portrait, in the order the sentence template uses them; each names the rows it comes from
export const BLANKS = {
  nat: ["langs", "tz", "geo"], city: ["geo"], lang: ["langs"], tz: ["tz"], clock: ["hour"],
  device: ["os", "screen", "touch"], browser: ["browser"], screen: ["screen"], gpu: ["gpu"],
  isp: ["isp"], nettype: ["isp", "ex_cn", "ex_intl", "ex_gpt", "ex_claude", "ex_cf"], dns: ["dns"], age: [], theme: ["scheme"], adblock: ["adblock"], job: ["fonts", "ext"],
};

// the disguise checks, one row each
export const CHECKS = ["tz", "lang", "dns", "split", "webrtc", "dc", "ua", "fp", "bot"];
// the connection's protocols: shown under the checks, judged the same way, not counted among them
export const PROTO = ["h3", "ech", "pq", "warp"];
