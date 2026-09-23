#!/usr/bin/env python3
"""Render the portfolio toolbar into every page of a hand-duplicated site.

Stdlib only, no build step, nothing changes about how the site is hosted — this
writes the same static HTML the repo already ships. Copy this file verbatim to
another site in the portfolio; `nav_data.py` next to it is the only file that
differs.

    python3 tools/sync_nav.py --migrate   # once: strip the old nav, add markers
    python3 tools/sync_nav.py             # write every marked region
    python3 tools/sync_nav.py --check     # exit 1 if any file is stale

Each managed region is delimited by a pair of HTML comments:

    <!-- nav:start --> ... <!-- nav:end -->

so a page can opt into any subset; a file with no markers is left alone. The
indentation of the start marker is applied to every rendered line, so a region
nested deep inside a tool panel still reads as hand-written HTML.

The current page is identified by canonicalising the file's own path
(`/x/index.html` and `/x.html` both -> `/x`) and matching it against the hrefs
in nav_data, which is what lets both members of a flat-file/directory twin pair
be stamped with `aria-current="page"` from one list.

Two optional keys in nav_data tune the render without forking this file, and
both default to the shape every site had before they existed:

    RAIL_MAX  -- how many tier-1 tools the rail shows (default 8). Raise it
                 only where the rail's own horizontal scroll and edge fades
                 can carry the extra chips.
    VARIANTS  -- one dict, or a list of them, so a site with more than one
                 tier-2 family can mark each family's tier-1 owner.

`--check` is worth running before deploy: a second agent hand-editing one page
between sweeps is how these repos drift.
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import nav_data as D  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".worktrees", "node_modules", "tools", "assets"}


# --------------------------------------------------------------------------
# URLs
# --------------------------------------------------------------------------

def canon(url):
    """Comparable form of a URL or repo-relative path.

    `/x`, `/x/`, `/x.html` and `/x/index.html` are the same destination. Sites
    that write hrefs with a trailing slash and sites that write them bare both
    land on the same string, so this file needs no per-site convention.
    """
    u = url.split("#")[0].split("?")[0]
    if u.endswith("/index.html"):
        u = u[: -len("index.html")]
    elif u.endswith(".html"):
        u = u[: -len(".html")]
    u = u.rstrip("/")
    return u or "/"


def page_url(path):
    return canon("/" + path.relative_to(ROOT).as_posix())


def esc(text):
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def anchor(href, text, current, extra="", owns=()):
    """One anchor, with the page's only per-page difference stamped on it.

    `aria-current="page"` is reserved for a link that really does point at the
    page being rendered. A tier-1 tool whose tier-2 variant is the current page
    gets `aria-current="true"` instead — "the current item in this set" — which
    is what stops the rail looking unselected on every variant page without
    announcing a link to somewhere else as the current page.
    """
    if canon(href) == current:
        mark = ' aria-current="page"'
    elif current in owns:
        mark = ' aria-current="true"'
    else:
        mark = ""
    return '<a href="%s"%s%s>%s</a>' % (esc(href), extra, mark, esc(text))


# --------------------------------------------------------------------------
# Region renderers. Each takes the page's canonical URL and returns HTML at
# column 0; apply_regions() re-indents it to match the marker.
# --------------------------------------------------------------------------

def variant_families():
    """Every tier-2 family, as a list. One dict and a list of dicts both work."""
    v = getattr(D, "VARIANTS", None)
    if not v:
        return []
    return list(v) if isinstance(v, (list, tuple)) else [v]


def owned_urls(tool_href):
    """Tier-2 URLs that belong to this tier-1 tool, across every family."""
    owned = []
    for v in variant_families():
        if canon(v.get("parent", "")) == canon(tool_href):
            owned += [canon(i["href"]) for i in v["items"]]
    return tuple(owned)


def render_nav(url):
    tier1 = [t for t in D.TOOLS if t["tier"] == 1]
    rail = tier1[: getattr(D, "RAIL_MAX", 8)]
    count = len(tier1)

    out = []
    add = out.append
    add('<nav class="toolbar" aria-label="Tools">')
    add('  <details class="tb-menu">')
    # The count is the affordance an edge fade can never be, so it stays in the
    # accessible name at every width even where the noun is hidden below 400px.
    add('    <summary class="tb-trigger" aria-label="All %d %s">' % (count, esc(D.NOUN)))
    add('      <span class="tb-glyph" aria-hidden="true">&#9636;</span>')
    add('      <span class="tb-label">All %d<span class="tb-label-long"> %s</span></span>'
        % (count, esc(D.NOUN)))
    add("    </summary>")

    flat = count <= 8
    add('    <div class="tb-sheet%s">' % (" is-flat" if flat else ""))
    if flat:
        # Group headings are noise at this size; the whole set fits in one list.
        add("      <ul>")
        for t in tier1:
            add("        <li>%s</li>" % anchor(t["href"], t["long"], url, owns=owned_urls(t["href"])))
        add("      </ul>")
    else:
        for i, (key, title) in enumerate(D.GROUPS, start=1):
            members = [t for t in tier1 if t["group"] == key]
            if not members:
                continue
            gid = "tb-g%d" % i
            # <p>, not <h2>: these are SEO landing pages and chrome headings
            # would pollute the document outline. AT still announces the list.
            add('      <p class="tb-grouplabel" id="%s">%s</p>' % (gid, esc(title)))
            add('      <ul aria-labelledby="%s">' % gid)
            for t in members:
                add("        <li>%s</li>" % anchor(t["href"], t["long"], url, owns=owned_urls(t["href"])))
            add("      </ul>")
    for href, text in D.HUBS:
        add('      <p class="tb-hub">%s</p>' % anchor(href, text + " →", url))
    add("    </div>")
    add("  </details>")
    # Sibling of the <details>, not a child: the scrim is shown by CSS alone
    # (`.tb-menu[open] ~ .tb-scrim`) so it works with JS off, and being outside
    # the disclosure is what makes a tap on it count as a click-outside.
    add('  <div class="tb-scrim"></div>')

    add('  <ul class="tb-rail">')
    for t in rail:
        add("    <li>%s</li>" % anchor(t["href"], t["label"], url, owns=owned_urls(t["href"])))
    add("  </ul>")
    add("</nav>")
    return "\n".join(out)


def render_sizechips(url):
    """Tier-2 sibling chips: real links, inside the tool's own control panel."""
    families = variant_families()
    if not families:
        return ""
    v = families[0]
    label_id = "size-chips-label"
    out = ['<nav class="size-chips" aria-label="%s">' % esc(v["aria"]),
           '  <span class="size-chips-label" id="%s">%s</span>' % (label_id, esc(v["label"])),
           '  <ul aria-labelledby="%s">' % label_id]
    for item in v["items"]:
        data = ' data-target="%s"' % ("" if item["bytes"] is None else item["bytes"])
        out.append("    <li>%s</li>"
                   % anchor(item["href"], item["label"], url, extra=' class="chip"' + data))
    out += ["  </ul>", "</nav>"]
    return "\n".join(out)


