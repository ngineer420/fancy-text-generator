"""fontloom.com navigation data — the single source of truth for the toolbar.

This is the ONLY file that differs between sites. `sync_nav.py` is generic and
copies verbatim. Nothing here is computed at runtime by the browser: sync_nav
renders it into the static HTML of every hand-written page, and
`build_style_pages.py` imports the same renderer for the generated ones, so
there is exactly one definition of the bar in the repo.

Tier rule (portfolio spec, ngineer420.github.io#13): a page is tier 1 only if it
answers a *different question*. The same tool with a parameter baked in is
tier 2 — it never appears in the rail or the sheet body. It gets one hub link at
the bottom of the sheet plus real <a href> sibling chips inside the tool's own
control panel, where it is a parameter and not a peer.

Here ten tools are tier 1. The style landing pages are tier 2: every one of
them is the same styletool runtime with `data-style` set, which is a parameter,
not a peer. Their hub is /styles/ and their sibling chips sit under the h1 of
each style page — see `build_style_pages.py`.

/kaomoji/ and /symbols/ are tier 1 because the test is the question a page
answers, and theirs is "give me a face to put beside my words", not "restyle my
words". Nothing on either page is the style engine with a parameter changed —
they are a character catalogue wired into a composer, on their own runtime
(`characters-page.js`). What is a parameter is the *set* loaded into that
picker, so the fourteen mood and kind pages stay tier 2 under them.
"""

# Noun used in the menu trigger: "All 10 tools".
NOUN = "tools"

# Tier-1 tools, in rail order (the rail shows RAIL_MAX of them — see below).
# "/" is in the rail because it is itself a tool surface: the homepage is the
# live gallery where you type once and copy from any of the forty styles, not a
# landing page about the tools. It is also the tier-1 owner of the style pages,
# which is what stops the rail rendering unselected on all 32 of them.
#   label -> rail chip text, <= 18 chars
#   long  -> anchor text in the sheet and in any footer/in-body list
#   group -> sheet grouping key, in use here: this site is past 8 destinations
TOOLS = [
    {"href": "/",               "label": "All fonts",  "long": "All Fonts Gallery",    "group": "gallery", "tier": 1},
    {"href": "/flip/",          "label": "Flip",       "long": "Flip Text Upside Down", "group": "effect", "tier": 1},
    {"href": "/glitch/",        "label": "Glitch",     "long": "Glitch & Zalgo Text",   "group": "effect", "tier": 1},
    {"href": "/strikethrough/", "label": "Strike",     "long": "Strikethrough Text",    "group": "effect", "tier": 1},
    {"href": "/small-caps/",    "label": "Small Caps", "long": "Small Caps Text",       "group": "effect", "tier": 1},
    {"href": "/vaporwave/",     "label": "Vaporwave",  "long": "Vaporwave Text",        "group": "effect", "tier": 1},
    {"href": "/combine/",       "label": "Combiner",   "long": "Style Combiner",        "group": "build",  "tier": 1},
    {"href": "/mix/",           "label": "Mixer",      "long": "Per-Letter Mixer",      "group": "build",  "tier": 1},
    {"href": "/kaomoji/",       "label": "Kaomoji",    "long": "Kaomoji & Text Faces",  "group": "chars",  "tier": 1},
    {"href": "/symbols/",       "label": "Symbols",    "long": "Text Symbols",          "group": "chars",  "tier": 1},
]

# The rail shows all ten rather than the default eight. It is a scroller with
# edge fades already, so the two extra chips cost a short swipe on a phone and
# nothing at all on a desktop — where a hub link buried under the fold of the
# sheet cost the whole feature.
RAIL_MAX = 10

# Sheet groups, in order. Live now: past eight destinations the sheet stops
# rendering flat and groups instead, because a ten-item unlabelled list is a
# list you read rather than scan.
GROUPS = [
    ("gallery", "Every style at once"),
    ("effect", "One effect"),
    ("build",  "Build your own"),
    ("chars",  "Characters to put beside them"),
]

