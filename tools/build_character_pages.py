#!/usr/bin/env python3
"""Generate the kaomoji and symbol picker pages from the character catalogue.

    python3 tools/build_character_pages.py            # regenerate everything
    python3 tools/build_character_pages.py --check    # fail if anything is stale

What it writes, all under the repo root:

    kaomoji/index.html            the hub, a sampler of all eight moods
    kaomoji/<mood>/index.html     one per KAOMOJI_SLUGS entry, complete
    symbols/index.html            the hub, a sampler of all six kinds
    symbols/<kind>/index.html     one per SYMBOL_SLUGS entry, complete

Same shape as `build_style_pages.py`, and it imports that module's page shell
rather than restating it: the head, the AdSense tag, the header, the toolbar
region and the footer are one definition in one file, so a change to the chrome
cannot land on 32 style pages and miss 16 character pages.

`sitemap.xml` is NOT written here. build_style_pages.py owns that file and
imports CHARACTER_URLS from `character_page_copy.py` to include these pages, so
there is still exactly one writer for it. `--check` here verifies the sitemap
lists every URL this builder produces and tells you which command to run.

The data comes from `assets/js/characters.js` via `tools/dump_characters.js`,
for the same reason the style pages get their character maps from the engine:
one source of truth, read by the thing that needs it, rather than a second copy
maintained in Python beside the first.

The page copy — every title, intro, FAQ — lives in
`tools/character_page_copy.py`. Sixteen filter-boxes-over-a-grid built from one
template would be scaled thin content whatever the mood names were; that file
is the part of this feature that makes the pages worth publishing, and a slug
without an entry there is a hard build failure rather than a page with the noun
substituted in.

Standard library only, plus Node for the dump. Python 3.8+.
"""

import argparse
import html
import json
import os
import subprocess
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import build_style_pages as B  # noqa: E402  — the page shell, shared verbatim
import nav_data as NAV  # noqa: E402  — checked against this catalogue in main()
from character_page_copy import (  # noqa: E402
    COPY, KAOMOJI_SLUGS, SYMBOL_SLUGS, CHARACTER_URLS,
)

SITE = B.SITE
esc = B.esc

GENERATED_WARNING = (
    "<!-- GENERATED FILE - do not edit by hand.\n"
    "     Written by tools/build_character_pages.py from assets/js/characters.js\n"
    "     and tools/character_page_copy.py. Any edit here is lost on the next\n"
    "     build; `python3 tools/build_character_pages.py --check` fails while one\n"
    "     exists. -->"
)

# The scripts a character page loads. styletool.js is not among them — these
# pages are not the style-page runtime with a parameter changed, they are a
# catalogue you copy from, and characters-page.js is the whole of it.
CHAR_SCRIPTS = [
    ("fancytext-core.js", "core"),
    ("site.js", "site"),
    ("favorites.js", "favorites"),
    ("characters-page.js", "characters"),
]

# What a hub shows per group before handing off to the group's own page. The
# hub is a sampler and a directory; the complete set lives one click down,
# which is what keeps the two pages from being the same page twice.
HUB_SAMPLE = 12

HUBS = [
    {
        "kind": "kaomoji",
        "slug": "kaomoji",
        "noun": "kaomoji",
        "one": "kaomoji",
        "label": "Mood",
        "hint": "crying",
        "slugs": KAOMOJI_SLUGS,
    },
    {
        "kind": "symbols",
        "slug": "symbols",
        "noun": "symbols",
        "one": "symbol",
        "label": "Kind",
        "hint": "arrow",
        "slugs": SYMBOL_SLUGS,
    },
]


