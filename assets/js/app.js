/* Fancy Text Generator — fontstylizer.com
   All transform logic lives in the FancyText namespace below (pure, no DOM
   dependency), so it can be unit-tested from Node with `require()`. The DOM
   wiring at the bottom only runs in a browser. */

(function (global) {
  "use strict";

  /* ============================= build helpers ============================= */

  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const DIGITS = "0123456789";

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
  // through instead of producing blank/undefined output.
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

  function flipText(str) {
    const chars = Array.from(str.toLowerCase());
    const mapped = chars.map((ch) => (Object.prototype.hasOwnProperty.call(FLIP_MAP, ch) ? FLIP_MAP[ch] : ch));
    return mapped.reverse().join("");
  }

  const MIRROR_MAP = { b: "d", d: "b", p: "q", q: "p", E: "Ǝ", e: "ɘ" };

  function mirrorText(str) {
    const chars = Array.from(str);
    const mapped = chars.map((ch) => (Object.prototype.hasOwnProperty.call(MIRROR_MAP, ch) ? MIRROR_MAP[ch] : ch));
    return mapped.reverse().join("");
  }

  function strikethrough(str) {
    return Array.from(str)
      .map((ch) => (ch === " " ? ch : ch + "̶"))
      .join("");
  }

  function underline(str) {
    return Array.from(str)
      .map((ch) => (ch === " " ? ch : ch + "̲"))
      .join("");
  }

  function spacedOut(str) {
    return Array.from(str).join(" ");
  }

  /* ============================= zalgo / glitch ============================= */

  const ZALGO_UP = [
    "̍", "̎", "̄", "̅", "̿", "̑", "̆", "̐",
    "͒", "͗", "͑", "̇", "̈", "̊", "͂", "̓",
    "̈́", "͊", "͋", "͌", "̃", "̂", "̌", "͐",
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

  function zalgoText(str, level) {
    const ranges = {
      light: { up: [0, 1], down: [0, 1], mid: [0, 0] },
      medium: { up: [1, 3], down: [1, 3], mid: [0, 1] },
      heavy: { up: [3, 6], down: [3, 6], mid: [1, 3] },
    }[level];
    return Array.from(str)
      .map((ch) => {
        if (ch === " ") return ch;
        let out = ch;
        const upCount = randInt(ranges.up[0], ranges.up[1]);
        const downCount = randInt(ranges.down[0], ranges.down[1]);
        const midCount = randInt(ranges.mid[0], ranges.mid[1]);
        for (let i = 0; i < upCount; i++) out += ZALGO_UP[randInt(0, ZALGO_UP.length - 1)];
        for (let i = 0; i < downCount; i++) out += ZALGO_DOWN[randInt(0, ZALGO_DOWN.length - 1)];
        for (let i = 0; i < midCount; i++) out += ZALGO_MID[randInt(0, ZALGO_MID.length - 1)];
        return out;
      })
      .join("");
  }

  /* ============================= style registry ============================= */

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
    { id: "fullwidth", name: "Fullwidth", transform: mapTransform(fullwidthMap) },
    { id: "superscript", name: "Superscript", transform: mapTransform(finalSuperscriptMap) },
    { id: "subscript", name: "Subscript", transform: mapTransform(subscriptMap) },
    { id: "strikethrough", name: "Strikethrough", transform: strikethrough },
    { id: "underline", name: "Underline", transform: underline },
    { id: "upside-down", name: "Upside-Down / Flip", transform: flipText },
    { id: "mirror", name: "Mirror / Reverse", transform: mirrorText },
    { id: "spaced", name: "Wide / Spaced Out", transform: spacedOut },
    { id: "zalgo-light", name: "Zalgo — Light", transform: (s) => zalgoText(s, "light") },
    { id: "zalgo-medium", name: "Zalgo — Medium", transform: (s) => zalgoText(s, "medium") },
    { id: "zalgo-heavy", name: "Zalgo — Heavy", transform: (s) => zalgoText(s, "heavy") },
  ];

  const FancyText = { STYLES, mapTransform, zalgoText, flipText, mirrorText };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FancyText;
  } else {
    global.FancyText = FancyText;
  }
})(typeof window !== "undefined" ? window : globalThis);

