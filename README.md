# fontloom.com

A free, ad-supported fancy text generator: type plain text and instantly get 39 stylized Unicode versions of it — bold, italic, script, gothic/fraktur, double-struck, bubble/circled, squared, small caps, superscript/subscript, strikethrough, upside-down, mirrored, and three intensities of zalgo/glitch text — each with a one-click Copy button.

Everything runs client-side — no backend, no build step, no uploads. Deployed as static files on GitHub Pages.

## How it works

Most styles are implemented using the standard "Unicode Mathematical Alphanumeric Symbols" trick: that Unicode block (U+1D400–U+1D7FF) contains fully separate bold/italic/script/fraktur/double-struck/sans-serif/monospace copies of A–Z, a–z and 0–9 for use in math notation. `assets/js/fancytext-core.js` builds a lookup table mapping each ASCII letter/digit to its styled code point for each of these families, including the handful of documented "holes" in that block that fall back to older Letterlike Symbols characters (e.g. italic *h* is U+210E, not part of the contiguous math-italic run).

Other styles (small caps, circled, squared, fullwidth, superscript, subscript) use their own scattered Unicode ranges via explicit lookup tables. Where a style has incomplete A–Z coverage (subscript and superscript are missing several letters; small caps has no dedicated glyph for q or x), unmapped characters gracefully fall back to the plain character instead of producing blank or broken output.

A few "effect" styles aren't simple character substitution: strikethrough/underline append a combining character after each glyph, upside-down/mirror use a substitution table plus string reversal, and zalgo/glitch text randomly stacks combining diacritical marks above/below/through each character at three intensities.

## Local development

No build tooling required. Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

When changing `styles.css` or any JS file, bump the `?v=` query param on the matching asset links in every HTML page that references them. GitHub Pages caches assets for 10 minutes, so without the bump a visitor can get fresh HTML paired with a stale script/stylesheet from cache — which can break the page until the cache expires.

The pure transform engine has a small test suite (plain Node asserts, no dependencies):

```
node test/core.test.js
```

## Structure

```
index.html                     Main app (style gallery)
combine/index.html             Font Combiner — chain styles in sequence
mix/index.html                 Font Mixer — a different style per letter
privacy.html                   Privacy policy (required for ad networks)
terms.html                     Terms of use
404.html                       Custom 404 page
assets/favicon.svg             Site icon
assets/css/styles.css          Design system
assets/js/fancytext-core.js    Pure Unicode transform engine (no DOM)
assets/js/site.js              Shared chrome: theme toggle, header, copy helper
assets/js/app.js               Homepage gallery wiring
assets/js/combine.js           Font Combiner page wiring
assets/js/mix.js               Font Mixer page wiring
test/core.test.js              Transform engine tests (node test/core.test.js)
CNAME                          GitHub Pages custom domain (fontloom.com)
```

## Enabling ads (Google AdSense)

1. Deploy the site and get it live at fontloom.com (or the github.io URL, until the domain is purchased — see below).
2. Apply at https://adsense.google.com with the live URL. Approval requires a working privacy policy (already included) and some real content/traffic — it isn't instant.
3. Once approved, uncomment the AdSense `<script>` tag in `index.html`'s `<head>` and replace `ca-pub-XXXXXXXXXXXXXXXX` with your publisher ID. Auto ads then places ad units automatically — no manual placement needed.

## Custom domain (fontloom.com)

The `CNAME` file tells GitHub Pages to serve this repo at `fontloom.com`. **Important: this domain has not actually been purchased yet.** It was only checked for apparent availability via DNS lookup — until it's bought and DNS is configured, the site will only be reachable at its `github.io` URL (e.g. `https://ngineer420.github.io/fancy-text-generator/`), and the `CNAME` file will have no effect.

Once the domain is purchased, point DNS at GitHub Pages:

- Apex domain (`fontloom.com`): four `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- `www` subdomain (optional): `CNAME` record to `<username>.github.io`.

Then enable Pages in the repo's Settings → Pages, and enter `fontloom.com` as the custom domain (GitHub will offer to enforce HTTPS once DNS propagates).

## License

Unicode code points used here are, naturally, just Unicode — no font files are bundled or required.
