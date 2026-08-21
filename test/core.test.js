/* Unit tests for the pure FancyText transform engine.
   No framework needed — run with: node test/core.test.js */

"use strict";

const assert = require("assert");
const FancyText = require("../assets/js/fancytext-core.js");

const { STYLES, STYLE_BY_ID, splitGraphemes, flipText } = FancyText;

const t = (id) => STYLE_BY_ID[id].transform;

let count = 0;
function test(name, fn) {
  fn();
  count++;
  console.log("ok  " + name);
}

test("every style transforms a sample string without throwing", () => {
  for (const style of STYLES) {
    const out = style.transform("Fancy Text 123!");
    assert.strictEqual(typeof out, "string", style.id);
    assert.ok(out.length > 0, style.id);
    assert.strictEqual(typeof style.transform(""), "string", style.id + " on empty input");
  }
});

test("bold maps letters and digits", () => {
  assert.strictEqual(t("bold")("Fancy 42"), "𝐅𝐚𝐧𝐜𝐲 𝟒𝟐");
});

test("partial-coverage styles fall back to the plain character", () => {
  // No uppercase subscript letters exist; q has no subscript either.
  assert.strictEqual(t("subscript")("Faq 1"), "Fₐq ₁");
});

test("splitGraphemes keeps combining marks with their base letter", () => {
  const underlined = t("underline")("ab"); // a̲b̲ — 4 code points, 2 graphemes
  assert.strictEqual(splitGraphemes(underlined).length, 2);
});

test("upside-down matches the classic flip output", () => {
  assert.strictEqual(flipText("fancy text"), "ʇxǝʇ ʎɔuɐɟ");
});

test("flip after underline keeps each mark on its own letter", () => {
  // The chain that motivated grapheme handling: underline first, then flip.
  // Reversing by code point would strand every U+0332 on the wrong letter.
  const expected = "ʇ̲x̲ǝ̲ʇ̲ ʎ̲ɔ̲u̲ɐ̲ɟ̲";
  assert.strictEqual(flipText(t("underline")("fancy text")), expected);
  // Same result as the order users discover by copy-pasting: flip, then underline.
  assert.strictEqual(t("underline")(flipText("fancy text")), expected);
});

test("alphabet styles still map base letters inside mark clusters", () => {
  // underline → bold: the 'a' inside "a̲" must still become 𝐚.
  assert.strictEqual(t("bold")(t("underline")("ab")), "𝐚̲𝐛̲");
});

test("combining-mark effects add one mark per grapheme, not per code point", () => {
  const once = t("underline")("ab");
  const twice = t("strikethrough")(once); // a̶̲b̶̲ — one strike each, not two
  const clusters = splitGraphemes(twice);
  assert.strictEqual(clusters.length, 2);
  for (const g of clusters) assert.strictEqual(Array.from(g).length, 3);
});

test("spaced/hearts operate on graphemes of already-styled text", () => {
  assert.strictEqual(t("spaced")(t("underline")("ab")), "a̲ b̲");
  assert.strictEqual(t("hearts-between")("ab"), "a♥b");
});

test("mirror reverses grapheme clusters intact", () => {
  const out = t("mirror")(t("underline")("be"));
  // b→d, e→ɘ, reversed order, marks still one per cluster
  assert.strictEqual(out, "ɘ̲d̲");
  assert.strictEqual(splitGraphemes(out).length, 2);
});

test("zalgo stacks marks onto graphemes and keeps spaces clean", () => {
  const out = FancyText.zalgoText("ab cd", "heavy");
  assert.ok(Array.from(out).length > 5);
  assert.strictEqual(out.split(" ").length, 2);
});

test("wholeString flags mark exactly the sequence-level styles", () => {
  const flagged = STYLES.filter((s) => s.wholeString).map((s) => s.id).sort();
  assert.deepStrictEqual(flagged, [
    "hearts-between", "mirror", "ornamental-wrap", "spaced", "star-wrap",
  ].sort());
});

