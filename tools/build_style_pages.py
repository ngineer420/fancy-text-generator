#!/usr/bin/env python3
"""Generate one landing page per text style, from the engine's own catalogue.

fontloom implements about forty transforms and, until these pages existed,
exposed exactly one URL for all of them. Nobody searches "fancy text
generator"; they search "cursive text generator", "bubble letters", "gothic
font generator". This writes the page for each of those queries.

    python3 tools/build_style_pages.py            # regenerate everything
    python3 tools/build_style_pages.py --check    # fail if anything is stale

What it writes, all under the repo root:

    <slug>/index.html      one per entry in FancyText.STYLE_PAGES
    index.html             the link-mesh block between its BEGIN/END markers
    sitemap.xml            rebuilt from the page list

NOTHING ELSE MAY WRITE THOSE FILES. A generated page hand-edited in place is
overwritten without warning the next time this runs, so `--check` exists to
catch that in review rather than after the fact: it re-renders everything in
memory and reports any file on disk that differs.

The character maps on each page are the real output of the real transform,
obtained by running the engine itself through `tools/dump_styles.js` — Python
cannot run the transforms, and a table maintained by hand beside them would
drift from the tool sitting on the same page.

Page copy (titles, intros, FAQs) lives in `tools/style_page_copy.py`, not in
the engine: it is only ever needed at build time, and shipping ten kilobytes
of prose inside fancytext-core.js would cost every visitor on every page.

Standard library only, plus Node for the dump. Python 3.8+.
"""

import argparse
import html
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from style_page_copy import COPY  # noqa: E402

SITE = "https://fontloom.com"

# Cache busting is mandatory here: GitHub Pages serves max-age=600, so a
# visitor holding a cached asset must not be handed fresh HTML that assumes a
# new one. These are the values the hand-written pages carry; bump both here
# and there in the same commit whenever the asset changes.
ASSET_V = {
    "css": 13,
    "core": 5,
    "site": 2,
    "favorites": 2,
    "styletool": 2,
}

# Hand-written, not generated — but the sitemap, the footer and the homepage
# mesh all need to know they exist.
PLATFORM_PAGES = [
    ("instagram-fonts", "Instagram", "Fonts for Instagram"),
    ("discord-fonts", "Discord", "Fonts for Discord"),
    ("tiktok-fonts", "TikTok", "Fonts for TikTok"),
    ("twitter-fonts", "Twitter", "Fonts for Twitter / X"),
]

TOOL_NAV = [
    ("/flip/", "Flip"),
    ("/glitch/", "Glitch"),
    ("/strikethrough/", "Strike"),
    ("/small-caps/", "Small Caps"),
    ("/vaporwave/", "Vaporwave"),
    ("/combine/", "Combiner"),
    ("/mix/", "Mixer"),
]

ADSENSE = ('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
           '?client=ca-pub-7560786263587509" crossorigin="anonymous"></script>')

ERABBIT = ('<a href="https://erabb.it" class="erabbit-mark" aria-label="erabb.it">'
           '<img src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 '
           'viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>\U0001f407</text></svg>" '
           'width="10" height="10" alt=""></a>')

GENERATED_WARNING = (
    "<!-- GENERATED FILE - do not edit by hand.\n"
    "     Written by tools/build_style_pages.py from FancyText.STYLE_PAGES and\n"
    "     tools/style_page_copy.py. Any edit here is lost on the next build;\n"
    "     `python3 tools/build_style_pages.py --check` fails while one exists. -->"
)

# Why a character can come out unchanged. Saying "Unicode has no character for
# this" under a turned 'o' would be a lie — it is turned, it just looks the
# same — and under a small-caps capital it would be nonsense.
PLAIN_NOTE = {
    "default": "no character for it exists in Unicode, so it stays exactly as you typed it",
    "upside-down": "these are symmetrical: turned over they land on the same shape",
    "small-caps": "capitals are already capital-shaped, so they pass through untouched",
}

MARK_BEGIN = "<!-- BEGIN generated style links (tools/build_style_pages.py) -->"
MARK_END = "<!-- END generated style links -->"


def esc(s):
    return html.escape(s, quote=True)


