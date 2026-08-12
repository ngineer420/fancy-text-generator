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

Here the seven tools are tier 1 and the style landing pages are tier 2: every
one of them is the same styletool runtime with `data-style` set, which is a
parameter, not a peer. Their hub is /styles/ and their sibling chips sit under
the h1 of each style page — see `build_style_pages.py`.
"""

# Noun used in the menu trigger: "All 7 tools".
NOUN = "tools"

# Tier-1 tools, in rail order (rail is capped at 8 — this site has 7).
#   label -> rail chip text, <= 18 chars
#   long  -> anchor text in the sheet and in any footer/in-body list
#   group -> sheet grouping key, only used once a site passes 8 destinations
TOOLS = [
    {"href": "/flip/",          "label": "Flip",       "long": "Flip Text Upside Down", "group": "effect", "tier": 1},
    {"href": "/glitch/",        "label": "Glitch",     "long": "Glitch & Zalgo Text",   "group": "effect", "tier": 1},
    {"href": "/strikethrough/", "label": "Strike",     "long": "Strikethrough Text",    "group": "effect", "tier": 1},
    {"href": "/small-caps/",    "label": "Small Caps", "long": "Small Caps Text",       "group": "effect", "tier": 1},
    {"href": "/vaporwave/",     "label": "Vaporwave",  "long": "Vaporwave Text",        "group": "effect", "tier": 1},
    {"href": "/combine/",       "label": "Combiner",   "long": "Style Combiner",        "group": "build",  "tier": 1},
    {"href": "/mix/",           "label": "Mixer",      "long": "Per-Letter Mixer",      "group": "build",  "tier": 1},
]

# Sheet groups, in order. Unused at <= 8 destinations (the sheet renders flat,
# because group headings are noise at that size) — kept so the arrangement is
# already decided the day this site gains a ninth tool.
GROUPS = [
    ("effect", "One effect"),
    ("build",  "Build your own"),
]

# One hub link at the bottom of the sheet per tier-2 family. STYLE_COUNT is
# asserted against the real catalogue by build_style_pages.py, so this label
# cannot drift as styles are added.
STYLE_COUNT = 32
HUBS = [("/styles/", "All %d styles" % STYLE_COUNT)]

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