test("random flag marks the zalgo styles", () => {
  const flagged = STYLES.filter((s) => s.random).map((s) => s.id).sort();
  assert.deepStrictEqual(flagged, ["zalgo-heavy", "zalgo-light", "zalgo-medium"]);
});

test("combo and mix examples reference only real, deterministic styles", () => {
  FancyText.COMBO_EXAMPLES.forEach((ex) => {
    ex.ids.forEach((id) => {
      assert.ok(STYLE_BY_ID[id], ex.name + " references unknown style " + id);
      assert.ok(!STYLE_BY_ID[id].random, ex.name + " uses a random style");
    });
  });
  FancyText.MIX_EXAMPLES.forEach((ex) => {
    ex.styleIds.forEach((id) => {
      assert.ok(STYLE_BY_ID[id], ex.name + " references unknown style " + id);
      assert.ok(!STYLE_BY_ID[id].random && !STYLE_BY_ID[id].wholeString,
        ex.name + " uses a style the Mixer can't paint per letter");
    });
  });
});

test("applyChain matches transforming step by step", () => {
  const manual = t("underline")(t("upside-down")("Fancy Text"));
  assert.strictEqual(FancyText.applyChain(["upside-down", "underline"], "Fancy Text"), manual);
  assert.strictEqual(FancyText.applyChain([], "abc"), "abc");
});

test("mixPatternIds cycles over letters and skips whitespace", () => {
  const ids = FancyText.mixPatternIds(["bold", "script"], "ab cd");
  assert.deepStrictEqual(ids, ["bold", "script", null, "bold", "script"]);
});

test("applyMixPattern styles each letter and leaves spaces alone", () => {
  const out = FancyText.applyMixPattern(["bold", "script"], "ab cd");
  const b = (c) => t("bold")(c);
  const s = (c) => t("script")(c);
  assert.strictEqual(out, b("a") + s("b") + " " + b("c") + s("d"));
});

/* ------------------ overline, support notes, counting, zalgo cap ------------------ */

test("overline attaches U+0305 to every character", () => {
  const out = t("overline")("abc");
  assert.strictEqual(out, "a̅b̅c̅");
  // Codepoint-level check rather than "it got longer": the mark must be the
  // combining overline, not the spacing macron U+00AF that looks identical.
  assert.deepStrictEqual(
    Array.from(out).map((c) => c.codePointAt(0)),
    [0x61, 0x305, 0x62, 0x305, 0x63, 0x305]
  );
  assert.strictEqual(splitGraphemes(out).length, 3, "still three visible characters");
});

test("every style has a where-this-works note", () => {
  for (const style of STYLES) {
    const note = FancyText.supportNote(style.id);
    assert.ok(note && note.works && note.watch, style.id + " has no support note");
    assert.ok(note.kind, style.id + " support note has no kind");
  }
});

test("support notes are attached by mechanism, not guessed", () => {
  assert.strictEqual(FancyText.supportNote("bold").kind, "math");
  assert.strictEqual(FancyText.supportNote("underline").kind, "combining");
  assert.strictEqual(FancyText.supportNote("overline").kind, "combining");
  assert.strictEqual(FancyText.supportNote("small-caps").kind, "partial");
  assert.strictEqual(FancyText.supportNote("fullwidth").kind, "fullwidth");
  assert.strictEqual(FancyText.supportNote("zalgo-heavy").kind, "zalgo");
  assert.strictEqual(FancyText.supportNote("regional-indicator").kind, "flags");
  // An id nobody registered still gets the conservative default rather than
  // undefined, because the UI renders this unconditionally.
  assert.strictEqual(FancyText.supportNote("not-a-style").kind, "math");
});