def load_catalogue():
    """Run the engine under Node and read back the catalogue plus every map."""
    proc = subprocess.run(
        ["node", os.path.join(HERE, "dump_styles.js")],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise SystemExit("tools/dump_styles.js failed:\n" + proc.stderr.strip())
    return json.loads(proc.stdout)


def keyword_label(slug):
    """'bold-text-generator' -> 'Bold text generator' — the query, as the link."""
    words = slug.replace("-", " ")
    return words[0].upper() + words[1:]


def keyword_heading(slug):
    """'bold-text-generator' -> 'Bold Text Generator', for the <h1>.

    The heading is the query, title-cased. Derived rather than written out
    thirty-two times, because a hand-typed h1 that drifts from its own URL is
    the one mistake on a page like this that actually costs traffic.
    """
    return " ".join(w.capitalize() for w in slug.split("-"))


def head(title, description, url, ld_blocks):
    scripts = "\n\n".join(
        '<script type="application/ld+json">\n%s\n</script>' % json.dumps(b, indent=2, ensure_ascii=False)
        for b in ld_blocks
    )
    return """<!doctype html>
<html lang="en">
{warning}
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0c0a12">

<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{site}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{site}/assets/og-image.png">

<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/styles.css?v={css}">

{ld}

{ads}
</head>
""".format(warning=GENERATED_WARNING, title=esc(title), description=esc(description),
           url=url, site=SITE, css=ASSET_V["css"], ld=scripts, ads=ADSENSE)


def site_header():
    links = "\n".join('        <a href="%s">%s</a>' % (href, label) for href, label in TOOL_NAV)
    return """<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="/" aria-label="fontloom.com home">
      <span class="brand-mark">fontloom</span>
      <span class="brand-tag">fancy text generator</span>
    </a>
    <div class="header-actions">
      <nav class="site-nav" aria-label="Tools">
{links}
      </nav>
      <button id="theme-toggle" class="icon-btn" type="button" aria-label="Toggle dark/light theme" title="Toggle theme">◐</button>
    </div>
  </div>
</header>
""".format(links=links)


def site_footer(active_platform=None):
    tools = "\n".join('      <a href="%s">%s</a>' % (href, label) for href, label in TOOL_NAV)
    platforms = "\n".join(
        '      <a href="/%s/"%s>%s</a>' % (slug, ' aria-current="page"' if slug == active_platform else "", label)
        for slug, label, _ in PLATFORM_PAGES
    )
    return """
<footer class="site-footer">
  <nav class="footer-tools" aria-label="All tools">
    <span class="footer-tools-label">Tools</span>
      <a href="/">All fonts</a>
{tools}
  </nav>
  <nav class="footer-tools" aria-label="Fonts by platform">
    <span class="footer-tools-label">Platforms</span>
{platforms}
      <a href="/#all-styles">Every style</a>
  </nav>
  <div class="footer-inner">
    <div>© <span id="year"></span> fontloom.com</div>
    <div class="footer-links">
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
    </div>
  </div>
</footer>

{erabbit}

<script src="/assets/js/fancytext-core.js?v={core}"></script>
<script src="/assets/js/site.js?v={site}"></script>
<script src="/assets/js/favorites.js?v={favs}"></script>
<script src="/assets/js/styletool.js?v={tool}"></script>
</body>
</html>
""".format(tools=tools, platforms=platforms, erabbit=ERABBIT, core=ASSET_V["core"],
           site=ASSET_V["site"], favs=ASSET_V["favorites"], tool=ASSET_V["styletool"])


def charmap_group(style, key, heading, rows):
    """One A-Z / a-z / 0-9 block as static HTML.

    This is the part of the page that has to be there with JavaScript off: a
    landing page whose only content is an empty input box is not a page.
    """
    cells = []
    plain = 0
    for cell in rows:
        is_plain = cell["plain"]
        if is_plain:
            plain += 1
        cells.append(
            '      <li class="cm-cell%s"><span class="cm-src">%s</span>'
            '<span class="cm-arrow" aria-hidden="true">→</span>'
            '<span class="cm-out">%s</span></li>'
            % (" is-plain" if is_plain else "", esc(cell["src"]), esc(cell["out"]))
        )
    out = ['    <h3>%s</h3>' % esc(heading),
           '    <ul class="charmap">',
           "\n".join(cells),
           '    </ul>']
    if plain:
        note = PLAIN_NOTE.get(style["id"], PLAIN_NOTE["default"])
        sample = next(c["src"] for c in rows if c["plain"])
        out.append(
            '    <p class="charmap-legend">%d of these (%s and the rest of the dashed cells) '
            'come out unchanged — %s.</p>'
            % (plain, esc(sample), note)
        )
    return "\n".join(out)


def charmap_section(style):
    parts = ['  <section class="container-narrow explainer charmap-section">',
             '    <h2>The full %s character map</h2>' % esc(style["name"]),
             '    <p>Every letter and digit this style has, and what it turns into. '
             'This is the transform itself, not a picture of it — select any '
             'character below and it copies as text.</p>',
             charmap_group(style, "upper", "Capitals", style["upper"]),
             charmap_group(style, "lower", "Lowercase", style["lower"]),
             charmap_group(style, "digits", "Digits", style["digits"]),
             '  </section>']
    return "\n".join(parts)


def support_section(style):
    s = style["support"]
    return """  <section class="container-narrow explainer">
    <h2>Where {name} text works, and where it does not</h2>
    <div class="tile-support support-page">
      <span class="support-line support-works"><span class="support-key">Works</span>{works}</span>
      <span class="support-line support-watch"><span class="support-key">Watch out</span>{watch}</span>
    </div>
  </section>""".format(name=esc(style["name"]), works=esc(s["works"]), watch=esc(s["watch"]))


def related_section(style, styles_by_id, catalogue):
    """Siblings from the same category, plus the platform pages."""
    siblings = [s for s in catalogue["styles"]
                if s["category"] == style["category"] and s["id"] != style["id"]][:7]
    rows = []
    if siblings:
        rows.append('    <h3>Related styles</h3>')
        rows.append('    <ul class="style-links">')
        for s in siblings:
            rows.append('      <li><a href="/%s/">%s</a></li>' % (s["slug"], esc(keyword_label(s["slug"]))))
        rows.append('    </ul>')
    rows.append('    <h3>Fonts for a platform</h3>')
    rows.append('    <ul class="style-links">')
    for slug, _label, long_label in PLATFORM_PAGES:
        rows.append('      <li><a href="/%s/">%s</a></li>' % (slug, esc(long_label)))
    rows.append('      <li><a href="/#all-styles">Every style on the site</a></li>')
    rows.append('    </ul>')
    return ('  <section class="container-narrow explainer">\n'
            '    <h2>More like this</h2>\n' + "\n".join(rows) + "\n  </section>")


def style_page(style, catalogue, styles_by_id):
    copy = COPY.get(style["id"])
    if not copy:
        raise SystemExit("tools/style_page_copy.py has no entry for style %r" % style["id"])

    url = "%s/%s/" % (SITE, style["slug"])
    title = "%s | fontloom" % copy["title"]
    description = copy["description"]

    ld_app = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": copy["title"],
        "url": url,
        "applicationCategory": "DesignApplication",
        "operatingSystem": "Any",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "description": description,
    }
    ld_faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in copy["faq"]
        ],
    }

    aka = ", ".join(copy["aka"])

    body = []
    body.append('<main id="main" class="tool-page" data-tool="style" data-style="%s">' % esc(style["id"]))
    body.append("""  <div class="hero">
    <h1>%s</h1>
    <p>%s</p>
  </div>

  <div class="tool-shell">
    <div class="input-shell">
      <label for="tool-input" class="visually-hidden">Your text</label>
      <input type="text" id="tool-input" class="input-field" placeholder="Type your text…" autocomplete="off" spellcheck="false" maxlength="300">
      <button type="button" id="clear-btn" class="clear-btn" aria-label="Clear text" hidden>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>
      </button>
    </div>
    <p class="char-count" id="char-count" role="status"></p>

    <div class="tile-grid variant-grid is-single" id="variant-grid">
      <noscript>
        <p class="noscript-note">The live preview needs JavaScript. The full character map below works without it — %s reads as <strong>%s</strong>.</p>
      </noscript>
    </div>
  </div>

  <div id="copy-live-region" class="visually-hidden" aria-live="polite"></div>
""" % (esc(copy.get("h1") or keyword_heading(style["slug"])), esc(copy["tagline"]),
       esc(catalogue["sample"]), esc(style["sample"])))

    body.append('  <section class="container-narrow explainer">')
    body.append('    <h2>%s</h2>' % esc(copy["intro_heading"]))
    body.append('    <p>%s</p>' % esc(copy["intro"]))
    body.append('    <p>%s</p>' % esc(copy["second"]))
    body.append('    <p class="style-aka">Also searched as: %s.</p>' % esc(aka))
    body.append('  </section>')

    body.append(charmap_section(style))
    body.append(support_section(style))

    body.append('  <section class="container-narrow explainer">')
    body.append('    <h2>%s questions</h2>' % esc(style["name"]))
    for q, a in copy["faq"]:
        body.append('    <h3>%s</h3>' % esc(q))
        body.append('    <p>%s</p>' % esc(a))
    body.append('  </section>')

    body.append(related_section(style, styles_by_id, catalogue))
    body.append('</main>')

    return head(title, description, url, [ld_app, ld_faq]) + site_header() + "\n".join(body) + site_footer()


