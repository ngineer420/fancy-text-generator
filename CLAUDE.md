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
  whole of every one of them is the **grid**: somebody who lands on /kaomoji/
  came for a face, so the filter box and then the faces are the page, and a
  card click **copies**. Styling is a link out — every card's
  `＋ Add fancy text` goes to `/?text=<char> `. There is no composer here and
  no styled sample either; see *One styler, and it is the homepage*.
  Currency, zodiac and dingbats were
  deliberately cut: currency duplicates `/currency-text-generator/`, the other
  two were thin. Every surviving symbol page carries 40+ entries, asserted.
  `characters.js` is a build-time data file: `build_character_pages.py` bakes
  the grids into the HTML, so those pages never fetch it. The one thing that
  does is `charinsert.js`, on demand.
- **The character inserter** — `assets/js/charinsert.js`, on `/` and
  `/combine/` only. Opt in with `data-char-insert` on the `.input-shell`; it
  builds the button, the tabbed panel and the grid itself, so JavaScript off
  leaves no dead control. It fetches `characters.js` (~12kB gzipped) the first
  time the panel opens rather than on page load. On the homepage it is also
  the **change-the-face control**: the face lives in the ordinary text box,
  so changing it is picking another one from this panel, and no second
  editing surface has to exist anywhere. It integrates with its host page
  through exactly one line — it dispatches a bubbling `input` event after
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
  a parameter changed; they are a character catalogue on their own script.
  They spent one release as `HUBS` entries at the foot of the sheet and were,
  in practice, undiscoverable.
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
"Faces & Symbols" pills, and carries a pill in its banner with the visitor's
typed text already in it. Favorites are strictly user-created (starred styles
pin to the gallery front; combos/mixes are named on save and appear as chips
on the tool pages).

**Where that pill goes depends on whether there is anywhere to go.** A combo
opens the Combiner and a mix opens the Mixer, because those are real editors
this page is not. The four character *pairings* have no such editor — this
page is already the styler and already carries *Add a face* — so their pill
is `＋ Add face` / `＋ Add symbol` and it acts **here**: it puts the plain
arrangement in the box and lets the forty tiles answer. The href says the
same thing (`/?text=…`) so a middle click and JavaScript-off both work, but
the click handler cancels it rather than reloading the page to change one
input. The two picker tiles (`char-kaomoji`, `char-symbols`) keep a real link,
to `/kaomoji/` and `/symbols/`, because browsing two hundred faces by mood is
a page and not a control. Only a pill that *leaves* carries a `data-dest`
colour, so those two are now the only coloured character tiles.

**Plain, never styled, into the box.** The box holds words for forty styles to
work on. Putting `(◕‿◕) 𝒽𝒾` in it freezes one style and leaves the other
thirty-nine with nothing to do — `charExampleText()` is `applyCharExample()`
with the style dropped for exactly this.

**A second press replaces, it does not stack.** Once one of these tiles has
run, the box holds a face, so the next press finds one already where it wants
to go. `applyCharExample()` strips a leading or trailing *picture* — the same
"less than half letters" test `markable()` uses, exposed as
`isPictureToken()` — before setting its own character down. Without it the
gallery showed `(◕‿◕) (◕‿◕) hi (≧▽≦)` and looked unable to read its own
input. The one token never stripped is the only one: a box holding just a
face is holding its text.

**Every tile in the gallery answers to typing** — there is no exception, and
one was tried. Two tiles briefly showed a fixed row of characters to advertise
the pickers; they were the only ones in a fifty-tile grid that held still while
you typed, and that reads as broken rather than as a sampler. The pickers get
an ordinary example tile each instead (`char-kaomoji`, `char-symbols`): no
`styleId`, two different characters, one at each end. They carry no style
because there is nothing useful to apply — 186 of the 198 kaomoji contain no
letter at all, so every font style is a literal no-op on the face, and of the
twelve that do, most would get a single eye bolded (`＼(^𝐨^)／`), which reads as
a rendering fault. What varies on those tiles is the characters.

A `CHAR_EXAMPLES` entry sets one catalogue character around text run through
one style. Its `styleId` must be a substitution alphabet — combining marks
paint a bar across a face, for the reason under *Combining marks and fullwidth
do not mix* — and its `char` must be in `characters.js`, so the glyph has
actually been through `check_glyphs.mjs`. Both are asserted by
`test/characters.test.js`.

### The tile banner: one height, and colour that means one thing
Every gallery tile ends in a full-bleed banner. Three rules:
- **Colour means "this card goes somewhere", and says where — quietly.** Only
  a tile with an Edit carries any, keyed by `data-dest` to one of three
  `--dest-*` tokens (Combiner, Mixer, the character pickers), which are the
  three stops of the brand gradient. It is a **2px rule along the top of the
  banner and the pill's text, and nothing else**: no tinted banner, no filled
  pill. Two rounds of this were too loud — first every category tinted, then
  the destination tinted plus a filled pill — and the lesson each time was
  that the signal needs less, not a different hue. Categories are **not**
  colour-coded. The pill names its destination as well as wearing it, so a
  combo is distinguishable from a mix in monochrome.
