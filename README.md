# fontloom.com

A free, ad-supported fancy text generator: type plain text and instantly get 40 stylized Unicode versions of it — bold, italic, script, gothic/fraktur, double-struck, bubble/circled, squared, small caps, superscript/subscript, strikethrough, underline, overline, upside-down, mirrored, and three intensities of zalgo/glitch text — each with a one-click Copy button.

Alongside the fonts there are sixteen character-picker pages — `/kaomoji/` and
`/symbols/`, each with a page per mood and per kind — where a click copies the
character and `＋ Add fancy text` opens the generator with it already in the
box, so a visitor who arrived for one heart can leave with a styled line
rather than a clipboard. Arriving from one of the homepage's character tiles
carries your words along, and the page turns into "which face goes with my
words": one input at the top holds the line, every card *prints* it beside
its own character so you are choosing against something you can read, and
editing it re-runs the whole page without costing you your place in the grid. Those pages style nothing themselves: the
homepage is the only styler on the site, and a face there is simply text in
the text box, which is why all 40 tiles restyle around it for free. The same
move works from the other side — the homepage and the Combiner carry an **Add
a face** button beside their input, so a line that is already the shape you
want can take a face, or swap the one it has, without a trip to another page.

Alongside the full gallery there are seven focused tools, each one query cluster deep: a Combiner, a Mixer, and five single-purpose pages (flip, glitch, strikethrough, small caps, vaporwave). Every one of them carries a **"where this works" note** per style — most of these transforms are stripped or refused somewhere, and finding that out after pasting is the commonest complaint about tools in this category — and a **character-count readout**, because combining marks push a bio past its limit with nothing visible to explain it.

Everything runs client-side — no backend, no build step, no uploads. Deployed as static files on GitHub Pages.

## How it works

Most styles are implemented using the standard "Unicode Mathematical Alphanumeric Symbols" trick: that Unicode block (U+1D400–U+1D7FF) contains fully separate bold/italic/script/fraktur/double-struck/sans-serif/monospace copies of A–Z, a–z and 0–9 for use in math notation. `assets/js/fancytext-core.js` builds a lookup table mapping each ASCII letter/digit to its styled code point for each of these families, including the handful of documented "holes" in that block that fall back to older Letterlike Symbols characters (e.g. italic *h* is U+210E, not part of the contiguous math-italic run).

Other styles (small caps, circled, squared, fullwidth, superscript, subscript) use their own scattered Unicode ranges via explicit lookup tables. Where a style has incomplete A–Z coverage (subscript and superscript are missing several letters; small caps has no dedicated glyph for q or x), unmapped characters gracefully fall back to the plain character instead of producing blank or broken output.