test("countText separates what you see from what a limit counts", () => {
  const plain = FancyText.countText("Fancy Text");
  assert.deepStrictEqual(plain, { visible: 10, counted: 10, utf16: 10 });

  // The whole reason the readout exists: an underline doubles the count and
  // changes nothing visible.
  const c = FancyText.countText(t("underline")("Fancy"));
  assert.strictEqual(c.visible, 5, "still five characters to a human");
  assert.strictEqual(c.counted, 10, "ten to anything counting code points");

  // Spaces take no mark, so the multiplier is not a flat 2× — which is why
  // the readout reports the real number rather than computing one.
  const spaced = FancyText.countText(t("underline")("Fancy Text"));
  assert.strictEqual(spaced.visible, 10);
  assert.strictEqual(spaced.counted, 19, "nine marked letters plus an unmarked space");

  // Math Alphanumeric letters are outside the BMP, so UTF-16 counts double
  // while code points do not — a different limit, tripped a different way.
  const bold = FancyText.countText(t("bold")("Fancy"));
  assert.strictEqual(bold.visible, 5);
  assert.strictEqual(bold.counted, 5);
  assert.strictEqual(bold.utf16, 10, "surrogate pairs are two UTF-16 units each");

  assert.deepStrictEqual(FancyText.countText(""), { visible: 0, counted: 0, utf16: 0 });
  assert.deepStrictEqual(FancyText.countText(null), { visible: 0, counted: 0, utf16: 0 });
});

test("zalgo intensity is capped so it cannot lock the browser", () => {
  const MAX = FancyText.ZALGO_MAX_MARKS;
  // The cap has to hold at the top of the slider and beyond it, including
  // for values no UI should ever send.
  for (const level of [100, 250, Infinity, "heavy"]) {
    const out = FancyText.zalgoText("abcdefghij", level);
    for (const cluster of splitGraphemes(out)) {
      const marks = Array.from(cluster).length - 1;
      assert.ok(marks <= MAX, "level " + level + " produced " + marks + " marks (cap " + MAX + ")");
    }
  }
});

test("zalgoRanges maps the slider onto mark counts without exceeding the cap", () => {
  const MAX = FancyText.ZALGO_MAX_MARKS;
  for (let pct = 0; pct <= 100; pct += 5) {
    const r = FancyText.zalgoRanges(pct);
    assert.strictEqual(r.intensity, pct);
    for (const key of ["up", "down", "mid"]) {
      assert.ok(r[key][0] >= 0, pct + "% " + key + " has a negative floor");
      assert.ok(r[key][0] <= r[key][1], pct + "% " + key + " range is inverted");
      assert.ok(r[key][1] <= MAX, pct + "% " + key + " exceeds the cap");
    }
  }
  // Zero intensity is genuinely no marks, not "a few".
  const zero = FancyText.zalgoRanges(0);
  assert.deepStrictEqual([zero.up, zero.down, zero.mid], [[0, 0], [0, 0], [0, 0]]);
  assert.strictEqual(FancyText.zalgoText("abc", 0), "abc", "0% leaves the text alone");
  // Garbage in still produces a usable range rather than NaN counts.
  assert.strictEqual(FancyText.zalgoRanges("nonsense").intensity, FancyText.ZALGO_LEVELS.medium);
});

test("the named zalgo levels still sit on the slider scale", () => {
  for (const [name, pct] of Object.entries(FancyText.ZALGO_LEVELS)) {
    assert.strictEqual(FancyText.zalgoRanges(name).intensity, pct, name);
    assert.ok(pct > 0 && pct <= 100, name + " is off the scale");
  }
  // Light must stay lighter than heavy, or the tiles lie about themselves.
  assert.ok(FancyText.zalgoRanges("light").up[1] < FancyText.zalgoRanges("heavy").up[1]);
});

/* ------------------------- the focused tool pages ------------------------- */