def homepage_block(catalogue):
    """The link mesh spliced into index.html between its markers."""
    by_cat = {}
    for s in catalogue["styles"]:
        by_cat.setdefault(s["category"], []).append(s)

    out = [MARK_BEGIN,
           '  <section class="container-narrow explainer" id="all-styles">',
           '    <h2>Every style, on its own page</h2>',
           '    <p>Each of these has a page of its own with the full A–Z character map, '
           'the letters Unicode is missing, and a note on where the result survives being '
           'pasted.</p>']
    for cat in catalogue["categories"]:
        entries = by_cat.get(cat["id"])
        if not entries:
            continue
        out.append('    <h3>%s</h3>' % esc(cat["title"]))
        out.append('    <ul class="style-links">')
        for s in entries:
            out.append('      <li><a href="/%s/">%s</a></li>' % (s["slug"], esc(keyword_label(s["slug"]))))
        out.append('    </ul>')
    out.append('    <h3>Fonts for a platform</h3>')
    out.append('    <ul class="style-links">')
    for slug, _label, long_label in PLATFORM_PAGES:
        out.append('      <li><a href="/%s/">%s</a></li>' % (slug, esc(long_label)))
    out.append('    </ul>')
    out.append('  </section>')
    out.append("  " + MARK_END)
    return "\n".join(out)


