# Who Are You

**English** · [简体中文](README.zh-CN.md)

Who do websites think you are? [Who Are You](https://who.1ms.dog) runs the sniffers any site can run the moment you open it, without a single permission prompt, and writes down the result as a paragraph with the blanks filled in: your likely nationality, the city you're in, your language and time zone, your device, browser, screen and graphics card, your network, your preferences, what your fonts say about your work, and your browser fingerprint.

It then checks those readings against each other the way a site would to spot a disguise, and lists all 71 sniffers with how each one reads and what it read.

**Live:** https://who.1ms.dog · topic pages: [browser fingerprint test](https://who.1ms.dog/fingerprint/), [DNS leak test](https://who.1ms.dog/dns-leak/), [WebRTC leak test](https://who.1ms.dog/webrtc-leak/) (same tool, that result first; text in `src/pages.mjs`)

## What it shows

- **The portrait.** One paragraph, every blank filled from the sniffers. Hover a blank to see which sniffers it came from (their rows light up). Age is the one blank it leaves open: nothing in a browser says it, and the page says so instead of guessing.
- **The disguise check**, nine rows that matter when you want to hide:
  - system time zone vs. the IP's time zone
  - browser language vs. the IP's country
  - DNS leak: the country of the resolver that actually looked you up vs. the IP's
  - split routing: a site in mainland China, an IP service abroad, ChatGPT, Claude, Cloudflare and this site seeing different exits
  - WebRTC: public addresses STUN servers see that this site sees neither over IPv4 nor over IPv6
  - data center network (clouds, hosting, VPN providers)
  - user agent vs. the system the client hints and WebGL renderer give away
  - whether the fingerprint is stable (trackable) or randomized
  - automation (`navigator.webdriver`)

  Every check that gives you away has a **How to fix** tip (Clash fake-ip / TUN for DNS leaks, limiting WebRTC, matching the time zone…), and a link to the 1ms.dog tool that looks deeper when the host announces it (`<meta name="dns">`, `"egress"`, `"ipqs"`).
- **Connection protocols**, under the checks: judged the same way but not counted, since they say how the connection is made, not who you are:
  - HTTP/3: this site's `/cdn-cgi/trace` asked again a few times; one answer over QUIC means it works. When none comes, WebRTC's STUN (UDP) decides: no UDP at all means it's blocked or the proxy doesn't carry it, otherwise the browser just hasn't switched yet
  - ECH: this site publishes its ECH keys in its DNS HTTPS record, so the trace's `sni=plaintext` means the browser didn't use them; the likeliest reason by browser (Safari lacks it, Firefox needs DNS over HTTPS, otherwise DNS gave no HTTPS record, as with a proxy's fake-ip)
  - Post-quantum key exchange: a browser that offers it by default (Chromium 124, Firefox 132, Safari 26 on) ending up with a classical one points to something in between that makes its own TLS
  - WARP and Gateway: shown, not judged
- **The fingerprint ID card**, with your previous visit: kept in your browser only, it shows when you were last here and whether the fingerprint was the same, which is how a site that never set a cookie still recognizes you.
- **Sharing.** 1ms.dog's shared share dialog (`public/assets/share/`, copied verbatim from 1ms-shell) with an image card drawn in the browser and a link, `/<lang>/r/<version>.<code>` (no folder for English; older `/r/<code>` links still open), that opens the same portrait in the viewer's language and previews with the result in its title and image (the Worker writes them; format and version: `src/share.mjs`). Neither carries your address or fingerprint; city and network only if you tick the box. Shortened when the host announces a shortener (`<meta name="shortener">`).
- **Every sniffer**, grouped:
  - *What the server sees*: IP, Cloudflare geolocation (city, coordinates, ASN, time zone), reverse DNS, nearest edge and TCP RTT, HTTP/TLS version and cipher, post-quantum key exchange and ECH, Cloudflare WARP, a TLS ClientHello fingerprint, your clock's offset, the DNS resolver (edns.ip-api.com), WebRTC public and local addresses
  - *Exits*: the address each kind of destination sees, plus your IPv4 and IPv6 exits (Cloudflare Radar)
  - *Request headers*: User-Agent, Accept-Language, Sec-CH-UA, platform, encodings, DNT/GPC, referrer
  - *Language and region*: `navigator.languages`, locale, time zone, 12/24-hour clock, first day of the week, number and date format, keyboard layout, speech voices
  - *Device*: OS and version, browser, architecture, screen, refresh rate, number of screens, GPU (WebGL and WebGPU), CPU threads, memory, touch, battery, connection, cameras and microphones (counted, never opened), video codecs, DRM systems, storage quota
  - *Browser settings*: color scheme, reduced motion, color gamut and HDR, DNT/GPC, cookies, permissions already granted or blocked, PDF viewer, webdriver, ad blocker, extensions that leave a mark (crypto wallets, developer tools, Grammarly, Dark Reader, Immersive Translate), tab history, installed fonts
  - *Fingerprints*: canvas, WebGL, audio, font list, the combined fingerprint, and whether the browser randomizes them

Rows are drawn before anything is read and filled the moment each sniffer answers; the paragraph is filled once, when every blank is in, so the page doesn't jump. A button blurs the address and location for screenshots.

## Privacy

To find your exits and DNS resolver the page asks a few outside services directly (named in each row: IPIP.NET, IP.SB, the Cloudflare trace on chatgpt.com, claude.ai and www.cloudflare.com, Cloudflare Radar, ip-api's DNS server, two STUN servers); they see your address as any site does. Everything else is read in the browser and stays there. The Worker answers one request, `GET /api/me`, with what it already sees in that request: the address, Cloudflare's `request.cf` data for it, the headers (cookies and Cloudflare's own left out), the address's PTR record and the server's clock. Nothing is stored or logged.

## Run it yourself

```bash
git clone https://github.com/yt1988/who-are-you
cd who-are-you
npm ci
npm run dev          # wrangler dev on http://localhost:8795 (geolocation comes from Cloudflare even locally)
npm test             # public/ is up to date, and the unit tests
npm run smoke        # every language page in headless Chrome or Edge: all rows, blanks and checks filled, sharing works
npm run og           # re-render the link-preview images (public/og/)
npx wrangler deploy  # deploy the Worker "who"; then add a custom domain in the dashboard
```

`npm run build` regenerates `public/` from `src/`. Set `SITE_URL` for your own domain (canonical links, sitemap, llms.txt). `npm run tz` refreshes the time zone → country table from the tz database.

## Layout

```
src/worker.js     GET /api/me: what the server sees
src/sniffers.mjs  every sniffer row, the portrait's blanks and the checks
src/infer.mjs     what the readings mean: OS, browser, GPU, keyboard, data centers, nationality, checks (unit tested)
src/app.js        the page: runs the sniffers, fills the rows, the paragraph and the checks
src/i18n/         10 languages
scripts/build.mjs builds public/ (one page per language, CSP, sitemap)
```

## License

MIT
