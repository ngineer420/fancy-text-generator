/* Fancy Text transform engine — fontloom.com
   Pure, no DOM dependency: this file defines the FancyText namespace used by
   every page (index, /combine/, /mix/) and can be unit-tested from Node with
   `require()`. Per-page DOM wiring lives in app.js / combine.js / mix.js. */

(function (global) {
  "use strict";

  /* ============================= build helpers ============================= */

  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const DIGITS = "0123456789";

  // Splits a string into user-perceived characters (grapheme clusters), so a
  // base letter travels together with any combining marks attached to it —
  // essential once transforms are chained (e.g. underline then upside-down:
  // reversing by code point would detach every U+0332 onto the wrong letter).
  // Intl.Segmenter is in every modern browser and Node 16+; the Array.from
  // fallback still handles surrogate pairs, just not mark clusters.
  const graphemeSegmenter =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;

  function splitGraphemes(str) {
    if (graphemeSegmenter) {
      return Array.from(graphemeSegmenter.segment(str), (s) => s.segment);
    }
    return Array.from(str);
  }

  // Builds a { 'A': '𝐀', 'a': '𝐚', ... } map for a contiguous run in the
  // Mathematical Alphanumeric Symbols block (U+1D400–U+1D7FF), patching in
  // the small number of "holes" in that block that fall back to legacy
  // Letterlike Symbols codepoints instead (a well-documented Unicode quirk).
  function buildAlphabetMap(upperStart, lowerStart, upperExceptions, lowerExceptions) {
    const map = {};
    for (let i = 0; i < 26; i++) {
      const U = UPPER[i];
      const L = LOWER[i];
      map[U] = (upperExceptions && upperExceptions[U]) || String.fromCodePoint(upperStart + i);
      map[L] = (lowerExceptions && lowerExceptions[L]) || String.fromCodePoint(lowerStart + i);
    }
    return map;
  }

  function buildDigitMap(start) {
    const map = {};
    for (let i = 0; i < 10; i++) map[DIGITS[i]] = String.fromCodePoint(start + i);
    return map;
  }

  // `alphabetUpper`/`alphabetLower`/`digitString` are each either an
  // array-like of 26 (or 10) characters, or null/undefined to mean "leave
  // this whole tier unmapped" (mapTransform then passes those characters
  // through untouched). Individual null/undefined slots within an array
  // mean the same thing for that one character (used for partial-coverage
  // styles like subscript/superscript).
  function buildFromString(alphabetUpper, alphabetLower, digitString) {
    const map = {};
    for (let i = 0; i < 26; i++) {
      if (alphabetUpper && alphabetUpper[i]) map[UPPER[i]] = alphabetUpper[i];
      if (alphabetLower && alphabetLower[i]) map[LOWER[i]] = alphabetLower[i];
    }
    if (digitString) {
      for (let i = 0; i < 10; i++) if (digitString[i]) map[DIGITS[i]] = digitString[i];
    }
    return map;
  }

  function merge() {
    return Object.assign({}, ...arguments);
  }

  // Returns a transform function that substitutes each character via `map`,
  // leaving any character not present in the map untouched. This is also how
  // every "graceful fallback" (e.g. missing sub/superscript letters) works —
  // simply omit that key from the map and the original character passes
  // through instead of producing blank/undefined output. Iterating by code
  // point (not grapheme) is deliberate: it lets the base letter inside an
  // existing mark cluster still get mapped (underline → bold works), while
  // the combining marks themselves pass through untouched.
  function mapTransform(map) {
    return function (input) {
      return Array.from(input)
        .map((ch) => (Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch))
        .join("");
    };
  }

  /* ============================= Mathematical Alphanumeric Symbols ============================= */
  /* Block: U+1D400–U+1D7FF. Each style is 26 capitals + 26 lowercase in a
     contiguous run, with a handful of exceptions that reuse pre-existing
     Letterlike Symbols codepoints (Unicode didn't duplicate characters that
     already existed). Digit sub-block: U+1D7CE–1D7FF — only Bold,
     Double-Struck, Sans-Serif, Sans-Serif Bold and Monospace have digits;
     the rest fall back to plain ASCII digits (no math-italic/script/fraktur
     digits exist in Unicode). */

  const boldMap = merge(
    buildAlphabetMap(0x1d400, 0x1d41a),
    buildDigitMap(0x1d7ce)
  );

  const italicMap = buildAlphabetMap(0x1d434, 0x1d44e, null, { h: "ℎ" }); // planck constant ℎ

  const boldItalicMap = buildAlphabetMap(0x1d468, 0x1d482);

  const scriptMap = buildAlphabetMap(
    0x1d49c,
    0x1d4b6,
    { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ" },
    { e: "ℯ", g: "ℊ", o: "ℴ" }
  );

  const boldScriptMap = buildAlphabetMap(0x1d4d0, 0x1d4ea);

  const frakturMap = buildAlphabetMap(0x1d504, 0x1d51e, {
    C: "ℭ",
    H: "ℌ",
    I: "ℑ",
    R: "ℜ",
    Z: "ℨ",
  });

  const doubleStruckMap = merge(
    buildAlphabetMap(0x1d538, 0x1d552, {
      C: "ℂ",
      H: "ℍ",
      N: "ℕ",
      P: "ℙ",
      Q: "ℚ",
      R: "ℝ",
      Z: "ℤ",
    }),
    buildDigitMap(0x1d7d8)
  );

  const boldFrakturMap = buildAlphabetMap(0x1d56c, 0x1d586);

  const sansSerifMap = merge(buildAlphabetMap(0x1d5a0, 0x1d5ba), buildDigitMap(0x1d7e2));

  const sansBoldMap = merge(buildAlphabetMap(0x1d5d4, 0x1d5ee), buildDigitMap(0x1d7ec));

  const sansItalicMap = buildAlphabetMap(0x1d608, 0x1d622);

  const sansBoldItalicMap = buildAlphabetMap(0x1d63c, 0x1d656);

  const monospaceMap = merge(buildAlphabetMap(0x1d670, 0x1d68a), buildDigitMap(0x1d7f6));

  /* ============================= scattered lookup styles ============================= */

  // Small caps: real Unicode "Latin Letter Small Capital" characters scraped
  // from IPA Extensions / Phonetic Extensions / Latin Extended-D. Two
  // letters (q, x) have no dedicated small-cap codepoint anywhere in
  // Unicode, so they fall back to the plain lowercase letter.
  const smallCapsMap = buildFromString(
    null, // uppercase input passes through unchanged (already "caps")
    [
      "ᴀ", "ʙ", "ᴄ", "ᴅ", "ᴇ", "ꜰ", "ɢ", "ʜ",
      "ɪ", "ᴊ", "ᴋ", "ʟ", "ᴍ", "ɴ", "ᴏ", "ᴘ",
      null /* q: no small-cap glyph exists */, "ʀ", "ꜱ", "ᴛ", "ᴜ",
      "ᴠ", "ᴡ", null /* x: no small-cap glyph exists */, "ʏ", "ᴢ",
    ].map((c, i) => c || LOWER[i]) // fill nulls with plain fallback letter
  );

  // Circled: uppercase/lowercase Ⓐ/ⓐ block (U+24B6/24D0), digit 0 is a lone
  // codepoint (U+24EA) while 1–9 live in the earlier "circled digit" range.
  const circledMap = buildFromString(
    Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x24b6 + i)),
    Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x24d0 + i)),
    ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"]
  );

  // Negative (filled) circled: only an uppercase set exists in Unicode
  // (Enclosed Alphanumeric Supplement); lowercase input reuses the same
  // glyphs. Digits use the "dingbat negative circled digit" range.
  const negativeCircledUpper = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1f150 + i));
  const negativeCircledMap = buildFromString(
    negativeCircledUpper,
    negativeCircledUpper,
    ["⓿", "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾"]
  );

  // Squared: uppercase-only set in Unicode; lowercase input reuses it too.
  // No squared digits exist, so digits fall back to plain.
  const squaredUpper = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1f130 + i));
  const squaredMap = buildFromString(squaredUpper, squaredUpper, null);

  // Negative (filled) squared — same story as negative circled.
  const negativeSquaredUpper = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1f170 + i));
  const negativeSquaredMap = buildFromString(negativeSquaredUpper, negativeSquaredUpper, null);

  // Parenthesized: lowercase ⒜ (U+249C) and uppercase 🄐 (U+1F110) sets both
  // exist; digits 1–9 use the "parenthesized digit" range (U+2474). There is
  // no parenthesized zero, so 0 falls back to plain.
  const parenthesizedMap = buildFromString(
    Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1f110 + i)),
    Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x249c + i)),
    [null, "⑴", "⑵", "⑶", "⑷", "⑸", "⑹", "⑺", "⑻", "⑼"]
  );

  // Regional indicators: the 🇦–🇿 range (U+1F1E6) that flag emoji are built
  // from. Adjacent pairs would render as country flags, so the transform
  // below inserts a space between consecutive mapped letters.
  const regionalUpper = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1f1e6 + i));
  const regionalMap = buildFromString(regionalUpper, regionalUpper, null);

  function regionalIndicatorText(str) {
    const out = [];
    let prevMapped = false;
    for (const ch of str) {
      const mapped = Object.prototype.hasOwnProperty.call(regionalMap, ch);
      if (mapped && prevMapped) out.push(" ");
      out.push(mapped ? regionalMap[ch] : ch);
      prevMapped = mapped;
    }
    return out.join("");
  }

  // Fullwidth: shifts ASCII into the CJK "Fullwidth Forms" block, plus a
  // handful of common punctuation marks for nicer results.
  const fullwidthMap = merge(
    buildFromString(
      Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0xff21 + i)),
      Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0xff41 + i)),
      Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0xff10 + i))
    ),
    {
      " ": "　", "!": "！", '"': "＂", "'": "＇", "(": "（", ")": "）",
      ",": "，", "-": "－", ".": "．", ":": "：", ";": "；", "?": "？",
    }
  );

  // Superscript: legacy Latin-1 leftovers (¹²³) plus IPA/Phonetic modifier
  // letters. Coverage is incomplete on purpose — several uppercase letters
  // (C, F, Q, S, V, X, Y, Z) have no superscript codepoint in Unicode at
  // all, so they fall back to the plain capital letter rather than break.
  const superscriptUpperObj = {
    A: "ᴬ", B: "ᴮ", D: "ᴰ", E: "ᴱ", G: "ᴳ", H: "ᴴ", I: "ᴵ",
    J: "ᴶ", K: "ᴷ", L: "ᴸ", M: "ᴹ", N: "ᴺ", O: "ᴼ", P: "ᴾ",
    R: "ᴿ", T: "ᵀ", U: "ᵁ", W: "ᵂ",
  };
  const superscriptLowerObj = {
    a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ",
    h: "ʰ", i: "ⁱ", j: "ʲ", k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ",
    o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ", t: "ᵗ", u: "ᵘ", v: "ᵛ",
    w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ",
  };
  const superscriptUpperArr = Array.from({ length: 26 }, (_, i) => superscriptUpperObj[UPPER[i]] || null);
  const superscriptLowerArr = Array.from({ length: 26 }, (_, i) => superscriptLowerObj[LOWER[i]] || null);
  const finalSuperscriptMap = buildFromString(
    superscriptUpperArr,
    superscriptLowerArr,
    ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"]
  );

  // Subscript: coverage is much sparser than superscript — no uppercase
  // subscript letters exist in Unicode at all, and only about a dozen
  // lowercase letters do. Every unmapped letter falls back to itself, which
  // is the important "don't produce blank output" behavior for this style.
  const subscriptLowerObj = {
    a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ",
    m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ",
    u: "ᵤ", v: "ᵥ", x: "ₓ",
  };
  const subscriptLowerArr = Array.from({ length: 26 }, (_, i) => subscriptLowerObj[LOWER[i]] || null);
  const subscriptMap = buildFromString(
    null,
    subscriptLowerArr,
    ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"]
  );

  /* ============================= lookalike alphabets ============================= */
  /* Curated substitution alphabets built from letters in other scripts that
     merely *resemble* Latin ones. Letters with no convincing lookalike stay
     as themselves — same graceful-fallback rule as everywhere else. */

  // Faux Cyrillic: the classic "Soviet poster" look (Я for R, И for N, Д for
  // A). Purely visual — the Cyrillic letters don't sound like their Latin
  // lookalikes.
  const fauxCyrillicMap = buildFromString(
    ["Д", "Б", "С", "D", "Э", "F", "G", "Н", "І", "Ј", "К", "L", "М",
     "И", "О", "Р", "Q", "Я", "Ѕ", "Т", "Ц", "V", "Ш", "Х", "У", "З"],
    ["а", "в", "с", "d", "є", "f", "g", "н", "і", "ј", "к", "l", "м",
     "и", "о", "р", "q", "я", "ѕ", "т", "ц", "v", "ш", "х", "у", "z"],
    null
  );

  // Greek-ish symbol alphabet (α в ¢ ∂ є…), a longtime MySpace/MSN favorite.
  // One set only — uppercase input maps to the same glyphs.
  const greekStyleLower = ["α", "в", "¢", "∂", "є", "ƒ", "ﻭ", "н", "ι", "נ", "к", "ℓ", "м",
     "η", "σ", "ρ", "q", "я", "ѕ", "т", "υ", "ν", "ω", "χ", "у", "z"];
  const greekStyleMap = buildFromString(greekStyleLower, greekStyleLower, null);

  // Currency / crossed-letter alphabet (₳ ฿ ₵ Đ…): currency signs and
  // stroked Latin letters. One set only — both cases map to the same glyphs.
  const currencyUpper = ["₳", "฿", "₵", "Đ", "Ɇ", "₣", "₲", "Ⱨ", "ł", "J", "₭", "Ⱡ", "₥",
     "₦", "Ø", "₱", "Q", "Ɽ", "₴", "₮", "Ʉ", "V", "₩", "Ӿ", "Ɏ", "Ⱬ"];
  const currencyMap = buildFromString(currencyUpper, currencyUpper, null);

  /* ============================= character-substitution effects ============================= */

  const FLIP_MAP = {
    a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ",
    h: "ɥ", i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u",
    o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ",
    w: "ʍ", x: "x", y: "ʎ", z: "z",
    "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "5",
    "6": "9", "7": "ㄥ", "8": "8", "9": "6",
    ".": "˙", ",": "'", "'": ",", '"': ",,", "?": "¿", "!": "¡",
    "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<",
    "&": "⅋", "_": "‾",
  };

  // Substitutes code points *within* each grapheme cluster (so a combining
  // underline/strikethrough stays glued to its flipped letter), then
  // reverses the cluster order — not the code point order, which would strand
  // every combining mark on the wrong neighbor.
  function flipText(str) {
    return splitGraphemes(str.toLowerCase())
      .map((g) =>
        Array.from(g)
          .map((ch) => (Object.prototype.hasOwnProperty.call(FLIP_MAP, ch) ? FLIP_MAP[ch] : ch))
          .join("")
      )
      .reverse()
      .join("");
  }

  const MIRROR_MAP = { b: "d", d: "b", p: "q", q: "p", E: "Ǝ", e: "ɘ" };

  function mirrorText(str) {
    return splitGraphemes(str)
      .map((g) =>
        Array.from(g)
          .map((ch) => (Object.prototype.hasOwnProperty.call(MIRROR_MAP, ch) ? MIRROR_MAP[ch] : ch))
          .join("")
      )
      .reverse()
      .join("");
  }

  // Combining-mark effects (strikethrough, underline, …): one mark appended
  // per grapheme cluster, so an already-styled letter gets exactly one mark
  // instead of one per code point.
  function appendCombiningMark(mark) {
    return function (str) {
      return splitGraphemes(str)
        .map((g) => (g === " " ? g : g + mark))
        .join("");
    };
  }

  const strikethrough = appendCombiningMark("̶");
  const underline = appendCombiningMark("̲");
  const doubleUnderline = appendCombiningMark("̳");
  const slashed = appendCombiningMark("̸");
  // U+0305 COMBINING OVERLINE. The counterpart to underline, and the one
  // people reach for to fake a vinculum (x̅ for a mean, 0.3̅ for a repeating
  // decimal) in a field that will not take markup.
  const overline = appendCombiningMark("̅");

  function spacedOut(str) {
    return splitGraphemes(str).join(" ");
  }

  function heartsBetween(str) {
    return splitGraphemes(str.trim()).join("♥").replace(/♥ ♥/g, " ");
  }

  // Decorative wrappers: leave the text itself untouched and frame it with
  // ornamental characters — the "꧁★彡" look that's everywhere in gamer tags.
  function wrapWith(prefix, suffix) {
    return function (str) {
      const core = str.trim();
      return core ? prefix + core + suffix : core;
    };
  }

  /* ============================= zalgo / glitch ============================= */

  const ZALGO_UP = [
    "̍", "̎", "̄", "̅", "̿", "̑", "̆", "̐",
    "͒", "͗", "͑", "̇", "̈", "̊", "͂", "̓",
    "̈́", "͊", "͋", "͌", "̃", "̂", "̌", "͐",
  ];
  const ZALGO_DOWN = [
    "̖", "̗", "̘", "̙", "̜", "̝", "̞", "̟",
    "̠", "̤", "̥", "̦", "̩", "̪", "̫", "̬",
    "̭", "̮", "̯", "̰", "̱", "̹", "̺", "̻",
  ];
  const ZALGO_MID = ["̴", "̵", "̷", "̸"];

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * How far the glitch can be turned up before it stops being a text effect
   * and starts being a denial of service.
   *
   * Text shaping is not linear in the number of combining marks on one base
   * character — the engine has to position each mark relative to the ones
   * already stacked — so an uncapped slider is a reliable way to hang a tab.
   * Twelve marks per character is well past "unreadable horror" and still
   * lays out instantly, so nothing is lost by refusing to go further.
   */
  const ZALGO_MAX_MARKS = 12;

  // The named levels the style registry ships, expressed on the same 0-100
  // scale the slider uses, so the tiles and the slider cannot drift apart.
  const ZALGO_LEVELS = { light: 12, medium: 40, heavy: 78 };

  /**
   * Turn an intensity into per-character mark counts.
   *
   * Accepts the legacy "light" / "medium" / "heavy" names as well as a number
   * from 0 to 100, and always returns counts inside ZALGO_MAX_MARKS. Pure and
   * exported so a test can assert the cap holds at the top of the range
   * without generating text and counting marks by hand.
   */
  function zalgoRanges(level) {
    const named = typeof level === "string" ? ZALGO_LEVELS[level] : level;
    const pct = Math.max(0, Math.min(100, typeof named === "number" && isFinite(named) ? named : ZALGO_LEVELS.medium));
    const scale = pct / 100;
    // Up and down carry the bulk of the effect; mid (the strike-through-ish
    // overlays) stays sparse, because a dense mid band erases the letters.
    const peak = Math.round(scale * (ZALGO_MAX_MARKS / 2));
    const midPeak = Math.round(scale * (ZALGO_MAX_MARKS / 6));
    const span = (top) => [Math.max(0, top - (top > 1 ? 2 : top)), top];
    return { up: span(peak), down: span(peak), mid: span(midPeak), intensity: pct };
  }

  function zalgoText(str, level) {
    const ranges = zalgoRanges(level);
    return splitGraphemes(str)
      .map((g) => {
        if (g === " ") return g;
        let out = g;
        // Budget in code points, not in draws from the pool: at least one
        // entry (U+0344, stored decomposed as U+0308 U+0301) is two marks in
        // one string, and it is the renderer that pays per mark. Counting
        // draws would let the cap be quietly exceeded.
        let spent = 0;
        const add = (pool, draws) => {
          for (let i = 0; i < draws; i++) {
            const mark = pool[randInt(0, pool.length - 1)];
            const cost = Array.from(mark).length;
            if (spent + cost > ZALGO_MAX_MARKS) return;
            out += mark;
            spent += cost;
          }
        };
        add(ZALGO_UP, randInt(ranges.up[0], ranges.up[1]));
        add(ZALGO_DOWN, randInt(ranges.down[0], ranges.down[1]));
        add(ZALGO_MID, randInt(ranges.mid[0], ranges.mid[1]));
        return out;
      })
      .join("");
  }

  /* ============================= style registry ============================= */
  /* `wholeString: true` marks styles that only make sense applied to a full
     string (they reorder, space out, or wrap the text) — the per-letter Font
     Mixer excludes them from its palette. `random: true` marks styles whose
     output differs on every call (zalgo), so tools can offer a re-roll. */

  const STYLES = [
    { id: "bold", name: "Bold", transform: mapTransform(boldMap) },
    { id: "italic", name: "Italic", transform: mapTransform(italicMap) },
    { id: "bold-italic", name: "Bold Italic", transform: mapTransform(boldItalicMap) },
    { id: "script", name: "Script / Cursive", transform: mapTransform(scriptMap) },
    { id: "bold-script", name: "Bold Script", transform: mapTransform(boldScriptMap) },
    { id: "fraktur", name: "Fraktur / Gothic", transform: mapTransform(frakturMap) },
    { id: "bold-fraktur", name: "Bold Fraktur", transform: mapTransform(boldFrakturMap) },
    { id: "double-struck", name: "Double-Struck", transform: mapTransform(doubleStruckMap) },
    { id: "monospace", name: "Monospace", transform: mapTransform(monospaceMap) },
    { id: "sans-serif", name: "Sans-Serif", transform: mapTransform(sansSerifMap) },
    { id: "sans-bold", name: "Sans-Serif Bold", transform: mapTransform(sansBoldMap) },
    { id: "sans-italic", name: "Sans-Serif Italic", transform: mapTransform(sansItalicMap) },
    { id: "sans-bold-italic", name: "Sans-Serif Bold Italic", transform: mapTransform(sansBoldItalicMap) },
    { id: "small-caps", name: "Small Caps", transform: mapTransform(smallCapsMap) },
    { id: "circled", name: "Circled", transform: mapTransform(circledMap) },
    { id: "negative-circled", name: "Negative Circled", transform: mapTransform(negativeCircledMap) },
    { id: "squared", name: "Squared", transform: mapTransform(squaredMap) },
    { id: "negative-squared", name: "Negative Squared", transform: mapTransform(negativeSquaredMap) },
    { id: "parenthesized", name: "Parenthesized", transform: mapTransform(parenthesizedMap) },
    { id: "regional-indicator", name: "Regional Indicator", transform: regionalIndicatorText },
    { id: "faux-cyrillic", name: "Faux Cyrillic", transform: mapTransform(fauxCyrillicMap) },
    { id: "greek-style", name: "Greek Style", transform: mapTransform(greekStyleMap) },
    { id: "currency", name: "Currency / Crossed", transform: mapTransform(currencyMap) },
    { id: "fullwidth", name: "Fullwidth", transform: mapTransform(fullwidthMap) },
    { id: "superscript", name: "Superscript", transform: mapTransform(finalSuperscriptMap) },
    { id: "subscript", name: "Subscript", transform: mapTransform(subscriptMap) },
    { id: "strikethrough", name: "Strikethrough", transform: strikethrough },
    { id: "underline", name: "Underline", transform: underline },
    { id: "double-underline", name: "Double Underline", transform: doubleUnderline },
    { id: "slashed", name: "Slashed", transform: slashed },
    { id: "overline", name: "Overline", transform: overline },
    { id: "upside-down", name: "Upside-Down / Flip", transform: flipText },
    { id: "mirror", name: "Mirror / Reverse", transform: mirrorText, wholeString: true },
    { id: "spaced", name: "Wide / Spaced Out", transform: spacedOut, wholeString: true },
    { id: "hearts-between", name: "Hearts Between", transform: heartsBetween, wholeString: true },
    { id: "ornamental-wrap", name: "Ornamental ꧁꧂", transform: wrapWith("꧁ ", " ꧂"), wholeString: true },
    { id: "star-wrap", name: "Starry ★彡", transform: wrapWith("★彡 ", " 彡★"), wholeString: true },
    { id: "zalgo-light", name: "Zalgo — Light", transform: (s) => zalgoText(s, "light"), random: true },
    { id: "zalgo-medium", name: "Zalgo — Medium", transform: (s) => zalgoText(s, "medium"), random: true },
    { id: "zalgo-heavy", name: "Zalgo — Heavy", transform: (s) => zalgoText(s, "heavy"), random: true },
  ];

  const STYLE_BY_ID = {};
  STYLES.forEach((s) => {
    STYLE_BY_ID[s.id] = s;
  });

  /* ========================== where this actually works ========================== */
  /* The most common complaint about tools in this category is that the text
     looked fine in the generator and then arrived somewhere as boxes, as
     plain letters, or not at all. That is not a bug in the transform — it is
     the destination normalising, filtering, or lacking the font — but a tool
     that stays silent about it is letting people find out the hard way.

     Notes are attached by mechanism rather than one per style, because the
     mechanism is what decides the answer: every Math Alphanumeric style
     behaves alike, every combining-mark style behaves alike. `kind` also
     tells a UI which caveat to lead with. */

  const SUPPORT_KINDS = {
    math: {
      kind: "math",
      works: "Works in most bios, posts, display names and chat — X, Instagram, TikTok, Discord, Reddit.",
      watch: "Refused by real-name fields (Facebook, LinkedIn's name field) and unsearchable: these are separate characters from ordinary letters, so nobody will find you by typing your name.",
    },
    combining: {
      kind: "combining",
      works: "Works anywhere plain text goes, and is the only way to strike through or underline in a field that will not take formatting.",
      watch: "Each mark is its own character, so the length counts against a bio limit even though nothing extra is visible. A few platforms strip combining marks on save.",
    },
    enclosed: {
      kind: "enclosed",
      works: "Very widely supported — these are long-standing characters and most fonts on most devices have them.",
      watch: "Some Android system fonts miss the lowercase enclosed letters and draw an empty box instead.",
    },
    partial: {
      kind: "partial",
      works: "Reads as ordinary text everywhere, because these are normal Unicode letters rather than a maths alphabet.",
      watch: "Unicode has no character for every letter in this style, so the missing ones stay plain. That is the honest fallback, not a fault.",
    },
    fullwidth: {
      kind: "fullwidth",
      works: "About as safe as fancy text gets: these come from the CJK block, which every font that supports Chinese, Japanese or Korean already has.",
      watch: "Each character is twice as wide, so a name that fit before may now be truncated.",
    },
    reordered: {
      kind: "reordered",
      works: "Ordinary letters in an unusual order, so it survives almost anywhere plain text does.",
      watch: "Bidirectional text handling means some apps re-order it back on display, and a screen reader will read it letter by letter as nonsense.",
    },
    symbols: {
      kind: "symbols",
      works: "Plain symbol characters with broad font coverage — safe in gamer tags, chat and display names.",
      watch: "Ornamental brackets can trip length limits and look like spam to some moderation filters.",
    },
    zalgo: {
      kind: "zalgo",
      works: "Renders in most chat apps and on the web, where it is meant as a visual joke rather than readable text.",
      watch: "Tall stacks overflow the line above and many platforms strip or reject them. Assume it will be refused by any field with a length limit — the character count is enormous.",
    },
    flags: {
      kind: "flags",
      works: "Renders as coloured letter tiles on most platforms.",
      watch: "Two of these in a row that happen to form a country code turn into that country's flag — so 'GB' becomes 🇬🇧. Rarely what you wanted mid-word.",
    },
  };

  // style id -> support kind. Anything absent is treated as "math", which is
  // the overwhelming majority and the most conservative note of the set.
  const SUPPORT_BY_ID = {
    "small-caps": "partial", superscript: "partial", subscript: "partial",
    circled: "enclosed", "negative-circled": "enclosed", squared: "enclosed",
    "negative-squared": "enclosed", parenthesized: "enclosed",
    "regional-indicator": "flags",
    "faux-cyrillic": "partial", "greek-style": "partial", currency: "partial",
    fullwidth: "fullwidth", spaced: "fullwidth",
    strikethrough: "combining", underline: "combining",
    "double-underline": "combining", slashed: "combining", overline: "combining",
    "upside-down": "reordered", mirror: "reordered",
    "hearts-between": "symbols", "ornamental-wrap": "symbols", "star-wrap": "symbols",
    "zalgo-light": "zalgo", "zalgo-medium": "zalgo", "zalgo-heavy": "zalgo",
  };

  /** The "where this works" note for a style id, never null. */
  function supportNote(styleId) {
    return SUPPORT_KINDS[SUPPORT_BY_ID[styleId] || "math"];
  }

  /* ============================== counting characters ============================== */

  /**
   * What a string costs, three ways, because platforms disagree and the
   * disagreement is invisible.
   *
   * A "20 character" bio written in underlined text is 40 characters to
   * anything counting code points, and one styled with bold Math letters is
   * 40 to anything counting UTF-16 units. People hit the limit, cannot see
   * why, and blame the generator. Reporting all three is the fix:
   *
   * - `visible`  grapheme clusters — what a human counts by eye
   * - `counted`  code points — what most bio limits actually count
   * - `utf16`    JS string length — what a few older systems count
   */
  function countText(str) {
    const s = typeof str === "string" ? str : "";
    return {
      visible: splitGraphemes(s).length,
      counted: Array.from(s).length,
      utf16: s.length,
    };
  }

  /* ============================ style landing pages ============================ */
  /* Almost nobody searches "fancy text generator" — they search "cursive text
     generator", "bubble letters", "gothic font generator". Every style that
     substitutes character for character therefore gets its own indexable URL,
     and this is the one place that maps a style id to that URL.

     It is deliberately data-only (id → slug, nothing else): the page copy
     lives in the generator under tools/, so this table costs every page that
     loads the engine a couple of hundred bytes rather than ten kilobytes of
     prose. `tools/build_style_pages.py` reads it — through Node, so the
     transforms themselves produce the character maps — and it is the single
     source of truth for which pages exist.

     Styles that reorder or wrap the whole string (mirror, spaced,
     hearts-between, the ornamental wraps) and the random ones (zalgo) are
     absent on purpose: a per-character map is meaningless for them, and that
     map is what makes these pages worth indexing. They keep their homes on
     /flip/, /vaporwave/ and /glitch/. */

  const STYLE_PAGES = [
    { id: "bold", slug: "bold-text-generator" },
    { id: "italic", slug: "italic-text-generator" },
    { id: "bold-italic", slug: "bold-italic-text-generator" },
    { id: "script", slug: "cursive-text-generator" },
    { id: "bold-script", slug: "bold-cursive-text-generator" },
    { id: "fraktur", slug: "gothic-font-generator" },
    { id: "bold-fraktur", slug: "bold-gothic-text-generator" },
    { id: "double-struck", slug: "double-struck-text-generator" },
    { id: "monospace", slug: "monospace-text-generator" },
    { id: "sans-serif", slug: "sans-serif-text-generator" },
    { id: "sans-bold", slug: "sans-serif-bold-text-generator" },
    { id: "sans-italic", slug: "sans-serif-italic-text-generator" },
    { id: "sans-bold-italic", slug: "sans-serif-bold-italic-text-generator" },
    { id: "small-caps", slug: "small-text-generator" },
    { id: "circled", slug: "bubble-text-generator" },
    { id: "negative-circled", slug: "black-bubble-text-generator" },
    { id: "squared", slug: "squared-text-generator" },
    { id: "negative-squared", slug: "black-squared-text-generator" },
    { id: "parenthesized", slug: "parenthesized-text-generator" },
    { id: "regional-indicator", slug: "flag-letters-generator" },
    { id: "faux-cyrillic", slug: "faux-cyrillic-text-generator" },
    { id: "greek-style", slug: "greek-style-text-generator" },
    { id: "currency", slug: "currency-text-generator" },
    { id: "fullwidth", slug: "wide-text-generator" },
    { id: "superscript", slug: "superscript-generator" },
    { id: "subscript", slug: "subscript-generator" },
    { id: "strikethrough", slug: "strikethrough-text-generator" },
    { id: "underline", slug: "underline-text-generator" },
    { id: "double-underline", slug: "double-underline-text-generator" },
    { id: "slashed", slug: "slashed-text-generator" },
    { id: "overline", slug: "overline-text-generator" },
    { id: "upside-down", slug: "upside-down-text-generator" },
  ];

  const STYLE_PAGE_BY_ID = {};
  STYLE_PAGES.forEach((p) => {
    STYLE_PAGE_BY_ID[p.id] = p;
  });

  /** The landing-page path for a style id, or null if it has no page. */
  function stylePagePath(styleId) {
    const page = STYLE_PAGE_BY_ID[styleId];
    return page ? "/" + page.slug + "/" : null;
  }

  // Gallery presentation order, shared by the homepage and the Combiner's
  // style picker: the styles people actually come looking for (bold, italic,
  // cursive, gothic, bubble, glitch…) land in the first rows.
  const TILE_ORDER = [
    "bold", "italic", "script", "fraktur", "circled", "bold-italic",
    "double-struck", "small-caps", "bold-script", "monospace",
    "strikethrough", "underline", "upside-down", "negative-circled",
    "squared", "negative-squared", "bold-fraktur", "sans-serif",
    "sans-bold", "sans-italic", "sans-bold-italic", "fullwidth",
    "superscript", "subscript", "spaced", "mirror",
    "faux-cyrillic", "greek-style", "currency",
    "parenthesized", "regional-indicator",
    "double-underline", "slashed", "overline",
    "hearts-between", "ornamental-wrap", "star-wrap",
    "zalgo-light", "zalgo-medium", "zalgo-heavy",
  ];

  // Category filters (pills). Every id in STYLES must appear in exactly one
  // group (the consumers warn at startup) so nothing is silently dropped
  // when a filter is active.
  const CATEGORIES = [
    {
      id: "bold-italic",
      title: "Bold & Italic",
      ids: [
        "bold", "italic", "bold-italic", "sans-serif", "sans-bold",
        "sans-italic", "sans-bold-italic", "monospace", "double-struck",
      ],
    },
    {
      id: "cursive-gothic",
      title: "Cursive & Gothic",
      ids: ["script", "bold-script", "fraktur", "bold-fraktur"],
    },
    {
      id: "circled-boxed",
      title: "Circled & Boxed",
      ids: [
        "circled", "negative-circled", "squared", "negative-squared",
        "parenthesized", "regional-indicator",
      ],
    },
    {
      id: "symbol-alphabets",
      title: "Symbol Alphabets",
      ids: ["faux-cyrillic", "greek-style", "currency"],
    },
    {
      id: "small-wide",
      title: "Small & Wide",
      ids: ["small-caps", "superscript", "subscript", "fullwidth", "spaced"],
    },
    {
      id: "effects-glitch",
      title: "Effects & Glitch",
      ids: [
        "strikethrough", "underline", "double-underline", "slashed", "overline",
        "upside-down", "mirror",
        "zalgo-light", "zalgo-medium", "zalgo-heavy",
      ],
    },
    {
      id: "decorated",
      title: "Decorated",
      ids: ["hearts-between", "ornamental-wrap", "star-wrap"],
    },
  ];

  // ---------------------------------------------------------------
  // Ready-made multi-style examples. The homepage shows these as gallery
  // tiles (mixed in among the single styles) to introduce the Combiner
  // and Mixer; each carries an edit link into the tool with the recipe
  // loaded. Combos are Combiner chains; mixes alternate styles letter by
  // letter. Only deterministic styles belong here — no zalgo.
  // ---------------------------------------------------------------

  const COMBO_EXAMPLES = [
    { id: "combo-flipped-underline", name: "Flipped Underline", ids: ["upside-down", "underline"] },
    { id: "combo-struck-bold", name: "Struck Bold", ids: ["bold", "strikethrough"] },
    { id: "combo-crossed-underline", name: "Crossed Underline", ids: ["strikethrough", "underline"] },
    { id: "combo-struck-superscript", name: "Struck Superscript", ids: ["superscript", "strikethrough"] },
    { id: "combo-underlined-subscript", name: "Underlined Subscript", ids: ["subscript", "underline"] },
    { id: "combo-triple-flip", name: "Triple Flip", ids: ["upside-down", "strikethrough", "underline"] },
  ];

  const MIX_EXAMPLES = [
    { id: "mix-bold-script", name: "Bold × Script", styleIds: ["bold", "script"] },
    { id: "mix-fraktur-double", name: "Gothic × Double-Struck", styleIds: ["fraktur", "double-struck"] },
    { id: "mix-circled-squared", name: "Circled × Squared", styleIds: ["circled", "squared"] },
    { id: "mix-caps-super", name: "Small Caps × Superscript", styleIds: ["small-caps", "superscript"] },
  ];

  // ---------------------------------------------------------------
  // Character examples: a kaomoji or a symbol set around text that is
  // itself styled. These introduce /kaomoji/ and /symbols/ the same way
  // the combo and mix examples introduce their tools — as ordinary
  // gallery tiles beside the styles they are made of, not a banner.
  //
  // `styleId` is always a substitution alphabet. The combining-mark
  // styles draw their mark to the width of the base character, and the
  // characters a kaomoji is built from are mostly fullwidth, so an
  // underline or a strikethrough over one paints a solid bar across the
  // face — the same rule the character pages' PREVIEW_STYLES follow.
  // ---------------------------------------------------------------

  const CHAR_EXAMPLES = [
    { id: "char-smile-script", name: "Smiling Script", char: "(◕‿◕)", styleId: "script", place: "before" },
    { id: "char-shrug-bold", name: "Shrug in Bold", char: "¯\\_(ツ)_/¯", styleId: "bold", place: "after" },
    { id: "char-love-fraktur", name: "Loved Gothic", char: "♡", styleId: "fraktur", place: "wrap" },
    { id: "char-stars-double", name: "Starry Double-Struck", char: "✦", styleId: "double-struck", place: "wrap" },
    { id: "char-cat-smallcaps", name: "Cat Small Caps", char: "(=^･ω･^=)", styleId: "small-caps", place: "before" },
    { id: "char-arrow-mono", name: "Pointed Monospace", char: "➤", styleId: "monospace", place: "before" },
  ];

  // Set a character around text run through one style. `wrap` puts it on
  // both sides; `before`/`after` put it on one, which is what a kaomoji
  // wants — a face reads as a face at one end of a line and as a pair of
  // mismatched brackets at both.
  function applyCharExample(ex, text) {
    const style = STYLE_BY_ID[ex.styleId];
    const styled = style ? style.transform(text) : text;
    if (ex.place === "before") return ex.char + " " + styled;
    if (ex.place === "after") return styled + " " + ex.char;
    return ex.char + " " + styled + " " + ex.char;
  }

  // Run a Combiner chain: each style's output feeds the next.
  function applyChain(ids, text) {
    return ids.reduce((t, id) => (STYLE_BY_ID[id] ? STYLE_BY_ID[id].transform(t) : t), text);
  }

  // Per-grapheme style ids for a Mixer alternating pattern: the cycle
  // advances only on non-whitespace characters, which stay unstyled
  // (null) — the same shape the Mixer stores and reads from its URL.
  function mixPatternIds(styleIds, text) {
    let at = 0;
    return splitGraphemes(text).map((g) => {
      if (/\s/.test(g)) return null;
      return styleIds[at++ % styleIds.length];
    });
  }

  function applyMixPattern(styleIds, text) {
    const perLetter = mixPatternIds(styleIds, text);
    return splitGraphemes(text)
      .map((g, i) => (perLetter[i] ? STYLE_BY_ID[perLetter[i]].transform(g) : g))
      .join("");
  }

  const FancyText = {
    STYLES,
    STYLE_BY_ID,
    STYLE_PAGES,
    STYLE_PAGE_BY_ID,
    stylePagePath,
    TILE_ORDER,
    CATEGORIES,
    COMBO_EXAMPLES,
    MIX_EXAMPLES,
    CHAR_EXAMPLES,
    applyCharExample,
    applyChain,
    mixPatternIds,
    applyMixPattern,
    mapTransform,
    zalgoText,
    zalgoRanges,
    ZALGO_MAX_MARKS,
    ZALGO_LEVELS,
    flipText,
    mirrorText,
    splitGraphemes,
    supportNote,
    SUPPORT_KINDS,
    countText,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FancyText;
  } else {
    global.FancyText = FancyText;
  }
})(typeof window !== "undefined" ? window : globalThis);