# Slugs of the 32 style landing pages. STYLE_COUNT is asserted against the real
# catalogue by build_style_pages.py, so the sheet's hub label cannot drift as
# styles are added.
STYLE_SLUGS = [
    "bold-text-generator", "italic-text-generator",
    "bold-italic-text-generator", "cursive-text-generator",
    "bold-cursive-text-generator", "gothic-font-generator",
    "bold-gothic-text-generator", "double-struck-text-generator",
    "monospace-text-generator", "sans-serif-text-generator",
    "sans-serif-bold-text-generator", "sans-serif-italic-text-generator",
    "sans-serif-bold-italic-text-generator", "small-text-generator",
    "bubble-text-generator", "black-bubble-text-generator",
    "squared-text-generator", "black-squared-text-generator",
    "parenthesized-text-generator", "flag-letters-generator",
    "faux-cyrillic-text-generator", "greek-style-text-generator",
    "currency-text-generator", "wide-text-generator", "superscript-generator",
    "subscript-generator", "strikethrough-text-generator",
    "underline-text-generator", "double-underline-text-generator",
    "slashed-text-generator", "overline-text-generator",
    "upside-down-text-generator",
]
STYLE_COUNT = len(STYLE_SLUGS)

# Slugs of the tier-2 pages under each character hub — the mood and kind pages,
# which really are the same picker with a different set loaded. Asserted against
# the real catalogue by build_character_pages.py so these cannot drift.
KAOMOJI_MOODS = [
    "happy", "sad", "angry", "love", "shrug", "cute", "table-flip", "animals",
]
SYMBOL_KINDS = [
    "hearts", "stars", "arrows", "check-and-cross", "brackets-and-borders",
    "music",
]

# One hub link, for the one tier-2 family whose owner cannot carry it in the
# rail: the 32 style pages, whose owner is the homepage. The character families
# need no hub link now that their owners are rail chips.
HUBS = [
    ("/styles/", "All %d styles" % STYLE_COUNT),
]

# Tier-2 families. Declared here so the owning rail chip carries
# aria-current="true" on each family's pages (spec #13 errata, defect 4) rather
# than the rail rendering unselected across the site's whole long tail. Every
# sibling cluster is emitted by the builders under each page's h1, not from a
# `sizechips` region: a cluster is the page's own category, which is per-page.
#
# A list, not one dict, because this site has three such families. sync_nav
# accepts either; the first entry is the one `render_sizechips` would use, and
# fontloom renders no sizechips region at all.
VARIANTS = [
    {
        "parent": "/",
        "label": "Style",
        "aria": "Text style",
        "items": [{"href": "/%s/" % s, "label": s, "bytes": None} for s in STYLE_SLUGS],
    },
    {
        "parent": "/kaomoji/",
        "label": "Mood",
        "aria": "Kaomoji mood",
        "items": [{"href": "/kaomoji/%s/" % s, "label": s, "bytes": None} for s in KAOMOJI_MOODS],
    },
    {
        "parent": "/symbols/",
        "label": "Kind",
        "aria": "Symbol kind",
        "items": [{"href": "/symbols/%s/" % s, "label": s, "bytes": None} for s in SYMBOL_KINDS],
    },
]

# Long anchor text for a footer crawl list, if the site has one. fontloom
# already ships two footer <nav>s (Tools and Platforms) written by hand and by
# build_style_pages.py; they stay exactly as they are, so this renderer has
# nothing to add.
FOOTER = []

# One-time --migrate: what the legacy markup looked like and where the marker
# pairs go. Per-site, because the legacy markup is per-site. Ops run in order.
# The generated style pages never see these: build_style_pages.py writes the
# marked region itself from the same renderer.
MIGRATE = [
    # The old header nav, nested inside .header-actions — which is what forced
    # the `display: contents` reflow trick at 760px and still let the last two
    # links scroll out of sight with no affordance.
    {"op": "strip", "pattern": r'\n      <nav class="site-nav".*?\n      </nav>'},
    # The toolbar is a direct child of <body>, immediately after </header>.
    {"op": "insert_after", "region": "nav", "pattern": r"</header>", "indent": ""},
]