def load_catalogue():
    """Run assets/js/characters.js under Node and read the catalogue back."""
    proc = subprocess.run(
        ["node", os.path.join(HERE, "dump_characters.js")],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise SystemExit("tools/dump_characters.js failed:\n" + proc.stderr.strip())
    return json.loads(proc.stdout)


def code_points(char):
    """'U+2764 U+FE0F' — what the symbol actually is, for the card's caption.

    Only shown on the symbol pages. It is the one detail a symbol picker can
    give that a screenshot of one cannot, it is what somebody comparing ♥ with
    ❤ is actually looking for, and it costs nothing to derive.
    """
    return " ".join("U+%04X" % ord(c) for c in char)


def filter_keys(item):
    return " ".join([item["name"]] + item["keywords"]).lower()


def card(item, kind):
    """One character, as a card that copies on click.

    A div[role=button], not a <button>: the card holds three real buttons of
    its own (copy, save, insert) and nesting those inside a button is invalid.
    The pattern matches the gallery tiles on every other page of the site,
    including what a click does — every tile on this site copies.
    """
    label = item["name"]
    out = [
        '        <li>',
        '          <div class="char-card" role="button" tabindex="0" data-char="%s" data-keys="%s"'
        ' aria-label="Copy %s">' % (esc(item["char"]), esc(filter_keys(item)), esc(label)),
        '            <span class="char-glyph">%s</span>' % esc(item["char"]),
        '            <span class="char-meta">',
        '              <span class="char-name">%s</span>' % esc(label),
    ]
    if kind == "symbols":
        out.append('              <span class="char-code">%s</span>' % code_points(item["char"]))
    out += [
        '            </span>',
        '            <span class="char-tools">',
        '              <button type="button" class="char-star" aria-pressed="false" title="Save to favorites"'
        ' aria-label="Save %s to favorites">&#9734;</button>' % esc(label),
        '            </span>',
        '            <a class="char-insert" href="/?text=%s" title="Open the generator with this one in the box"'
        ' aria-label="Add fancy text to %s in the full generator">'
        '<span aria-hidden="true">&#65291;</span> Add fancy text</a>'
        % (esc(urllib.parse.quote(item["char"] + " ", safe="")), esc(label)),
        '            <span class="char-copied" aria-hidden="true">Copied</span>',
        '          </div>',
        '        </li>',
    ]
    return "\n".join(out)


def grid(items, kind):
    """The picker grid. Nothing in it but characters.

    It used to carry three styled advert cards spliced in among the plain
    ones, from the release where the only way to reach the styler was a
    composer at the foot of the page. Every card is that link now, so the
    adverts were a third message saying what ninety-six cards already said —
    and the one thing on the page showing sample text that was not the
    visitor's own.
    """
    out = ['      <ul class="char-grid">']
    for i in items:
        out.append(card(i, kind))
    out.append('      </ul>')
    return "\n".join(out)


def carry(hub):
    """What this page is holding, when it is holding anything.

    Only a visitor who arrived from a homepage tile has text, and then every
    card on the page is the same line with a different character in it — the
    text is the constant and the character is the variable, which is the
    whole reason this page never needed a text box. `characters-page.js`
    fills it in from `?text=` and unhides it; a visit with no text never sees
    it, because there is nothing to say.
    """
    return """    <p class="char-carry" id="char-carry" hidden>
      <span class="char-carry-label">Adding a {one} to</span>
      <strong class="char-carry-text" id="char-carry-text"></strong>
      <a class="char-carry-edit" id="char-carry-edit" href="/">Change the text or style it &rarr;</a>
    </p>
""".format(one=hub["one"])


def filter_row(hub, count, hint):
    """The search box, and the first thing under the h1.

    Somebody who lands on /kaomoji/ came for a face. The page opens with the
    one control that finds one and then with the faces themselves, because the
    lead slot belongs to the reason the visit happened.
    """
    return """  <div class="tool-shell">
{carry}    <div class="char-filter-row">
      <label for="char-filter" class="visually-hidden">Filter {noun}</label>
      <input type="search" id="char-filter" class="input-field" placeholder="Filter {count} {noun} — try a word like {hint}…" autocomplete="off">
      <p class="char-filter-count" id="char-filter-count" role="status"></p>
    </div>
""".format(noun=hub["noun"], count=count, hint=esc(hint), carry=carry(hub))


def switch(hub, groups, current_slug):
    """The sibling cluster under the h1 — same job as .style-switch elsewhere.

    Every one of these pages is one click from every other, which is the whole
    difference between a set of pages and a section of a site.
    """
    out = ['  <nav class="style-switch" aria-labelledby="char-switch-label">',
           '    <span class="style-switch-label" id="char-switch-label">%s</span>' % esc(hub["label"]),
           '    <ul>']
    hub_current = ' aria-current="page"' if current_slug is None else ""
    out.append('      <li><a class="chip" href="/%s/"%s>All %s</a></li>'
               % (hub["slug"], hub_current, esc(hub["noun"])))
    for g in groups:
        current = ' aria-current="page"' if g["slug"] == current_slug else ""
        out.append('      <li><a class="chip" href="/%s/%s/"%s>%s</a></li>'
                   % (hub["slug"], g["slug"], current, esc(g["name"])))
    other = "symbols" if hub["slug"] == "kaomoji" else "kaomoji"
    other_label = "Text symbols" if other == "symbols" else "Kaomoji"
    out.append('      <li><a class="chip chip-all" href="/%s/">%s &rarr;</a></li>' % (other, other_label))
    out += ['    </ul>', '  </nav>']
    return "\n".join(out)


def prose(copy, extra=None):
    out = ['  <section class="container-narrow explainer">',
           '    <h2>%s</h2>' % esc(copy["intro_heading"]),
           '    <p>%s</p>' % esc(copy["intro"]),
           '    <p>%s</p>' % esc(copy["second"])]
    if extra:
        out.append(extra)
    out.append('    <p class="style-aka">Also searched as: %s.</p>' % esc(", ".join(copy["aka"])))
    out.append('  </section>')
    return "\n".join(out)


def faq_section(copy, heading):
    out = ['  <section class="container-narrow explainer">',
           '    <h2>%s</h2>' % esc(heading)]
    for q, a in copy["faq"]:
        out.append('    <h3>%s</h3>' % esc(q))
        out.append('    <p>%s</p>' % esc(a))
    out.append('  </section>')
    return "\n".join(out)


def related(hub, groups, current_slug):
    """Where to go next — siblings, the other family, and back into the styles.

    The style pages already point here; this points back, so the two halves of
    the site are one crawlable graph rather than two.
    """
    other = "symbols" if hub["slug"] == "kaomoji" else "kaomoji"
    rows = []
    siblings = [g for g in groups if g["slug"] != current_slug]
    if siblings:
        rows.append('    <h3>More %s</h3>' % esc(hub["noun"]))
        rows.append('    <ul class="style-links">')
        for g in siblings:
            rows.append('      <li><a href="/%s/%s/">%s</a></li>'
                        % (hub["slug"], g["slug"],
                           esc(COPY["%s/%s" % (hub["slug"], g["slug"])]["h1"])))
        rows.append('    </ul>')
    rows.append('    <h3>Style the text around them</h3>')
    rows.append('    <ul class="style-links">')
    rows.append('      <li><a href="/">All 40 styles at once</a></li>')
    rows.append('      <li><a href="/styles/">Every style, one page each</a></li>')
    rows.append('      <li><a href="/%s/">%s</a></li>'
                % (other, "Text symbols to copy" if other == "symbols" else "Kaomoji and text emoticons"))
    rows.append('      <li><a href="/combine/">Chain two styles together</a></li>')
    rows.append('      <li><a href="/instagram-fonts/">Fonts for Instagram</a></li>')
    rows.append('    </ul>')
    return ('  <section class="container-narrow explainer">\n'
            '    <h2>More like this</h2>\n' + "\n".join(rows) + "\n  </section>")


def ld_blocks(copy, url, kind):
    app = {
        "@context": "https://schema.org",
        "@type": kind,
        "name": copy["h1"],
        "url": url,
        "description": copy["description"],
    }
    if kind == "WebApplication":
        app["applicationCategory"] = "DesignApplication"
        app["operatingSystem"] = "Any"
        app["offers"] = {"@type": "Offer", "price": "0", "priceCurrency": "USD"}
    faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in copy["faq"]
        ],
    }
    return [app, faq]


