# fontloom.com — working notes for Claude

Static, zero-dependency site (vanilla HTML/CSS/JS, no build step) deployed on
GitHub Pages. `README.md` covers architecture and file layout; this file
records the product/UX decisions that aren't visible in the code and the
conventions every change must follow.

## Shipping conventions

- Work in a worktree under `.claude/worktrees/`, open a draft PR, and merge
  only when Max says to (usually "merge it"). Squash-merge.
- **Cache busting is mandatory**: GitHub Pages serves `max-age=600`. When any
  JS/CSS file changes, bump its `?v=` on **every** HTML page that references
  it (styles.css is referenced by all ~10 pages, including `articles/*.html`).
- **Ads: AdSense Auto ads only.** One script tag in each page's `<head>`
  (client `ca-pub-7560786263587509`). NEVER add `.ad-slot` divs or manual ad
  units.
- **Generated files are never hand-edited.** The 32 per-style landing pages
  (`/bold-text-generator/`, `/cursive-text-generator/`, … — one per entry in
  `FancyText.STYLE_PAGES`), `/styles/`, the marked link-mesh block in
  `index.html`, and `sitemap.xml` are written by
  `python3 tools/build_style_pages.py`. Change
  `tools/style_page_copy.py` or `STYLE_PAGES` and rebuild;
  `python3 tools/build_style_pages.py --check` fails while anything on disk
  differs, and must pass before a PR. Every generated file carries a
  do-not-edit banner as its second line.
- **The character pages have their own generator.** `/kaomoji/` and
  `/symbols/` plus their 14 mood/kind pages come from
  `python3 tools/build_character_pages.py`, data in `assets/js/characters.js`
  and copy in `tools/character_page_copy.py`. It shares the page shell by
  importing `build_style_pages`, and it deliberately does **not** write
  `sitemap.xml` — that file has one writer, `build_style_pages.py`, which
  imports `CHARACTER_URLS`. Run both, and both `--check`s.
- **Nothing goes in `characters.js` that has not been rendered.** The site
  loads no webfont, so a character the device lacks a glyph for is a tofu box
  and a picker full of those is worse than a smaller picker.
  `node tools/check_glyphs.mjs` paints every code point in real headless
  Chrome and fails on anything matching the bitmap of an unassigned one. It
  certifies the machine it runs on, which is still the check worth having.
- Tests are plain Node asserts, no frameworks: `node test/core.test.js`,
  `node test/favorites.test.js`, `node test/platform.test.js`,
  `node test/characters.test.js`. For UI changes, drive the real page in jsdom
  (install jsdom in a temp dir, load the HTML, eval the site scripts, dispatch
  DOMContentLoaded, click things) rather than trusting a visual read of the
  code.

## Product shape

Ten tools sharing one transform engine (`FancyText` in
`assets/js/fancytext-core.js`, requirable from Node):

- **Homepage `/`** — flat gallery of all 40 styles; type once, copy anywhere.
- **Combiner `/combine/`** — chain up to 6 styles; each step's output feeds
  the next. URL state: `?text=&chain=id1,id2`.
- **Mixer `/mix/`** — a different style per letter (paint, or pattern
  buttons). URL state: `?text=&styles=id1,-,id2` (`-` = plain, one entry per
  grapheme).
- **32 style landing pages** — one generated page per style that substitutes
  character for character (`/cursive-text-generator/`, `/bubble-text-generator/`,
  …). Same `styletool.js` runtime, locked to one style with `data-style` on
  `<main>`; the page itself bakes in the full A–Z character map as static HTML
  and the support note, so it is real content with JavaScript off (which is
  why the locked card omits the note — `staticSupport`).
- **Four platform pages** — `/instagram-fonts/`, `/discord-fonts/`,
  `/tiktok-fonts/`, `/twitter-fonts/`. Hand-written, and the only pages that
  make per-platform claims. The shortlist each publishes comes from
  `tools/platform_check.js` (Unicode blocks, emoji property, RTL characters,
  code-point cost against the field limit) and is asserted against the HTML by
  `test/platform.test.js`. Never write "we tested this on an iPhone" — nobody
  did, the test forbids it, and the pages say what was actually checked.
- **Sixteen character pickers** — `/kaomoji/` and `/symbols/` (tier-1 tools in
  their own right — see *Navigation*), plus a page per mood (happy, sad,
  angry, love, shrug, cute, table-flip, animals) and per kind (hearts, stars,
  arrows, check-and-cross, brackets-and-borders, music). The
  headline element on every one of them is the **composer**, not the grid: a
  card click inserts its character into the styler input at the cursor and the
  line restyles, and copying is the secondary action on its own button. A
  picker that only copies is a dead end — the visitor leaves with a clipboard
  and never touches the font engine, which is the whole reason these pages are
  fontloom's rather than generic. Currency, zodiac and dingbats were
  deliberately cut: currency duplicates `/currency-text-generator/`, the other
  two were thin. Every surviving symbol page carries 40+ entries, asserted.
  `characters.js` is a build-time data file: `build_character_pages.py` bakes
  the grids into the HTML, so those pages never fetch it. The one thing that
  does is `charinsert.js`, on demand.