def render_footernav(url):
    if not getattr(D, "FOOTER", None):
        return ""
    out = ['<nav class="footer-tools" aria-label="All tools">', "  <ul>"]
    for href, text in D.FOOTER:
        out.append("    <li>%s</li>" % anchor(href, text, url))
    out += ["  </ul>", "</nav>"]
    return "\n".join(out)


# The one contact address for the whole portfolio.
CONTACT_ADDRESS = "hello@goodbotbad.bot"
CONTACT_PROMPT = "Questions or a problem with a tool?"


def ncr(text):
    """Every character as a decimal numeric character reference.

    The HTML parser decodes these while it parses, so the `href` becomes a
    real `mailto:` URL, the anchor keeps its tab order, and a screen reader
    reads the plain address. Nothing here needs JavaScript, and a link that
    needs JavaScript to work is worse than an address in plain text.

    Encoding every character, not only the `@`, is what makes the raw bytes
    carry neither `@` nor `mailto:hello`. A scraper regex over the source
    finds no address to take.
    """
    return "".join("&#%d;" % ord(c) for c in text)


def render_contact():
    """The footer's contact line. One sentence and one real mailto link.

    `nav_data.CONTACT_PROMPT` overrides the sentence, because a site that is
    not a set of tools needs a different noun. The address never changes, so
    this file stays copyable to every other site in the portfolio.
    """
    prompt = esc(getattr(D, "CONTACT_PROMPT", CONTACT_PROMPT))
    return ('<p class="footer-contact">%s <a href="%s">%s</a></p>'
            % (prompt, ncr("mailto:" + CONTACT_ADDRESS), ncr(CONTACT_ADDRESS)))


