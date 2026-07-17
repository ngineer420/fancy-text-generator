/* Font Mixer — /mix/ page wiring.
   Keeps a FancyText style per letter: pick a style from the palette, then
   click or drag across the letter tiles to paint it on. Requires
   fancytext-core.js and site.js to be loaded first. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;
  const { STYLES, STYLE_BY_ID, splitGraphemes } = FancyText;

  const SAMPLE_TEXT = "Fancy Text";

  // Styles that make sense applied to a single letter: everything except the
  // sequence-level styles (wholeString) and regional indicators — two
  // adjacent regional-indicator letters merge into a country flag emoji,
  // which the standalone style prevents with spaces but per-letter painting
  // can't.
  const ELIGIBLE = STYLES.filter((s) => !s.wholeString && s.id !== "regional-indicator");

  // Curated pool for the Shuffle pattern: high-contrast, reliable styles
  // (null = leave the letter plain, like the untouched letters in "𝕱a̶n̶ₙcy").
  const SHUFFLE_POOL = [
    "bold", "italic", "script", "bold-script", "fraktur", "bold-fraktur",
    "double-struck", "monospace", "sans-bold", "circled", "negative-circled",
    "squared", "small-caps", "superscript", "subscript", "fullwidth",
    "strikethrough", "underline", "upside-down", "currency", "greek-style",
    "faux-cyrillic", null,
  ];

  // Cycled word-by-word for the "By word" pattern.
  const WORD_STYLES = ["fraktur", "script", "monospace", "double-struck", "bold", "circled"];

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("mix-input");
    const clearBtn = document.getElementById("clear-btn");
    const letterRow = document.getElementById("letter-row");
    const palette = document.getElementById("palette");
    const output = document.getElementById("mix-output");
    const copyBtn = document.getElementById("copy-result");
    const liveRegion = document.getElementById("copy-live-region");
    if (!input || !letterRow) return;

    let graphemes = []; // user-perceived characters of the current text
    let styleIds = []; // per grapheme: style id or null (plain)
    let tiles = []; // per grapheme: the tile element (spaces get inert spans)
    let usingSample = true; // showing the demo text until the user types
    let activeStyle = "fraktur"; // currently selected palette style (null = plain/eraser)
    let painting = false;

    function styleName(id) {
      return id ? STYLE_BY_ID[id].name : "Plain";
    }

    function applyStyle(id, grapheme) {
      return id ? STYLE_BY_ID[id].transform(grapheme) : grapheme;
    }

    /* ---------- text / letter tiles ---------- */

    function setText(text, resetStyles) {
      graphemes = splitGraphemes(text);
      styleIds = resetStyles
        ? graphemes.map(() => null)
        : graphemes.map((_, i) => styleIds[i] || null); // preserve by position while typing
      buildLetterRow();
      render();
    }

    function buildLetterRow() {
      letterRow.innerHTML = "";
      tiles = [];
      graphemes.forEach((g, i) => {
        if (g === " ") {
          const gap = document.createElement("span");
          gap.className = "mix-space";
          gap.setAttribute("aria-hidden", "true");
          tiles.push(gap);
          letterRow.appendChild(gap);
          return;
        }
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "mix-letter";
        tile.dataset.index = i;
        tiles.push(tile);
        letterRow.appendChild(tile);
      });
    }

    /* ---------- rendering ---------- */

    function render() {
      const pieces = graphemes.map((g, i) => applyStyle(styleIds[i], g));
      graphemes.forEach((g, i) => {
        if (g === " ") return;
        const tile = tiles[i];
        tile.textContent = pieces[i];
        tile.classList.toggle("has-style", Boolean(styleIds[i]));
        tile.setAttribute("aria-label", "Letter " + g + ", style " + styleName(styleIds[i]));
        tile.title = styleName(styleIds[i]);
      });
      output.textContent = pieces.join("");
      if (clearBtn) clearBtn.hidden = input.value.length === 0;
    }

    /* ---------- painting ---------- */

    function tileIndex(el) {
      if (!(el instanceof Element)) return null;
      const tile = el.closest(".mix-letter");
      return tile ? Number(tile.dataset.index) : null;
    }

    function paint(index) {
      if (styleIds[index] === activeStyle) return;
      styleIds[index] = activeStyle;
      render();
    }

    letterRow.addEventListener("pointerdown", (evt) => {
      const idx = tileIndex(evt.target);
      if (idx === null) return;
      painting = true;
      paint(idx);
    });
    letterRow.addEventListener("pointermove", (evt) => {
      if (!painting) return;
      // elementFromPoint (rather than evt.target) so touch drags paint the
      // tile under the finger, not the tile the drag started on.
      const idx = tileIndex(document.elementFromPoint(evt.clientX, evt.clientY));
      if (idx !== null) paint(idx);
    });
    document.addEventListener("pointerup", () => {
      painting = false;
    });
    // Keyboard: tiles are buttons, so Enter/Space fire click.
    letterRow.addEventListener("click", (evt) => {
      const idx = tileIndex(evt.target);
      if (idx !== null) paint(idx);
    });

    /* ---------- palette ---------- */

    const swatchDefs = [{ id: null, name: "Plain" }].concat(
      ELIGIBLE.map((s) => ({ id: s.id, name: s.name }))
    );
    swatchDefs.forEach(({ id, name }) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "mix-swatch";
      swatch.setAttribute("aria-pressed", String(id === activeStyle));

      const sample = document.createElement("span");
      sample.className = "mix-swatch-sample";
      sample.textContent = applyStyle(id, "A") + applyStyle(id, "a");

      const label = document.createElement("span");
      label.className = "mix-swatch-name";
      label.textContent = name;

      swatch.append(sample, label);
      swatch.addEventListener("click", () => {
        activeStyle = id;
        palette.querySelectorAll(".mix-swatch").forEach((b) => {
          b.setAttribute("aria-pressed", String(b === swatch));
        });
      });
      palette.appendChild(swatch);
    });

    /* ---------- quick patterns ---------- */

    function nonSpaceIndexes() {
      return graphemes.map((g, i) => (g === " " ? null : i)).filter((i) => i !== null);
    }

    document.getElementById("pattern-alternate").addEventListener("click", () => {
      const style = activeStyle || "fraktur";
      nonSpaceIndexes().forEach((idx, n) => {
        styleIds[idx] = n % 2 === 0 ? style : null;
      });
      render();
    });

    document.getElementById("pattern-words").addEventListener("click", () => {
      let word = 0;
      let inWord = false;
      graphemes.forEach((g, i) => {
        if (g === " ") {
          if (inWord) word++;
          inWord = false;
          return;
        }
        inWord = true;
        styleIds[i] = WORD_STYLES[word % WORD_STYLES.length];
      });
      render();
    });

    document.getElementById("pattern-shuffle").addEventListener("click", () => {
      nonSpaceIndexes().forEach((idx) => {
        styleIds[idx] = SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)];
      });
      render();
    });

    document.getElementById("pattern-reset").addEventListener("click", () => {
      styleIds = graphemes.map(() => null);
      render();
    });

    /* ---------- input / copy ---------- */

    input.addEventListener("input", debounce(() => {
      const raw = input.value;
      const hasInput = raw.trim().length > 0;
      // Leaving sample mode: the demo text's paint job doesn't belong to the
      // user's words, so start them clean.
      const leavingSample = usingSample && hasInput;
      usingSample = !hasInput;
      setText(hasInput ? raw : SAMPLE_TEXT, leavingSample || !hasInput);
      if (!hasInput) demoPaint();
    }, 50));

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        usingSample = true;
        setText(SAMPLE_TEXT, true);
        demoPaint();
        input.focus();
      });
    }

    copyBtn.addEventListener("click", async () => {
      const ok = await copyText(output.textContent);
      if (!ok) return;
      copyBtn.classList.add("is-copied");
      copyBtn.textContent = "Copied ✓";
      clearTimeout(copyBtn._copyTimer);
      copyBtn._copyTimer = setTimeout(() => {
        copyBtn.classList.remove("is-copied");
        copyBtn.textContent = "Copy";
      }, 1200);
      if (liveRegion) liveRegion.textContent = "Mixed text copied to clipboard";
    });

    /* ---------- init: paint the sample so the page demos itself ---------- */

    function demoPaint() {
      // A fixed, good-looking assignment for the letters of "Fancy Text"
      // (not random, so the landing page always looks intentional):
      // 𝕱a̶ₙcy Tₑₓₜ
      const demo = [
        "bold-fraktur", "strikethrough", "subscript", null, null, // F a n c y
        null, "subscript", "subscript", "subscript", // T e x t
      ];
      nonSpaceIndexes().forEach((idx, n) => {
        if (n < demo.length) styleIds[idx] = demo[n];
      });
      render();
    }

    setText(SAMPLE_TEXT, true);
    demoPaint();
  });
})();
