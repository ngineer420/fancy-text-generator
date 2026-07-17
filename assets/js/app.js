/* Fancy Text Generator — fontloom.com homepage wiring.
   All transform logic lives in assets/js/fancytext-core.js (the FancyText
   namespace) and shared page chrome in site.js; both must be loaded before
   this file. This file only builds and drives the homepage gallery. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;

  // One flat gallery, ordered so the styles people actually come looking
  // for (bold, italic, cursive, gothic, bubble, glitch…) land in the first
  // rows — the goal is maximum recognizable variety above the fold.
  const TILE_ORDER = [
    "bold", "italic", "script", "fraktur", "circled", "bold-italic",
    "double-struck", "small-caps", "bold-script", "monospace",
    "strikethrough", "underline", "upside-down", "negative-circled",
    "squared", "negative-squared", "bold-fraktur", "sans-serif",
    "sans-bold", "sans-italic", "sans-bold-italic", "fullwidth",
    "superscript", "subscript", "spaced", "mirror",
    "faux-cyrillic", "greek-style", "currency",
    "parenthesized", "regional-indicator",
    "double-underline", "slashed",
    "hearts-between", "ornamental-wrap", "star-wrap",
    "zalgo-light", "zalgo-medium", "zalgo-heavy",
  ];

  // Category filters (pills). Every id in FancyText.STYLES must appear in
  // exactly one group here (checked at startup below) so nothing is
  // silently dropped when a filter is active.
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
        "strikethrough", "underline", "double-underline", "slashed",
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

  const COPY_ICON_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
  const CHECK_ICON_SVG =
    '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">' +
    '<path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 20.6 7.4l-1.4-1.4z"/></svg>';

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("text-input");
    const clearBtn = document.getElementById("clear-btn");
    const gallery = document.getElementById("gallery");
    const emptyState = document.getElementById("empty-state");
    const styleCountEl = document.getElementById("style-count");
    const pillsEl = document.getElementById("category-pills");
    const liveRegion = document.getElementById("copy-live-region");
    if (!input || !gallery) return; // not the homepage

    const SAMPLE_TEXT = "Fancy Text";
    const STYLES = FancyText.STYLES;
    const STYLE_BY_ID = FancyText.STYLE_BY_ID;
    styleCountEl.textContent = STYLES.length;

    // ---------------------------------------------------------------
    // Build the gallery: one flat grid of tiles. The transformed text is
    // the tile's content; the style name is a small footnote beneath it.
    // Tiles are built once up front and only re-labelled/hidden
    // afterwards, so typing and filtering stay cheap.
    // ---------------------------------------------------------------

    // style id -> category id, for pill filtering.
    const CATEGORY_OF = {};
    CATEGORIES.forEach((cat) => {
      cat.ids.forEach((id) => {
        CATEGORY_OF[id] = cat.id;
      });
    });

    // Dev-time sanity check: every style must belong to a category and
    // appear in TILE_ORDER, or it would silently vanish from the gallery.
    const orderSet = new Set(TILE_ORDER);
    const missing = STYLES.filter((s) => !CATEGORY_OF[s.id] || !orderSet.has(s.id)).map((s) => s.id);
    if (missing.length) {
      console.warn("fontloom: styles missing from TILE_ORDER/CATEGORIES:", missing);
    }

    const tiles = []; // { style, tileEl, outputEl, category }

    function buildTile(style) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", "Copy " + style.name + " text");

      const output = document.createElement("div");
      output.className = "tile-output";

      const foot = document.createElement("div");
      foot.className = "tile-foot";

      const label = document.createElement("span");
      label.className = "tile-foot-label";

      const nameEl = document.createElement("span");
      nameEl.className = "tile-name";
      nameEl.textContent = style.name;

      const copiedEl = document.createElement("span");
      copiedEl.className = "tile-copied";
      copiedEl.setAttribute("aria-hidden", "true");
      copiedEl.innerHTML = CHECK_ICON_SVG + "<span>Copied</span>";

      label.append(nameEl, copiedEl);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-icon-btn";
      copyBtn.setAttribute("aria-label", "Copy " + style.name + " text");
      copyBtn.innerHTML = COPY_ICON_SVG;

      foot.append(label, copyBtn);
      tile.append(output, foot);

      async function doCopy(evt) {
        if (evt) evt.stopPropagation();
        const ok = await copyText(output.textContent);
        if (!ok) return;
        tile.classList.remove("is-copied");
        void tile.offsetWidth; // restart the flash animation on rapid re-clicks
        tile.classList.add("is-copied");
        clearTimeout(tile._copyTimer);
        tile._copyTimer = setTimeout(() => tile.classList.remove("is-copied"), 1200);
        if (liveRegion) liveRegion.textContent = style.name + " copied to clipboard";
      }

      tile.addEventListener("click", doCopy);
      tile.addEventListener("keydown", (evt) => {
        // Only handle Enter/Space when the tile itself is focused — if the
        // nested copy button has focus, let its own click handler own the
        // interaction instead of double-firing.
        if (evt.target !== tile) return;
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          doCopy(evt);
        }
      });
      copyBtn.addEventListener("click", doCopy);

      tiles.push({ style, tileEl: tile, outputEl: output, category: CATEGORY_OF[style.id] });
      gallery.appendChild(tile);
    }

    TILE_ORDER.forEach((id) => {
      const style = STYLE_BY_ID[id];
      if (style) buildTile(style);
    });
    // Any style not in TILE_ORDER still gets a tile (appended last).
    STYLES.forEach((s) => {
      if (!orderSet.has(s.id)) buildTile(s);
    });

    // Filter pills: "All" plus one per category. Selecting a pill filters
    // the flat grid in place, so results always start at the top of the
    // page instead of requiring a scroll to a section.
    let activeCategory = null; // null = all

    if (pillsEl) {
      const pillDefs = [{ id: null, title: "All" }].concat(
        CATEGORIES.map((c) => ({ id: c.id, title: c.title }))
      );
      pillDefs.forEach(({ id, title }) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "filter-pill";
        pill.textContent = title;
        pill.setAttribute("aria-pressed", String(id === activeCategory));
        pill.addEventListener("click", () => {
          activeCategory = id;
          pillsEl.querySelectorAll(".filter-pill").forEach((p) => {
            p.setAttribute("aria-pressed", String(p === pill));
          });
          applyFilter();
        });
        pillsEl.appendChild(pill);
      });
    }

    // ---------------------------------------------------------------
    // Render (re-run transforms) + filter (show/hide tiles)
    // ---------------------------------------------------------------

    // Long inputs get visually clipped inside the fixed-height tile; fade
    // the clipped ones out at the bottom (the full string is still what
    // gets copied). Checked after every render since it depends on both
    // the text and the tile's current width.
    function markClipped() {
      for (const t of tiles) {
        if (t.tileEl.hidden) continue;
        t.tileEl.classList.toggle("is-clipped", t.outputEl.scrollHeight > t.outputEl.clientHeight + 1);
      }
    }

    function render() {
      const raw = input.value;
      const hasInput = raw.trim().length > 0;
      const text = hasInput ? raw : SAMPLE_TEXT;
      emptyState.hidden = hasInput;
      if (clearBtn) clearBtn.hidden = raw.length === 0;

      for (const t of tiles) {
        t.outputEl.textContent = t.style.transform(text);
      }
      markClipped();
    }

    function applyFilter() {
      for (const t of tiles) {
        t.tileEl.hidden = Boolean(activeCategory) && t.category !== activeCategory;
      }
      markClipped();
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        render();
        input.focus();
      });
    }

    const debouncedRender = debounce(render, 50);
    input.addEventListener("input", debouncedRender);
    window.addEventListener("resize", debounce(markClipped, 150));

    render();
    applyFilter();
  });
})();