def sitemap(catalogue):
    rows = [("/", "weekly", "1.0")]
    for slug in ["combine", "mix", "flip", "glitch", "strikethrough", "small-caps", "vaporwave"]:
        rows.append(("/%s/" % slug, "monthly", "0.8"))
    for slug, _l, _ll in PLATFORM_PAGES:
        rows.append(("/%s/" % slug, "monthly", "0.7"))
    for s in catalogue["styles"]:
        rows.append(("/%s/" % s["slug"], "monthly", "0.7"))
    for a in ["how-fancy-text-works", "where-fancy-text-works",
              "history-of-fancy-text", "fancy-text-and-accessibility"]:
        rows.append(("/articles/%s.html" % a, "monthly", "0.6"))
    rows.append(("/privacy.html", "yearly", "0.2"))
    rows.append(("/terms.html", "yearly", "0.2"))

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, freq, prio in rows:
        out += ['  <url>',
                '    <loc>%s%s</loc>' % (SITE, loc),
                '    <changefreq>%s</changefreq>' % freq,
                '    <priority>%s</priority>' % prio,
                '  </url>']
    out.append('</urlset>')
    return "\n".join(out) + "\n"


def write(path, text, check, stale):
    if check:
        if not os.path.exists(path) or open(path, encoding="utf-8").read() != text:
            stale.append(os.path.relpath(path, ROOT))
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def splice(path, block, check, stale):
    """Replace the marked region of a hand-written file, leaving the rest alone."""
    current = open(path, encoding="utf-8").read()
    start = current.find(MARK_BEGIN)
    end = current.find(MARK_END)
    if start == -1 or end == -1:
        raise SystemExit("%s is missing the generated-block markers" % os.path.relpath(path, ROOT))
    updated = current[:start] + block + current[end + len(MARK_END):]
    if check:
        if updated != current:
            stale.append(os.path.relpath(path, ROOT))
        return
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(updated)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="report stale/missing generated files instead of writing")
    args = ap.parse_args()

    catalogue = load_catalogue()
    styles = catalogue["styles"]
    styles_by_id = {s["id"]: s for s in styles}

    slugs = [s["slug"] for s in styles] + [p[0] for p in PLATFORM_PAGES]
    if len(set(slugs)) != len(slugs):
        dupes = sorted({s for s in slugs if slugs.count(s) > 1})
        raise SystemExit("slug collision: %s" % ", ".join(dupes))
    missing = [s["id"] for s in styles if s["id"] not in COPY]
    if missing:
        raise SystemExit("no page copy for: %s" % ", ".join(missing))

    stale = []
    for style in styles:
        page = style_page(style, catalogue, styles_by_id)
        write(os.path.join(ROOT, style["slug"], "index.html"), page, args.check, stale)

    splice(os.path.join(ROOT, "index.html"), homepage_block(catalogue), args.check, stale)
    write(os.path.join(ROOT, "sitemap.xml"), sitemap(catalogue), args.check, stale)

    if args.check:
        if stale:
            print("stale or missing (%d):" % len(stale))
            for s in stale[:20]:
                print("  " + s)
            if len(stale) > 20:
                print("  ... and %d more" % (len(stale) - 20))
            print("\nrun: python3 tools/build_style_pages.py")
            return 1
        print("generated files are up to date (%d style pages)" % len(styles))
        return 0

    print("wrote %d style pages, the homepage link mesh, and sitemap.xml" % len(styles))
    return 0


if __name__ == "__main__":
    sys.exit(main())