A few "effect" styles aren't simple character substitution: strikethrough/underline append a combining character after each glyph, upside-down/mirror use a substitution table plus string reversal, and zalgo/glitch text randomly stacks combining diacritical marks above/below/through each character at three intensities. Those overlay effects are applied a word at a time rather than a character at a time. A whitespace-delimited run that is at least half letters and digits is a word and takes marks throughout, punctuation included, so a strike runs unbroken through "isn't", "3.14" and "(parenthetical)". Anything else is a picture — `(=^･ω･^=)`, `:)`, `¯\_(ツ)_/¯` — and is left alone, so a strikethrough beside a kaomoji strikes the words and not the face. Substitution styles have no such restriction: `(T_T)` in bold is `(𝐓_𝐓)`, which is still a face.

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
node test/favorites.test.js
node test/platform.test.js
node test/characters.test.js
```

Every character shipped in `assets/js/characters.js` has to render in a font the
device already has — the site loads no webfont, so a character without one
arrives as a tofu box. `node tools/check_glyphs.mjs` paints each one in real
headless Chrome and fails on anything that draws the same bitmap as an
unassigned code point. Run it after touching that file.

### Generated pages — never edit these by hand

The thirty-two per-style landing pages (`/bold-text-generator/`,
`/cursive-text-generator/`, …), the link-mesh block inside `index.html`, and
`sitemap.xml` are written by a generator. Editing any of them in place is
silently undone the next time it runs:

```
python3 tools/build_style_pages.py            # regenerate
python3 tools/build_style_pages.py --check    # fail if anything is stale
```

Change the copy in `tools/style_page_copy.py`, or the page list in
`FancyText.STYLE_PAGES`, and rebuild. Run `--check` before opening a PR.

The sixteen kaomoji and symbol pages have their own generator, sharing the page
shell so the chrome has one definition:

```
python3 tools/build_character_pages.py         # regenerate
python3 tools/build_character_pages.py --check # fail if anything is stale
```

Its data is `assets/js/characters.js` and its copy is
`tools/character_page_copy.py`. It does **not** write `sitemap.xml` —
`build_style_pages.py` is the only writer of that file and imports the URL list,
so run both.

The four platform pages (`/instagram-fonts/` and friends) *are* hand-written,
but the shortlist each one publishes is checked by `node tools/platform_check.js`
and asserted by `test/platform.test.js`.

## Structure

```
index.html                     Main app (style gallery)
combine/index.html             Font Combiner — chain styles in sequence
mix/index.html                 Font Mixer — a different style per letter
flip/index.html                Upside-down and mirror text
glitch/index.html              Zalgo/glitch, with a capped intensity slider
strikethrough/index.html       Strikethrough, underline, overline, slash
small-caps/index.html          Small caps, superscript, subscript
vaporwave/index.html           Fullwidth and spaced-out text
<style-slug>/index.html        GENERATED per-style landing page (32 of them)
kaomoji/index.html             GENERATED kaomoji hub, plus one page per mood (8)
symbols/index.html             GENERATED symbol hub, plus one page per kind (6)
instagram-fonts/index.html     Which styles survive an Instagram bio
discord-fonts/index.html       Which styles survive Discord, and what markdown does
tiktok-fonts/index.html        Which styles fit an 80-character TikTok bio
twitter-fonts/index.html       Which styles survive an X display name
privacy.html                   Privacy policy (required for ad networks)
terms.html                     Terms of use
404.html                       Custom 404 page
assets/favicon.svg             Site icon
assets/css/styles.css          Design system
assets/js/fancytext-core.js    Pure Unicode transform engine (no DOM)
assets/js/site.js              Shared chrome: theme toggle, header, copy helper
assets/js/favorites.js         Local favorites store (styles, combos, mixes, chars)
assets/js/characters.js        Kaomoji and symbol catalogue (build-time data; also
                               fetched at runtime by charinsert.js, on demand)
assets/js/characters-page.js   Runtime for /kaomoji/ and /symbols/: insert, filter, star
assets/js/charinsert.js        "Add a face" picker on / and /combine/ (lazy-loads the catalogue)
assets/js/app.js               Homepage gallery wiring
assets/js/combine.js           Font Combiner page wiring
assets/js/mix.js               Font Mixer page wiring
assets/js/styletool.js         Shared runtime for the five focused tool pages
tools/build_style_pages.py     GENERATOR for the per-style pages + sitemap (--check)
tools/style_page_copy.py       Page copy for those pages (build-time only)
tools/dump_styles.js           Hands the engine's catalogue + character maps to the build
tools/platform_check.js        Blocks/emoji/RTL/cost analysis behind the platform pages
tools/build_character_pages.py GENERATOR for the kaomoji/symbol pages (--check)
tools/character_page_copy.py   Page copy for those pages (build-time only)
tools/dump_characters.js       Hands the character catalogue to that build
tools/check_glyphs.mjs         Fails on any character with no glyph in a system font
test/core.test.js              Transform engine tests (node test/core.test.js)
test/favorites.test.js         Favorites store tests (node test/favorites.test.js)
test/platform.test.js          Holds the platform pages to their own evidence
test/characters.test.js        Character data + the pages built from it
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