- **The character inserter** — `assets/js/charinsert.js`, on `/` and
  `/combine/` only. Opt in with `data-char-insert` on the `.input-shell`; it
  builds the button, the tabbed panel and the grid itself, so JavaScript off
  leaves no dead control. It fetches `characters.js` (~12kB gzipped) the first
  time the panel opens rather than on page load, and integrates with its host
  page through exactly one line — it dispatches a bubbling `input` event after
  inserting at the cursor, and knows nothing else about what the page does
  with the text. **Not on `/mix/`**: the Mixer paints one style per grapheme
  and a kaomoji is a dozen of them, so a face would fill its paint strip with
  a dozen cells nobody wants to paint.
- **Five focused pages** — `/flip/`, `/glitch/`, `/strikethrough/`,
  `/small-caps/`, `/vaporwave/`. One query cluster each, all driven by the
  single `assets/js/styletool.js` runtime off a `data-tool` attribute on
  `<main>`; the shortlist of styles and the copy live in its `TOOLS` table.
  URL state: `?text=` only. Adding a tool means an entry in `TOOLS` and a page
  from the same shell — never a sixth near-identical script.

## Navigation — one toolbar, one data file

The nav is the portfolio toolbar (spec: ngineer420.github.io#13, reference
implementation: photoshrink#7). There is exactly one definition of it:

- `tools/nav_data.py` holds TOOLS/GROUPS/HUBS. `tools/sync_nav.py` is generic
  and copied verbatim from photoshrink — do not fork it. Two optional keys let
  a site tune it instead: `RAIL_MAX` (default 8) is how many tier-1 chips the
  rail shows, and `VARIANTS` may be one dict or a list of them, for a site
  with more than one tier-2 family. Both default to the old behaviour, so the
  file still copies verbatim — but a site that already took a copy needs a
  fresh one before it can use either key.
- Hand-written pages carry a `<!-- nav:start -->…<!-- nav:end -->` region that
  `python3 tools/sync_nav.py` rewrites; `--check` exits nonzero on drift.
  `build_style_pages.py` imports `sync_nav.render_nav` and writes the same
  region into the generated pages, so both `--check`s guard the same markup.
- The **ten tools** are tier 1 (rail + grouped sheet). `/` is one of them: the
  homepage is itself a tool surface — the live gallery where you type once and
  copy from any style — not a landing page about the tools. It is also the
  tier-1 owner of the style pages, which is what stops the rail rendering
  unselected on all 32 of them.
- The **32 style pages** are tier 2: out of the rail and the sheet body,
  reached by the sheet's one hub link to `/styles/` plus the `.style-switch`
  chip cluster under the h1 of every style page (its own category's siblings,
  not all 32).
- `nav_data.STYLE_SLUGS` is asserted against the real catalogue by
  `build_style_pages.py`, so the "All 32 styles" label cannot drift.
- `/kaomoji/` and `/symbols/` are **tier 1**, with `RAIL_MAX = 10`. The tier
  test is the question a page answers, and theirs is "give me a face to put
  beside my words" — not "restyle my words". Neither is the style runtime with
  a parameter changed; they are a character catalogue wired into a composer on
  their own script. They spent one release as `HUBS` entries at the foot of
  the sheet and were, in practice, undiscoverable.
- The **14 mood and kind pages** under them are tier 2 — *that* is where the
  parameter is, the set loaded into the same picker — so they get sibling
  chips under each h1 and a `VARIANTS` family each, which is what marks their
  owner's rail chip `aria-current="true"`. `nav_data.KAOMOJI_MOODS` and
  `SYMBOL_KINDS` are asserted against the catalogue by
  `build_character_pages.py`, the same guard `STYLE_SLUGS` has.
- `assets/js/toolbar.js` is the toolbar's enhancement script (fades, Escape,
  click-outside), a separate file because 404, privacy, terms and the articles
  carry the toolbar but load no other JS.
- Nothing in the chrome is sticky — a sticky header can overlay an AdSense
  anchor unit. Header + 45px bar is 96px of chrome on every page.

## UX rules (hard-won — don't regress these)

### Keep the copyable result above the fold
Nothing may auto-expand and push the result panel off screen. The Combiner
loads fully **collapsed** (no step editing, no gallery open). Any inline
gallery caps its height (`min(46vh, 420px)`) and scrolls internally.

### Preview before pick — no blind dropdowns
Style choices are made from **tile galleries showing the live transformed
text**, never from `<select>`s or name-only lists. In the Combiner, the
gallery expands *inside* the step being edited: tiles preview the text
**through that step** (steps 1..N-1 + that candidate), the current style is
marked active (accent border, ✓), no-op styles are dimmed, and later steps
stay put and re-derive from each pick.