/* ============================= DOM wiring (browser only) ============================= */

if (typeof document !== "undefined") {
  (function () {
    "use strict";

    function debounce(fn, ms) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    }

    async function copyText(text, flashEl) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      flashEl.classList.add("show");
      clearTimeout(flashEl._t);
      flashEl._t = setTimeout(() => flashEl.classList.remove("show"), 1100);
    }

    document.addEventListener("DOMContentLoaded", () => {
      const input = document.getElementById("text-input");
      const filterInput = document.getElementById("style-filter");
      const list = document.getElementById("style-list");
      const emptyState = document.getElementById("empty-state");
      const styleCountEl = document.getElementById("style-count");
      const emptyStyleCountEl = document.getElementById("empty-style-count");
      const visibleHintEl = document.getElementById("visible-hint");
      const yearEl = document.getElementById("year");
      if (yearEl) yearEl.textContent = new Date().getFullYear();

      const SAMPLE_TEXT = "Fancy Text";
      const STYLES = FancyText.STYLES;
      styleCountEl.textContent = STYLES.length;
      if (emptyStyleCountEl) emptyStyleCountEl.textContent = STYLES.length;

      // Theme toggle, matching the portfolio's other tools.
      (function initTheme() {
        const toggle = document.getElementById("theme-toggle");
        const stored = localStorage.getItem("ftg-theme");
        if (stored) document.documentElement.setAttribute("data-theme", stored);
        toggle.addEventListener("click", () => {
          const current =
            document.documentElement.getAttribute("data-theme") ||
            (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
          const next = current === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("ftg-theme", next);
        });
      })();

      // Build one row per style, up front. Rows are re-labelled/hidden on
      // input rather than rebuilt, so typing stays cheap.
      const rows = STYLES.map((style) => {
        const row = document.createElement("div");
        row.className = "style-row";
        row.dataset.name = style.name.toLowerCase();

        const label = document.createElement("div");
        label.className = "style-label";
        label.textContent = style.name;

        const output = document.createElement("div");
        output.className = "style-output";
        output.tabIndex = 0;

        const copyWrap = document.createElement("div");
        copyWrap.className = "style-copy-wrap";

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "copy-btn";
        copyBtn.textContent = "Copy";

        const flash = document.createElement("span");
        flash.className = "copy-flash";
        flash.textContent = "Copied!";

        copyWrap.append(copyBtn, flash);
        row.append(label, output, copyWrap);
        list.appendChild(row);

        copyBtn.addEventListener("click", () => copyText(output.textContent, flash));

        return { style, row, output };
      });

      function render() {
        const raw = input.value;
        const hasInput = raw.trim().length > 0;
        const text = hasInput ? raw : SAMPLE_TEXT;
        emptyState.hidden = hasInput;
        list.hidden = false;

        for (const r of rows) {
          r.output.textContent = r.style.transform(text);
        }
      }

      function applyFilter() {
        const q = filterInput.value.trim().toLowerCase();
        let visible = 0;
        for (const r of rows) {
          const match = !q || r.row.dataset.name.includes(q);
          r.row.hidden = !match;
          if (match) visible++;
        }
        list.classList.toggle("no-results", visible === 0);
        if (visibleHintEl) {
          visibleHintEl.textContent = q ? `${visible} of ${STYLES.length} styles` : "All styles shown";
        }
      }

      const debouncedRender = debounce(render, 50);
      input.addEventListener("input", debouncedRender);
      filterInput.addEventListener("input", applyFilter);

      render();
      applyFilter();
    });
  })();
}
