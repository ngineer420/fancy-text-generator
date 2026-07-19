/* Fancy Text Generator — fontloom.com homepage wiring.
   All transform logic lives in assets/js/fancytext-core.js (the FancyText
   namespace) and shared page chrome in site.js; both must be loaded before
   this file. This file only builds and drives the homepage gallery. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;
  const Favs = window.Favs;

  // Gallery order + category pills are shared with the Combiner's style
  // picker and live in fancytext-core.js.
  const TILE_ORDER = FancyText.TILE_ORDER;
  const CATEGORIES = FancyText.CATEGORIES;

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

    // ---------------------------------------------------------------
    // Combo & mix examples: preset multi-style recipes from the core,
    // shown as ordinary gallery tiles (mixed in near their ingredient
    // styles) to introduce the Combiner and Mixer. Each is copyable like
    // any tile and carries an ✎ link that opens its editor with the
    // recipe loaded. They form their own homepage-only filter category.
    // ---------------------------------------------------------------

    const EXAMPLE_CATEGORY = "combos";

    const EXAMPLES = FancyText.COMBO_EXAMPLES.map((ex) => ({
      id: ex.id,
      name: ex.name,
      tag: "combo",
      toolName: "Font Combiner",
      transform: (text) => FancyText.applyChain(ex.ids, text),
      editUrl: (typed) =>
        "/combine/?chain=" + encodeURIComponent(ex.ids.join(",")) +
        (typed ? "&text=" + encodeURIComponent(typed) : ""),
    })).concat(
      FancyText.MIX_EXAMPLES.map((ex) => ({
        id: ex.id,
        name: ex.name,
        tag: "mix",
        toolName: "Font Mixer",
        transform: (text) => FancyText.applyMixPattern(ex.styleIds, text),
        editUrl: (typed, text) =>
          "/mix/?text=" + encodeURIComponent(text) +
          "&styles=" + encodeURIComponent(
            FancyText.mixPatternIds(ex.styleIds, text).map((id) => id || "-").join(",")
          ),
      }))
    );
    const EXAMPLE_BY_ID = {};
    EXAMPLES.forEach((ex) => {
      EXAMPLE_BY_ID[ex.id] = ex;
      CATEGORY_OF[ex.id] = EXAMPLE_CATEGORY;
    });

    // Where each example lands in the gallery: right after a style it's
    // made of, so they read as neighbors rather than a separate block.
    const EXAMPLE_AFTER = {
      "circled": ["mix-bold-script"],
      "small-caps": ["mix-fraktur-double"],
      "underline": ["combo-struck-bold"],
      "upside-down": ["combo-flipped-underline"],
      "negative-squared": ["mix-circled-squared"],
      "superscript": ["mix-caps-super"],
      "subscript": ["combo-struck-superscript", "combo-underlined-subscript"],
      "slashed": ["combo-crossed-underline", "combo-triple-flip"],
    };

    // Dev-time sanity check: every style must belong to a category and
    // appear in TILE_ORDER, or it would silently vanish from the gallery.
    const orderSet = new Set(TILE_ORDER);
    const missing = STYLES.filter((s) => !CATEGORY_OF[s.id] || !orderSet.has(s.id)).map((s) => s.id);
    if (missing.length) {
      console.warn("fontloom: styles missing from TILE_ORDER/CATEGORIES:", missing);
    }

    const tiles = []; // { style, tileEl, outputEl, starEl?, editEl?, category }

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

      // Examples (combo/mix recipes) get a tag + edit link instead of a
      // pin star; plain styles get the star.
      const example = EXAMPLE_BY_ID[style.id] || null;
      let starEl = null;
      let editEl = null;

      if (example) {
        tile.classList.add("tile-example");

        const tagEl = document.createElement("span");
        tagEl.className = "tile-tag";
        tagEl.textContent = example.tag;
        tagEl.title = "Made with the " + example.toolName;
        label.appendChild(tagEl);

        editEl = document.createElement("a");
        editEl.className = "tile-edit";
        editEl.textContent = "✎";
        editEl.setAttribute("aria-label", "Edit " + style.name + " in the " + example.toolName);
        editEl.title = "Edit in the " + example.toolName;
        // Don't let the tile's copy handler swallow the navigation.
        editEl.addEventListener("click", (evt) => evt.stopPropagation());
      } else {
        starEl = document.createElement("button");
        starEl.type = "button";
        starEl.className = "tile-star";
        starEl.setAttribute("aria-label", "Pin " + style.name + " to the top");
        starEl.addEventListener("click", (evt) => {
          evt.stopPropagation();
          Favs.toggleStyle(style.id);
          syncStars();
          orderGallery();
        });
      }

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-icon-btn";
      copyBtn.setAttribute("aria-label", "Copy " + style.name + " text");
      copyBtn.innerHTML = COPY_ICON_SVG;

      foot.append(label, starEl || editEl, copyBtn);
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

      tiles.push({ style, tileEl: tile, outputEl: output, starEl, editEl, category: CATEGORY_OF[style.id] });
      gallery.appendChild(tile);
    }

    TILE_ORDER.forEach((id) => {
      const style = STYLE_BY_ID[id];
      if (style) buildTile(style);
      (EXAMPLE_AFTER[id] || []).forEach((exId) => {
        if (EXAMPLE_BY_ID[exId]) buildTile(EXAMPLE_BY_ID[exId]);
      });
    });
    // Any style not in TILE_ORDER still gets a tile (appended last).
    STYLES.forEach((s) => {
      if (!orderSet.has(s.id)) buildTile(s);
    });

    function syncStars() {
      for (const t of tiles) {
        if (!t.starEl) continue;
        const starred = Favs.hasStyle(t.style.id);
        t.starEl.textContent = starred ? "★" : "☆";
        t.starEl.setAttribute("aria-pressed", String(starred));
        t.starEl.title = starred ? "Unpin from the top" : "Pin to the top";
        t.tileEl.classList.toggle("is-starred", starred);
      }
    }

    // Starred styles float to the front, keeping TILE_ORDER within each half.
    function orderGallery() {
      const sorted = tiles.slice().sort((a, b) => {
        const fa = Favs.hasStyle(a.style.id) ? 0 : 1;
        const fb = Favs.hasStyle(b.style.id) ? 0 : 1;
        return fa - fb;
      });
      sorted.forEach((t) => gallery.appendChild(t.tileEl));
    }

    // Filter pills: "All" plus one per category. Selecting a pill filters
    // the flat grid in place, so results always start at the top of the
    // page instead of requiring a scroll to a section. The combo/mix
    // examples get a homepage-only pill (the shared CATEGORIES list also
    // drives the Combiner's picker, where the examples don't appear).
    let activeCategory = null; // null = all

    if (pillsEl) {
      const pillDefs = [{ id: null, title: "All" }].concat(
        CATEGORIES.map((c) => ({ id: c.id, title: c.title })),
        [{ id: EXAMPLE_CATEGORY, title: "Combos & Mixes" }]
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
        if (t.editEl) {
          // Keep the ✎ link pointing at the editor with whatever the
          // visitor typed (mix URLs always need a concrete text).
          t.editEl.href = t.style.editUrl(hasInput ? raw : "", text);
        }
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

    syncStars();
    orderGallery();
    render();
    applyFilter();
  });
})();
