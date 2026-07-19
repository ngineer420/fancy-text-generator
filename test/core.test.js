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

console.log("\nAll " + count + " tests passed.");