def shell(copy, url, path, body, kind):
    """head + header + body + footer, with the do-not-edit banner swapped in.

    build_style_pages.head() stamps its own banner, naming its own builder. The
    file on disk has to name the tool that will overwrite it, so this replaces
    that one line rather than growing a parameter on the shared function.
    """
    head = B.head(copy["title"] + " | fontloom", copy["description"], url, ld_blocks(copy, url, kind))
    head = head.replace(B.GENERATED_WARNING, GENERATED_WARNING, 1)
    return (head + B.site_header(path) + body
            + B.site_footer(scripts=CHAR_SCRIPTS))


def hero(copy):
    return """  <div class="hero">
    <h1>%s</h1>
    <p>%s</p>
  </div>""" % (esc(copy["h1"]), esc(copy["tagline"]))


def group_page(hub, groups, group):
    key = "%s/%s" % (hub["slug"], group["slug"])
    copy = COPY.get(key)
    if not copy:
        raise SystemExit("tools/character_page_copy.py has no entry for %r" % key)

    url = "%s/%s/%s/" % (SITE, hub["slug"], group["slug"])
    path = "/%s/%s/" % (hub["slug"], group["slug"])
    count = len(group["items"])

    body = [
        '<main id="main" class="tool-page char-page" data-char-kind="%s" data-char-group="%s">'
        % (hub["kind"], esc(group["slug"])),
        hero(copy),
        switch(hub, groups, group["slug"]),
        filter_row(hub, count, copy["hint"]),
        grid(group["items"], hub["kind"]),
        '  </div>',
        '',
        '  <div id="copy-live-region" class="visually-hidden" aria-live="polite"></div>',
        '',
        prose(copy),
        faq_section(copy, "%s questions" % copy["h1"]),
        related(hub, groups, group["slug"]),
        '</main>',
    ]
    return shell(copy, url, path, "\n".join(body), "WebApplication")


