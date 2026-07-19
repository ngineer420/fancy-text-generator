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
- Tests are plain Node asserts, no frameworks: `node test/core.test.js`,
  `node test/favorites.test.js`. For UI changes, drive the real page in jsdom
  (install jsdom in a temp dir, load the HTML, eval the site scripts, dispatch
  DOMContentLoaded, click things) rather than trusting a visual read of the
  code.

## Product shape

Three tools sharing one transform engine (`FancyText` in
`assets/js/fancytext-core.js`, requirable from Node):

- **Homepage `/`** — flat gallery of all 39 styles; type once, copy anywhere.
- **Combiner `/combine/`** — chain up to 6 styles; each step's output feeds
  the next. URL state: `?text=&chain=id1,id2`.
- **Mixer `/mix/`** — a different style per letter (paint, or pattern
  buttons). URL state: `?text=&styles=id1,-,id2` (`-` = plain, one entry per
  grapheme).

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
(`COMBO_EXAMPLES` / `MIX_EXAMPLES`) and render on the homepage as ordinary
gallery tiles **mixed in beside their ingredient styles** (never a pinned
strip above the gallery). Each is copyable, tagged `combo`/`mix`, filterable
via the homepage-only "Combos & Mixes" pill, and carries an ✎ link into its
editor with the visitor's typed text. Favorites are strictly user-created
(starred styles pin to the gallery front; combos/mixes are named on save and
appear as chips on the tool pages).

### Combo quality bar
A preset combo must (a) render cleanly and (b) look **obviously** combined.
The Unicode reality behind that: combining marks (underline, strikethrough,
slash) stack on anything but render badly on Math Alphanumeric letters
(bold/script/fraktur…) and well on BMP letters (upside-down, small caps,
super/subscript). Alphabet styles no-op on already-styled text — so recipes
are "at most one alphabet style first, then effects". Subtle results
(spacing tweaks) don't make the cut; crossed/underlined/flipped stacks do.
Zalgo (`random: true`) never goes in a preset or example.

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
  the favorites store migrates via one-time flags rather than key bumps.