def render_peers(url):
    """The footer's "Related tools" block and the contact line below it.

    Every page of this site links to the same four peers and shows the same
    address, so the block carries no per-page state and ignores `url`. It
    keeps the signature the other renderers have because `apply_regions` calls
    them all the same way.

    The contact line rides in this region rather than in a region of its own.
    One marked pair means one splice, so the generators and the hand-written
    pages pick up both halves of the footer from one function.

    The erabb.it mark stays where it is. This block sits beside it, not
    instead of it: the mark is the portfolio badge and this is the crawlable
    route between the sites.
    """
    out = []
    peers = getattr(D, "PEERS", None)
    if peers:
        out += ['<nav class="peer-sites" aria-label="Related tools">',
                '  <span class="peer-sites-label">Related tools</span>',
                '  <ul>']
        for p in peers:
            out.append('    <li><a href="%s">%s</a> <span class="peer-domain">%s</span></li>'
                       % (esc(p["href"]), esc(p["text"]), esc(p["domain"])))
        out += ['  </ul>', '</nav>']
    out.append(render_contact())
    return "\n".join(out)


RENDERERS = {
    "nav": render_nav,
    "sizechips": render_sizechips,
    "footernav": render_footernav,
    "peers": render_peers,
}


# --------------------------------------------------------------------------
# Splicing
# --------------------------------------------------------------------------

def region_re(name):
    return re.compile(
        r"([ \t]*)(<!-- %s:start -->)(.*?)([ \t]*)(<!-- %s:end -->)" % (name, name),
        re.S,
    )


def region(name, url, indent=""):
    """One marked region, markers included, rendered at `indent`.

    The generators call this to write the same regions into the pages they own,
    so a generated page and a hand-written one carry byte-identical markup and
    either tool's `--check` catches a drift in the other.
    """
    start = "<!-- %s:start -->" % name
    end = "<!-- %s:end -->" % name
    body = RENDERERS[name](url)
    if not body:
        return indent + start + end
    lines = "\n".join(indent + ln if ln else ln for ln in body.split("\n"))
    return "%s%s\n%s\n%s%s" % (indent, start, lines, indent, end)


def apply_regions(text, url):
    for name in RENDERERS:
        pattern = region_re(name)
        if not pattern.search(text):
            continue

        def splice(m, name=name):
            return region(name, url, m.group(1))

        text = pattern.sub(splice, text, count=1)
    return text


def html_files():
    for path in sorted(ROOT.rglob("*.html")):
        rel = path.relative_to(ROOT)
        if any(part in SKIP_DIRS or part.startswith(".") for part in rel.parts[:-1]):
            continue
        yield path


# --------------------------------------------------------------------------
# One-time migration: replace the legacy nav markup with marker pairs.
# The op list lives in nav_data.py because the legacy markup is per-site.
# --------------------------------------------------------------------------

def migrate(text):
    for op in getattr(D, "MIGRATE", []):
        kind = op["op"]
        if kind == "strip":
            text = re.sub(op["pattern"], "", text, count=1, flags=re.S)
            continue
        name = op["region"]
        if re.search(r"<!-- %s:start -->" % name, text):
            continue  # already migrated
        indent = op.get("indent", "")
        markers = "%s<!-- %s:start --><!-- %s:end -->" % (indent, name, name)
        if kind == "insert_after":
            text = re.sub(op["pattern"],
                          lambda m: m.group(0) + "\n\n" + markers,
                          text, count=1, flags=re.S)
        elif kind == "insert_before":
            text = re.sub(op["pattern"],
                          lambda m: markers + "\n\n" + m.group(0),
                          text, count=1, flags=re.S)
        elif kind == "replace":
            text = re.sub(op["pattern"], lambda m: markers, text, count=1, flags=re.S)
        else:
            raise SystemExit("unknown migrate op: %r" % kind)
    return text


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Sync the portfolio toolbar.")
    ap.add_argument("--migrate", action="store_true",
                    help="one-time: strip the legacy nav and insert the markers")
    ap.add_argument("--check", action="store_true",
                    help="exit 1 if any file's rendered region is stale")
    args = ap.parse_args()

    stale, written = [], []
    for path in html_files():
        original = path.read_text(encoding="utf-8")
        text = migrate(original) if args.migrate else original
        text = apply_regions(text, page_url(path))
        if text == original:
            continue
        if args.check:
            stale.append(path.relative_to(ROOT).as_posix())
        else:
            path.write_text(text, encoding="utf-8")
            written.append(path.relative_to(ROOT).as_posix())

    if args.check:
        if stale:
            print("stale nav in %d file(s):" % len(stale))
            for name in stale:
                print("  " + name)
            return 1
        print("nav is current in every file")
        return 0

    print("updated %d file(s)" % len(written))
    for name in written:
        print("  " + name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