- **Every banner is the same height** — `min-height: 44px`, two lines of
  label, used or not, and `.tile-name` is line-clamped to two. The banner is
  what made neighbouring cards differ in height when examples grew a tag row
  and a recipe row; a grid of cards that are all *nearly* the same height
  reads as broken in a way a grid of identical ones does not. The recipe now
  lives in the tile's `title` and the Edit link's `aria-label`.
- **The name wraps, it never ellipses.** The names that used to be cut —
  "GOTHIC × DOUBLE-STR…" — are exactly the ones that say what the tile is.
- **The banner's negative margin reads `--tile-pad-x` / `--tile-pad-b`**, set
  on `.tile`. A tile with different padding would otherwise have its banner
  hanging 2px off each edge.

### One styler, and it is the homepage
There is one place on this site where text gets styled, and it has all forty
styles in it. Everything else hands off to it.

The character pages spent three releases trying to be a second one. First a
composer above the grid, which answered "what does this page do" with the
wrong one of the two things it does; then the composer below the grid; then a
two-slot builder with the face and the words in separate boxes and the
arrangement carried in the URL. Each round fixed the previous round's
complaint and kept the mistake underneath: a smaller styler, six styles
instead of forty, one link away from the real one. Following a homepage tile
into it meant landing on a page that had *lost* the style you clicked to get
there.

So the picker pages do not style anything. Every card carries the same one
action — **`＋ Add fancy text`**, a link to `/?text=<char> `, the generator
with that character already in the box. Baked into the HTML by the builder,
so it works with JavaScript off.

Three styled advert cards used to sit spliced into each grid, from the
release where the only route to the styler was a composer at the foot of the
page. They went when every card became that link: they were a third message
saying what ninety-six cards already said, and the only thing on the page
wearing text the visitor had not typed. Don't put them back without first
having an answer to "what does this say that the ninety-six do not".

**Carrying, and only when carrying is real.** A visitor who arrived from a
homepage picker tile has a line already, and on this page that line is the
*constant* while the character is the *variable* — every card is the same
words with a different face in front of them. That is the whole reason the
page never needed a text box:
- the homepage picker tiles link to `/kaomoji/?text=<words>` — the words,
  never the face, because the face is the one thing this page changes;
- `characters-page.js` reads `?text=` once and writes it into every link that
  leaves: the cards, the mood chips, the hop to the other family, the group
  links on a hub. Losing the line by pressing "Cute" would make the chips a
  trap rather than a filter;
- the `.char-carry` strip says what is being held and links **back to the
  generator** to change it. It is baked `hidden` and only ever unhidden by
  the runtime, so a visit with no text makes no claim;
- links are built with `encodeURIComponent`, not `URLSearchParams` — the
  latter spells a space `+`, and the site would then write the same line two
  ways on one page.

Nothing is stored. The line lives in the URL for exactly as long as the
visitor is inside the picker.

And on the homepage, the face is just **text in the text box**, which is what
makes the whole arrangement hold together — the forty tiles restyle around it
for free, and *Add a face* changes it. No third surface, no `?face=` /
`?place=` / `?style=` parameters, nothing on the picker pages to keep in sync
with the styler.

If a picker page ever needs a text box again, that is the signal that the
homepage is missing something — go and put it there.

### Substitution is welcome inside a face; an overlay is not
This is the distinction, not "face versus word". A substitution alphabet
swaps a glyph for a same-shaped one, so it belongs inside a kaomoji —
`(T_T)` in bold is `(𝐓_𝐓)`, still a face and arguably a better one, and
that happens today with no special handling. An **overlay** draws a line
*through* the glyph, and a line through a cat's face is not a style, it is
damage.

So `markable()` gates the overlays — the five combining-mark styles and
zalgo — and works a **word at a time**. A whitespace-delimited run that is
at least half letters and digits is a word: its letters take a mark, and so
does punctuation between two marked characters, with the word's own edges
closing the run. That keeps a strike unbroken through "isn't", "3.14",
"(parenthetical)" and a trailing "!". Anything else is a picture —
`(=^･ω･^=)`, `:)`, `¯\_(ツ)_/¯` — and takes nothing at all, *including the
one Greek letter in the middle of the cat* that would otherwise qualify on
its own. Wide, fullwidth, kana and Hangul bases are never marked in either
case. Six tests in `core.test.js` hold this down; don't "simplify" it back
to marking everything but the space, and don't reduce it to a per-character
rule — per-character was the version that left a bar through the omega.

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
with the letters hidden. This is enforced in the engine now — see *Where a
combining mark is allowed to land* — rather than left to whoever writes the
next preset, but don't offer the combination as a recipe either: the result
is text with nothing visibly done to it.

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