test("every style the tool pages name exists in the registry", () => {
  // Mirrors the `chain` lists in assets/js/styletool.js. A typo there is a
  // silently blank card, which is exactly the failure a test should catch.
  const chains = [
    ["upside-down"], ["mirror"], ["upside-down", "mirror"], ["upside-down", "underline"],
    ["strikethrough"], ["underline"], ["double-underline"], ["overline"], ["slashed"],
    ["strikethrough", "underline"],
    ["small-caps"], ["superscript"], ["subscript"], ["small-caps", "underline"],
    ["fullwidth"], ["spaced"], ["fullwidth", "spaced"],
  ];
  for (const chain of chains) {
    for (const id of chain) {
      assert.ok(STYLE_BY_ID[id], "styletool.js names a style that does not exist: " + id);
    }
    const out = FancyText.applyChain(chain, "Fancy Text");
    assert.ok(out.length > 0, chain.join("+") + " produced nothing");
  }
});

test("the documented small-caps and script gaps are the real ones", () => {
  // The pages promise specific missing letters. If Unicode coverage here ever
  // changes, the copy is wrong and this fails rather than misleading anyone.
  const gaps = (id, chars) =>
    Array.from(chars).filter((c) => t(id)(c) === c).join("");
  assert.strictEqual(gaps("small-caps", "abcdefghijklmnopqrstuvwxyz"), "qx");
  assert.strictEqual(gaps("superscript", "abcdefghijklmnopqrstuvwxyz"), "q");
  assert.strictEqual(gaps("superscript", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "CFQSVXYZ");
  assert.strictEqual(gaps("subscript", "abcdefghijklmnopqrstuvwxyz"), "bcdfgqwyz");
  assert.strictEqual(
    gaps("subscript", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "subscript has no capitals at all"
  );
});

test("fullwidth maps to the real fullwidth block, not padded letters", () => {
  const out = t("fullwidth")("Ab1");
  assert.strictEqual(out, "Ａｂ１");
  assert.deepStrictEqual(
    Array.from(out).map((c) => c.codePointAt(0)),
    [0xff21, 0xff42, 0xff11]
  );
  // And it is genuinely different from inserting spaces, which is the claim
  // the vaporwave page makes.
  assert.notStrictEqual(t("fullwidth")("ab"), t("spaced")("ab"));
});

test("upside-down produces the documented turned characters", () => {
  const out = flipText("fancy text");
  assert.strictEqual(out, "ʇxǝʇ ʎɔuɐɟ");
  // Assert the actual codepoints, not just that something came back: these
  // must be the real turned letters (U+0287 turned t, U+025F dotless j with
  // stroke standing in for f, …) rather than visually similar substitutes.
  assert.deepStrictEqual(
    Array.from(out).map((c) => c.codePointAt(0)),
    [0x287, 0x78, 0x1dd, 0x287, 0x20, 0x28e, 0x254, 0x75, 0x250, 0x25f]
  );
});

test("mirror round-trips, and upside-down deliberately does not", () => {
  // Mirror is a true involution: reverse twice and you are back.
  assert.strictEqual(FancyText.mirrorText(FancyText.mirrorText("fancy")), "fancy");

  // Upside-down is not, and should not be claimed to be. The turned glyphs
  // have no entry pointing back at the plain letters, so a second flip only
  // restores the characters that happen to be their own turned form. This is
  // asserted rather than left implicit so nobody "fixes" it into a round-trip
  // and silently changes what the /flip/ page produces.
  assert.strictEqual(flipText(flipText("fancy text")), "ɟɐnɔʎ ʇǝxʇ");
});

/* ---------------------------- style landing pages ---------------------------- */
/* STYLE_PAGES drives which URLs tools/build_style_pages.py writes, so a typo
   in it is a 404 on the live site rather than a failing import. */

test("every STYLE_PAGES entry points at a real, deterministic style", () => {
  for (const page of FancyText.STYLE_PAGES) {
    const style = STYLE_BY_ID[page.id];
    assert.ok(style, "STYLE_PAGES references unknown style id: " + page.id);
    // A page bakes in a character map, so a style whose output changes on
    // every call cannot have one — the page and the tool on it would disagree
    // the moment it loaded.
    assert.ok(!style.random, page.id + " is random and cannot have a generated page");
    // Two calls, same answer: the build has to be reproducible.
    assert.strictEqual(style.transform("Fancy Text"), style.transform("Fancy Text"), page.id);
  }
});

test("style page slugs are unique, url-safe, and keyword-shaped", () => {
  const seen = new Set();
  for (const page of FancyText.STYLE_PAGES) {
    assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(page.slug), "bad slug: " + page.slug);
    assert.ok(!seen.has(page.slug), "duplicate slug: " + page.slug);
    seen.add(page.slug);
    assert.ok(page.slug.endsWith("-generator"), page.slug + " should read as the query");
  }
  // The tool pages own these paths already; a style page must not collide.
  for (const taken of ["combine", "mix", "flip", "glitch", "strikethrough", "small-caps", "vaporwave"]) {
    assert.ok(!seen.has(taken), "slug collides with an existing tool page: " + taken);
  }
});

test("stylePagePath resolves only styles that have a page", () => {
  assert.strictEqual(FancyText.stylePagePath("bold"), "/bold-text-generator/");
  assert.strictEqual(FancyText.stylePagePath("zalgo-heavy"), null);
  assert.strictEqual(FancyText.stylePagePath("nonsense"), null);
});

test("every style with a page produces a character map worth printing", () => {
  // The point of these pages is the static A-Z table. A style that left the
  // whole alphabet untouched would render 62 identical cells and deserve no
  // page at all, so the build should never be able to produce one silently.
  for (const page of FancyText.STYLE_PAGES) {
    const style = STYLE_BY_ID[page.id];
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const changed = Array.from(letters).filter((ch) => style.transform(ch) !== ch);
    // Subscript is the floor and the reason the floor is this low: Unicode
    // has no subscript capitals at all and only seventeen lowercase letters.
    // Anything thinner than that is a no-op wearing a page.
    assert.ok(changed.length >= 15,
      page.id + " only changes " + changed.length + " of 52 letters");
  }
});

// ---------------------------------------------------------------------
// Where a combining mark is allowed to land
// ---------------------------------------------------------------------

const COMBINING_STYLES = ["strikethrough", "underline", "double-underline", "slashed", "overline"];
const marked = (id, text) => FancyText.STYLE_BY_ID[id].transform(text);

test("a combining mark runs unbroken through ordinary punctuation", () => {
  // The commonest thing anybody does with these: strike a sentence. A mark
  // that skipped the comma would leave a visible gap in the middle of it.
  for (const id of COMBINING_STYLES) {
    const out = marked(id, "isn't 3.14, wow!");
    for (const ch of ["n", "'", "t", "3", ".", "1", "4", ",", "w", "!"]) {
      const at = out.indexOf(ch);
      assert.ok(at !== -1 && /\p{M}/u.test(out[at + 1] || ""),
        id + " left " + JSON.stringify(ch) + " unmarked in a sentence");
    }
  }
});

test("a combining mark never lands on the brackets a kaomoji is made of", () => {
  // Drawn on these it is drawn to their width, meets itself end to end and
  // paints a bar over the face. The words beside it still get marked.
  for (const id of COMBINING_STYLES) {
    const out = marked(id, "(=^･ω･^=) meow");
    // Including the omega. It is a letter, so it qualifies on its own — but
    // it is the middle of a cat, and a line through that is not a style.
    for (const ch of ["(", "=", "^", "･", "ω", ")"]) {
      const at = out.indexOf(ch);
      assert.ok(at !== -1 && !/\p{M}/u.test(out[at + 1] || ""),
        id + " marked " + JSON.stringify(ch) + ", which is part of the face");
    }
    assert.ok(/m\p{M}/u.test(out), id + " did not mark the word beside the face");
  }
});

test("an overlay leaves a whole face alone, not just its punctuation", () => {
  // The rule is per whitespace-delimited run: a run that is at least half
  // letters is a word, anything else is a picture and takes nothing.
  for (const id of COMBINING_STYLES.concat(["zalgo-heavy"])) {
    for (const face of ["(◕‿◕)", "(=^･ω･^=)", "(T_T)", ":)", "¯\\_(ツ)_/¯", "(≧▽≦)"]) {
      const out = marked(id, face + " hello");
      assert.ok(out.startsWith(face + " "),
        id + " modified " + face + " -> " + JSON.stringify(out.split(" ")[0]));
      assert.ok(/h\p{M}/u.test(out), id + " left the word beside " + face + " unmarked");
    }
  }
});

test("a combining mark never lands on a fullwidth character", () => {
  // The rule the site already states as "combining marks and fullwidth do
  // not mix", enforced per character rather than left to the visitor.
  const wide = FancyText.STYLE_BY_ID.fullwidth.transform("Fancy");
  for (const id of COMBINING_STYLES) {
    assert.strictEqual(marked(id, wide), wide,
      id + " marked fullwidth text, which renders as solid bars");
  }
});

test("a combining mark still lands on every alphabet the engine produces", () => {
  // Marks stacked on a substitution style is what the Combiner is for, so
  // the skip rule must not quietly break the combo presets.
  for (const base of ["bold", "script", "fraktur", "small-caps", "upside-down", "superscript"]) {
    const styled = FancyText.STYLE_BY_ID[base].transform("Fancy");
    for (const id of COMBINING_STYLES) {
      const out = marked(id, styled);
      assert.ok(out.length > styled.length,
        id + " added nothing to " + base + " text");
    }
  }
});

test("every preset combo still reads as combined", () => {
  for (const ex of FancyText.COMBO_EXAMPLES) {
    const out = FancyText.applyChain(ex.ids, "Fancy Text");
    assert.ok(/\p{M}/u.test(out) || out !== "Fancy Text",
      ex.id + " produces text with nothing visibly done to it");
  }
});

test("a picture is told from a word by the same rule marks use", () => {
  for (const pic of ["(◕‿◕)", "♡", "「", "¯\\_(ツ)_/¯", "(=^･ω･^=)", ":)", "┻━┻"]) {
    assert.ok(FancyText.isPictureToken(pic), JSON.stringify(pic) + " read as a word");
  }
  for (const word of ["hi", "Fancy", "3.14", "isn't", "café"]) {
    assert.ok(!FancyText.isPictureToken(word), JSON.stringify(word) + " read as a picture");
  }
});

test("a character example never stacks a second face on the first", () => {
  // Pressing one of these tiles puts its own arrangement in the box, so the
  // next press finds a face already where it wants to go. Replacing is the
  // useful reading; stacking is what produced "(◕‿◕) (◕‿◕) hi (≧▽≦)".
  for (const ex of FancyText.CHAR_EXAMPLES) {
    const once = FancyText.charExampleText(ex, "hi");
    const twice = FancyText.charExampleText(ex, once);
    assert.strictEqual(twice, once, ex.id + " stacks its character on a second press");
    // And it survives a face it did not put there.
    const other = FancyText.charExampleText(ex, "(=^･ω･^=) hi (≧▽≦)");
    assert.ok(!/\(=\^･ω･\^=\)\s*\(/.test(other),
      ex.id + " left a doubled face: " + other);
  }
});

test("a character example puts plain words in the box, never styled ones", () => {
  // The box feeds forty styles. A styled string in it leaves thirty-nine of
  // them with nothing to do, because an alphabet no-ops on its own output.
  for (const ex of FancyText.CHAR_EXAMPLES) {
    const plain = FancyText.charExampleText(ex, "Fancy Text");
    assert.ok(plain.includes("Fancy Text"),
      ex.id + " handed off styled text: " + plain);
  }
});

test("a box holding only a face still has its face used as text", () => {
  // The one token that is never stripped is the only one — otherwise the
  // press would empty the box.
  const ex = FancyText.CHAR_EXAMPLES.find((e) => e.place === "before");
  assert.ok(FancyText.charExampleText(ex, "(◕‿◕)").includes("(◕‿◕)"));
});

console.log("\nAll " + count + " tests passed.");
