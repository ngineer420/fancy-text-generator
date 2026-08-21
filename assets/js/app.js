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
    const countEl = document.getElementById("char-count");
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
    const CHAR_CATEGORY = "chars";

    // The banner spells the recipe out, so a tile says what it is made of
    // instead of leaving the visitor to infer it from a truncated name.
    const styleName = (id) => (STYLE_BY_ID[id] ? STYLE_BY_ID[id].name : id);

    const EXAMPLES = FancyText.COMBO_EXAMPLES.map((ex) => ({
      id: ex.id,
      name: ex.name,
      tag: "combo",
      toolName: "Font Combiner",
      category: EXAMPLE_CATEGORY,
      // Chained: each style's output feeds the next, so an arrow is the
      // honest joiner. The order is the recipe.
      recipe: ex.ids.map(styleName).join(" → "),
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
        category: EXAMPLE_CATEGORY,
        // Alternating letter by letter, not stacked — a cross, not an arrow.
        recipe: ex.styleIds.map(styleName).join(" × "),
        transform: (text) => FancyText.applyMixPattern(ex.styleIds, text),
        editUrl: (typed, text) =>
          "/mix/?text=" + encodeURIComponent(text) +
          "&styles=" + encodeURIComponent(
            FancyText.mixPatternIds(ex.styleIds, text).map((id) => id || "-").join(",")
          ),
      })),
      FancyText.CHAR_EXAMPLES.map((ex) => ({
        id: ex.id,
        name: ex.name,
        tag: "face",
        toolName: "Kaomoji picker",
        category: CHAR_CATEGORY,
        recipe: ex.char + " + " + styleName(ex.styleId),
        transform: (text) => FancyText.applyCharExample(ex, text),
        // Hands off the finished line, not the recipe: the picker has no
        // notion of a preset, and arriving with the line already in the box
        // is what makes the next click an edit rather than a restart.
        editUrl: (typed, text) =>
          "/kaomoji/?text=" + encodeURIComponent(FancyText.applyCharExample(ex, text)),
      }))
    );
    const EXAMPLE_BY_ID = {};
    EXAMPLES.forEach((ex) => {
      EXAMPLE_BY_ID[ex.id] = ex;
      CATEGORY_OF[ex.id] = ex.category;
    });

    // Where each example lands in the gallery: right after a style it's
    // made of, so they read as neighbors rather than a separate block.
    const EXAMPLE_AFTER = {
      "script": ["char-smile-script"],
      "circled": ["mix-bold-script"],
      "bold-fraktur": ["char-love-fraktur"],
      "small-caps": ["mix-fraktur-double", "char-cat-smallcaps"],
      "monospace": ["char-arrow-mono"],
      "underline": ["combo-struck-bold"],
      "upside-down": ["combo-flipped-underline"],
      "negative-squared": ["mix-circled-squared"],
      "superscript": ["mix-caps-super"],
      "subscript": ["combo-struck-superscript", "combo-underlined-subscript"],
      "slashed": ["combo-crossed-underline", "combo-triple-flip"],
      "double-struck": ["char-stars-double"],
      "sans-bold": ["char-shrug-bold"],
    };

    // Dev-time sanity check: every style must belong to a category and
    // appear in TILE_ORDER, or it would silently vanish from the gallery.
    const orderSet = new Set(TILE_ORDER);
    const missing = STYLES.filter((s) => !CATEGORY_OF[s.id] || !orderSet.has(s.id)).map((s) => s.id);
    if (missing.length) {
      console.warn("fontloom: styles missing from TILE_ORDER/CATEGORIES:", missing);
    }

    // Whether a recipe is worth a second line beside the name it belongs
    // to. Compared with the joiners and spacing removed, so "Bold × Script"
    // and "Bold × Script / Cursive" count as the same sentence, while the
    // character in a face recipe survives and keeps that line.
    const joinless = (t) => t.toLowerCase().replace(/[\s/×→+.,-]/g, "");
    function addsToName(name, recipe) {
      if (!recipe) return false;
      const a = joinless(name);
      const b = joinless(recipe);
      return !(a.startsWith(b) || b.startsWith(a));
    }

    const tiles = []; // { style, tileEl, outputEl, starEl?, editEl?, category }

    function buildTile(style) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", "Copy " + style.name + " text");
      // Drives the banner's hue. One attribute, one custom property per
      // category in the stylesheet — no per-style colours to maintain.
      if (CATEGORY_OF[style.id]) tile.dataset.cat = CATEGORY_OF[style.id];

      const output = document.createElement("div");
      output.className = "tile-output";

      // The banner: a tinted, full-bleed strip across the foot of the card
      // carrying everything the visitor scans for — what this is, what it is
      // made of, and the way into the tool that made it. Before, all of that
      // was one grey line of small caps that truncated mid-word on exactly
      // the tiles where the detail mattered most.
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

      // Examples (combo/mix recipes, kaomoji pairings) get a tag, a written
      // recipe and an edit link instead of a pin star; plain styles get the
      // star.
      const example = EXAMPLE_BY_ID[style.id] || null;
      let starEl = null;
      let editEl = null;

      if (example) {
        tile.classList.add("tile-example");

        const tagEl = document.createElement("span");
        tagEl.className = "tile-tag";
        tagEl.textContent = example.tag;
        tagEl.title = "Made with the " + example.toolName;
        nameEl.appendChild(tagEl);

        // The ingredients, in full — but only where they say something the
        // name does not. A combo called "Flipped Underline" is worth
        // spelling out as "Upside-Down / Flip → Underline"; a mix called
        // "Circled × Squared" made of Circled and Squared is not, and a
        // line that restates the one above it is noise in a 200px card.
        if (addsToName(example.name, example.recipe)) {
          const recipeEl = document.createElement("span");
          recipeEl.className = "tile-recipe";
          recipeEl.textContent = example.recipe;
          label.appendChild(recipeEl);
        }

        editEl = document.createElement("a");
        editEl.className = "tile-edit";
        // Labelled, not a bare pencil. This link is the whole point of an
        // example tile — it was the faintest mark on the card.
        editEl.innerHTML = '<span aria-hidden="true">✎</span> Edit';
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
        [{ id: EXAMPLE_CATEGORY, title: "Combos & Mixes" },
         { id: CHAR_CATEGORY, title: "Faces & Symbols" }]
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

    /**
     * How much the styles on this page cost, as a range.
     *
     * Combining marks and surrogate pairs push a string past a bio limit with
     * nothing visible to explain it, so the gallery says up front how far the
     * count can move — the low end is usually plain, the high end is zalgo.
     */
    function renderGalleryCount(plain, lightest, heaviest) {
      if (!countEl) return;
      const typed = FancyText.countText(plain);
      const low = FancyText.countText(lightest || plain).counted;
      const high = FancyText.countText(heaviest || plain).counted;
      const parts = [
        '<span class="count-main"><strong>' + typed.visible + "</strong> " +
        (typed.visible === 1 ? "character" : "characters") + " typed</span>",
      ];
      if (high !== low) {
        parts.push(
          '<span class="count-warn">counts as <strong>' + low + "–" + high +
          "</strong> once styled, depending which you pick</span>"
        );
      }
      countEl.innerHTML = parts.join('<span class="count-sep">·</span>');
    }

    function render() {
      const raw = input.value;
      const hasInput = raw.trim().length > 0;
      const text = hasInput ? raw : SAMPLE_TEXT;
      emptyState.hidden = hasInput;
      if (clearBtn) clearBtn.hidden = raw.length === 0;

      // The readout reports the range across the gallery, not one style: on a
      // page showing forty of them, "counts as 95" with no style named reads
      // as a threat rather than information.
      let heaviest = "";
      let lightest = null;
      for (const t of tiles) {
        const out = t.style.transform(text);
        t.outputEl.textContent = out;
        if (out.length > heaviest.length) heaviest = out;
        if (lightest === null || out.length < lightest.length) lightest = out;
        if (t.editEl) {
          // Keep the ✎ link pointing at the editor with whatever the
          // visitor typed (mix URLs always need a concrete text).
          t.editEl.href = t.style.editUrl(hasInput ? raw : "", text);
        }
      }
      renderGalleryCount(text, lightest, heaviest);
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

    // ?text= — the homepage is the destination the rest of the site hands off
    // to, so it has to accept the handoff. The kaomoji and symbol pages send
    // the line the visitor built there ("open this in the full generator"),
    // and a link that silently dropped it would be worse than no link.
    const handoff = new URLSearchParams(location.search).get("text");
    if (handoff) input.value = handoff.slice(0, 300);

    const debouncedRender = debounce(render, 50);
    input.addEventListener("input", debouncedRender);
    window.addEventListener("resize", debounce(markClipped, 150));

    syncStars();
    orderGallery();
    render();
    applyFilter();
  });
})();
