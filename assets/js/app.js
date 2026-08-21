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
    const MAX_LEN = 300;
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

    const styleName = (id) => (STYLE_BY_ID[id] ? STYLE_BY_ID[id].name : id);

    const EXAMPLES = FancyText.COMBO_EXAMPLES.map((ex) => ({
      id: ex.id,
      name: ex.name,
      // Where the Edit goes. It is the tile's one colour, the pill's label,
      // and the only thing on the card that is not black on white.
      dest: "combine",
      destLabel: "Combiner",
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
        dest: "mix",
        destLabel: "Mixer",
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
      FancyText.CHAR_EXAMPLES.map((ex) => {
        /* Two different things wear the same kind of tile.

           The two picker tiles are adverts: their job is to open /kaomoji/
           or /symbols/, where two hundred more of them are, so they keep a
           link and the colour that says the press leaves this page.

           The four pairings are recipes, and their press belongs HERE. This
           page is already the styler — all forty of them — and it already
           has "Add a face" for changing which face. Sending that press to a
           picker page meant landing on a smaller styler that had lost the
           style you clicked to get there, which is the trip this removes.
           Pressing puts the plain arrangement in the box instead, and the
           forty tiles answer it on the spot. */
        const inPlace = !ex.hub;
        const faceLike = FancyText.splitGraphemes(ex.char).length > 1;
        return {
          id: ex.id,
          name: ex.name,
          dest: inPlace ? null : "chars",
          destLabel: inPlace
            ? (faceLike ? "Add face" : "Add symbol")
            : (ex.hub === "/symbols/" ? "Symbols" : "Faces"),
          toolName: ex.hub === "/symbols/" ? "symbol picker" : "kaomoji picker",
          category: CHAR_CATEGORY,
          recipe: ex.styleId
            ? ex.char + " + " + styleName(ex.styleId)
            : ex.char + " … " + (ex.close || ex.char),
          inPlace,
          transform: (text) => FancyText.applyCharExample(ex, text),
          // The plain arrangement, never the styled line: the box holds
          // words for forty styles to work on, and freezing one of them
          // into it would leave the other thirty-nine with nothing to do.
          applyText: (text) => FancyText.charExampleText(ex, text),
          /* In place: the plain arrangement, straight into the box.
             Out: the picker page, carrying the WORDS and not the face — the
             face is the one thing that page changes, so handing it one would
             be handing it the variable. It shows the line on arrival and
             every card there becomes that line with a different face. */
          editUrl: (typed, text) =>
            inPlace
              ? "/?text=" + encodeURIComponent(FancyText.charExampleText(ex, text))
              : ex.hub + "?text=" + encodeURIComponent(text),
        };
      })
    );
    const EXAMPLE_BY_ID = {};
    EXAMPLES.forEach((ex) => {
      EXAMPLE_BY_ID[ex.id] = ex;
      CATEGORY_OF[ex.id] = ex.category;
    });

    // Where each example lands in the gallery: right after a style it's
    // made of, so they read as neighbors rather than a separate block.
    const EXAMPLE_AFTER = {
      // The kaomoji tile sits in the first row or two: it is the
      // advertisement, and an advertisement below the fold is a footnote.
      "italic": ["char-kaomoji"],
      "script": ["char-smile-script"],
      "circled": ["mix-bold-script"],
      "bold-fraktur": ["char-love-fraktur"],
      "small-caps": ["mix-fraktur-double", "char-cat-smallcaps"],
      "underline": ["combo-struck-bold"],
      "upside-down": ["combo-flipped-underline"],
      "negative-squared": ["mix-circled-squared"],
      "superscript": ["mix-caps-super"],
      "subscript": ["combo-struck-superscript", "combo-underlined-subscript"],
      "slashed": ["combo-crossed-underline", "combo-triple-flip"],
      "sans-bold": ["char-shrug-bold"],
      "hearts-between": ["char-symbols"],
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

      // The banner: a full-bleed strip across the foot of the card carrying
      // the name and the actions. Every one of them is the same height —
      // room for two lines of label whether or not the name needs both —
      // because a grid of cards that are all nearly the same height reads
      // as broken in a way that a grid of identical ones does not.
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

      // Examples (combo/mix recipes, kaomoji pairings) get an edit link
      // instead of a pin star; plain styles get the star.
      const example = EXAMPLE_BY_ID[style.id] || null;
      let starEl = null;
      let editEl = null;

      if (example) {
        tile.classList.add("tile-example");
        // The one thing on the card that carries a colour, and the only
        // thing the colour means: which tool the press opens. A press that
        // stays on this page opens nothing, so it takes no colour.
        if (example.dest) tile.dataset.dest = example.dest;
        // The recipe is real detail, but a second line of it is what made
        // these cards taller than their neighbours. It lives on the tile
        // itself now, where a hover or a screen reader finds it and the
        // grid does not have to pay for it.
        tile.title = example.name + " — " + example.recipe;

        editEl = document.createElement("a");
        editEl.className = "tile-edit";
        // Names what the press does rather than saying "Edit": that is the
        // same fact the colour carries, said in words, so the tile still
        // distinguishes a combo from a mix in monochrome.
        editEl.innerHTML = '<span aria-hidden="true">' +
          (example.inPlace ? "＋" : "✎") + '</span> ' + example.destLabel;
        if (example.inPlace) {
          editEl.setAttribute("aria-label",
            "Put " + style.name + " (" + example.recipe + ") in the text box");
          editEl.title = "Put it in the box — " + example.recipe;
        } else {
          editEl.setAttribute("aria-label",
            "Open " + style.name + " (" + example.recipe + ") in the " + example.toolName);
          editEl.title = "Open in the " + example.toolName + " — " + example.recipe;
        }
        // Don't let the tile's copy handler swallow the press.
        editEl.addEventListener("click", (evt) => {
          evt.stopPropagation();
          if (!example.inPlace) return; // a real link; let it navigate
          /* The href says the same thing and works with JavaScript off or on
             a middle click, but following it would reload the page to change
             one input. Do it here instead, and let the gallery answer. */
          evt.preventDefault();
          const raw = input.value.trim() ? input.value : SAMPLE_TEXT;
          input.value = example.applyText(raw).slice(0, MAX_LEN);
          render();
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        });
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
    if (handoff) input.value = handoff.slice(0, MAX_LEN);

    const debouncedRender = debounce(render, 50);
    input.addEventListener("input", debouncedRender);
    window.addEventListener("resize", debounce(markClipped, 150));

    syncStars();
    orderGallery();
    render();
    applyFilter();
  });
})();