### Click targets must match what looks clickable
If a card toggles something, the **whole card** is the target (buttons and
any expanded content inside opt out via `closest()`), with a visible labeled
affordance (the "✎ Change" / "▾ Done" pill) and a hover accent — never just
an unlabeled header strip.

### Introduce features with examples, not defaults
No seeded "default favorites". Preset recipes live in core
(`COMBO_EXAMPLES` / `MIX_EXAMPLES` / `CHAR_EXAMPLES`) and render on the
homepage as ordinary gallery tiles **mixed in beside their ingredient styles**
(never a pinned strip above the gallery). Each is copyable, tagged
`combo`/`mix`/`face`, filterable via the homepage-only "Combos & Mixes" and
"Faces & Symbols" pills, and carries an Edit link into its editor with the
visitor's typed text. Favorites are strictly user-created (starred styles pin
to the gallery front; combos/mixes are named on save and appear as chips on
the tool pages).

A `CHAR_EXAMPLES` entry sets one catalogue character around text run through
one style. Its `styleId` must be a substitution alphabet — combining marks
paint a bar across a face, for the reason under *Combining marks and fullwidth
do not mix* — and its `char` must be in `characters.js`, so the glyph has
actually been through `check_glyphs.mjs`. Both are asserted by
`test/characters.test.js`.

### The tile banner carries the details; the copy doesn't
Every gallery tile ends in a full-bleed banner tinted by its category
(`data-cat` on the tile, one `--cat-*` token per category in the stylesheet;
the two brand-gradient ends are reserved for the example families). Three
rules it exists to enforce:
- **The name wraps, it never ellipses.** The names that used to be cut —
  "GOTHIC × DOUBLE-STR…" — are exactly the ones that say what the tile is.
- **An example spells its recipe out** on a second line, but only where that
  says something the name does not: a mix called "Circled × Squared" made of
  Circled and Squared gets no second line. `addsToName()` in `app.js` decides,
  comparing with the joiners stripped.
- **The way into the tool is a labelled pill on its own row**, not a glyph. It
  was a 55%-opacity ✎ that only reached full opacity on `:hover` — i.e. never,
  on a phone — and it is the entire reason an example tile is in the gallery.

### Combo quality bar
A preset combo must (a) render cleanly and (b) look **obviously** combined.
The Unicode reality behind that: combining marks (underline, strikethrough,
slash) stack on anything but render badly on Math Alphanumeric letters
(bold/script/fraktur…) and well on BMP letters (upside-down, small caps,
super/subscript). Alphabet styles no-op on already-styled text — so recipes
are "at most one alphabet style first, then effects". Subtle results
(spacing tweaks) don't make the cut; crossed/underlined/flipped stacks do.
Zalgo (`random: true`) never goes in a preset or example.

### Say where it works, and what it costs
Every tool page carries two things that are not decoration:
- a **"where this works" note** per style, from `supportNote(id)` in core.
  Notes attach by *mechanism* (math alphabet / combining mark / enclosed /
  partial coverage / fullwidth / reordered / zalgo), because the mechanism is
  what decides the answer — not one hand-written line per style.
- a **character-count readout** (`Site.renderCharCount`), reporting visible
  characters and, when they differ, what the string counts as against a length
  limit. This is the most-reported surprise with fancy text and it is
  completely invisible without the number.

### Zalgo has a hard cap
`ZALGO_MAX_MARKS` (12) is a safety limit, not a style choice: shaping cost is
super-linear in marks per base character, so an uncapped slider hangs the tab.
Budget in **code points**, not draws from the mark pool — one pool entry
(U+0344) is stored decomposed and is two marks in one string.

### Combining marks and fullwidth do not mix
A strikethrough or underline is drawn to the width of its base character, so
on fullwidth bases the marks meet end to end and render as solid black bars
with the letters hidden. Don't offer that combination.

### Small patterns to preserve
- Tiles that contain buttons are `div[role=button][tabindex=0]` with
  Enter/Space handling — no nested `<button>`s.
- Anything expandable carries `aria-expanded`; copy actions announce via the
  `#copy-live-region` polite live region.
- Sample text is "Fancy Text" whenever the input is empty; typing swaps it in
  live everywhere (including example-tile ✎ hrefs).
- Unicode gaps (subscript missing letters, small caps q/x) fall back to plain
  characters — this is expected, not a bug; don't "fix" it.
- localStorage access always wrapped (private mode falls back to in-memory);
  the favorites store migrates via one-time flags rather than key bumps. It
  now holds four kinds — styles, combos, mixes and `chars` (kaomoji and symbols,
  stored as the literal string, which is also their identity). A store written
  before `chars` existed gains the array in place; bumping `KEY` would throw
  away every favorite anybody has.
- The homepage accepts `?text=`, because the character pages hand off to it.
  A link that says "open this in the full generator" and silently drops the
  line would be worse than no link.