def hub_page(hub, groups):
    copy = COPY.get(hub["slug"])
    if not copy:
        raise SystemExit("tools/character_page_copy.py has no entry for %r" % hub["slug"])

    url = "%s/%s/" % (SITE, hub["slug"])
    path = "/%s/" % hub["slug"]
    # What the filter box actually has to work with: the hub samples each
    # group rather than reprinting it, so promising 198 above 96 cards would be
    # a number the page cannot back up.
    shown = sum(min(len(g["items"]), HUB_SAMPLE) for g in groups)

    sections = []
    for g in groups:
        gcopy = COPY["%s/%s" % (hub["slug"], g["slug"])]
        sample = {"slug": g["slug"], "items": g["items"][:HUB_SAMPLE]}
        sections.append(
            '    <div class="char-group">\n'
            '      <h2 id="%s">%s</h2>\n'
            '      <p class="char-group-blurb">%s</p>\n'
            '%s\n'
            '      <p class="char-group-more"><a href="/%s/%s/">All %d %s &rarr;</a></p>\n'
            '    </div>'
            % (esc(g["slug"]), esc(gcopy["h1"]), esc(gcopy["hub_blurb"]),
               grid(sample["items"], hub["kind"]),
               hub["slug"], g["slug"], len(g["items"]), esc(gcopy["h1"].lower()))
        )

    body = [
        '<main id="main" class="tool-page char-page" data-char-kind="%s" data-char-group="">' % hub["kind"],
        hero(copy),
        switch(hub, groups, None),
        filter_row(hub, shown, hub["hint"]),
        '\n\n'.join(sections),
        '  </div>',
        '',
        '  <div id="copy-live-region" class="visually-hidden" aria-live="polite"></div>',
        '',
        prose(copy),
        faq_section(copy, "%s questions" % copy["h1"]),
        related(hub, groups, "\0"),  # no current group: list every one of them
        '</main>',
    ]
    return shell(copy, url, path, "\n".join(body), "CollectionPage")


def check_sitemap(stale):
    """The sitemap is build_style_pages.py's file; verify it knows about ours."""
    path = os.path.join(ROOT, "sitemap.xml")
    if not os.path.exists(path):
        stale.append("sitemap.xml (missing)")
        return
    text = open(path, encoding="utf-8").read()
    missing = [u for u in CHARACTER_URLS if "<loc>%s%s</loc>" % (SITE, u) not in text]
    if missing:
        stale.append("sitemap.xml (missing %d character URLs)" % len(missing))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="report stale/missing generated files instead of writing")
    args = ap.parse_args()

    data = load_catalogue()
    families = {"kaomoji": data["kaomoji"], "symbols": data["symbols"]}

    # The toolbar names each hub's tier-2 family so the owning rail chip can be
    # marked current on those pages. That list is a third copy of the same
    # slugs, so it is checked here rather than left to drift into a bar that
    # claims a page belongs to a family it was dropped from.
    for attr, hub_slug in (("KAOMOJI_MOODS", "kaomoji"), ("SYMBOL_KINDS", "symbols")):
        want = ["/%s/%s/" % (hub_slug, g["slug"]) for g in families[hub_slug]]
        got = [i["href"] for i in
               next(v for v in NAV.VARIANTS if v["parent"] == "/%s/" % hub_slug)["items"]]
        if got != want:
            raise SystemExit(
                "tools/nav_data.py %s and the catalogue disagree:\n  nav:  %s\n  data: %s"
                % (attr, got, want))

    stale = []
    pages = 0
    for hub in HUBS:
        groups = families[hub["kind"]]
        found = [g["slug"] for g in groups]
        if found != hub["slugs"]:
            raise SystemExit(
                "assets/js/characters.js and tools/character_page_copy.py disagree on "
                "the %s list:\n  data: %s\n  copy: %s" % (hub["kind"], found, hub["slugs"]))
        for g in groups:
            if not g["items"]:
                raise SystemExit("group %s/%s is empty" % (hub["kind"], g["slug"]))
            page = group_page(hub, groups, g)
            B.write(os.path.join(ROOT, hub["slug"], g["slug"], "index.html"), page, args.check, stale)
            pages += 1
        B.write(os.path.join(ROOT, hub["slug"], "index.html"), hub_page(hub, groups), args.check, stale)
        pages += 1

    if args.check:
        check_sitemap(stale)
        if stale:
            print("stale or missing (%d):" % len(stale))
            for s in stale:
                print("  " + s)
            print("\nrun: python3 tools/build_character_pages.py"
                  "\n and: python3 tools/build_style_pages.py   (it owns sitemap.xml)")
            return 1
        print("generated character pages are up to date (%d pages)" % pages)
        return 0

    print("wrote %d character pages" % pages)
    print("sitemap.xml is written by tools/build_style_pages.py — run that too")
    return 0


if __name__ == "__main__":
    sys.exit(main())
