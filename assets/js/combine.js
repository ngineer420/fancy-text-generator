/* Font Combiner — /combine/ page wiring.
   Chains FancyText styles in sequence: each step's output is the next
   step's input. Steps are added by tapping tiles in a style gallery whose
   previews always show what the *current result* would become — so every
   pick is previewed before it happens. Favorite combos (seeded with the
   classic presets) live in the chips row up top; the current chain can be
   named and starred from the result panel. Requires fancytext-core.js,
   site.js and favorites.js to be loaded first. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;
  const { STYLES, STYLE_BY_ID, TILE_ORDER, CATEGORIES } = FancyText;
  const Favs = window.Favs;

  const SAMPLE_TEXT = "Fancy Text";
  const MAX_STEPS = 6;
  // The default chain is the combo that inspired the tool: flip, then
  // underline every inverted letter.
  const DEFAULT_CHAIN = ["upside-down", "underline"];

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("combine-input");
    const clearBtn = document.getElementById("clear-btn");
    const chainList = document.getElementById("chain-list");
    const favRow = document.getElementById("fav-row");
    const gallery = document.getElementById("style-gallery");
    const pillsEl = document.getElementById("category-pills");
    const pickerFull = document.getElementById("picker-full");
    const output = document.getElementById("combine-output");
    const copyBtn = document.getElementById("copy-result");
    const saveFavBtn = document.getElementById("save-fav");
    const nameRow = document.getElementById("fav-name-row");
    const nameInput = document.getElementById("fav-name-input");
    const nameSave = document.getElementById("fav-name-save");
    const nameCancel = document.getElementById("fav-name-cancel");
    const liveRegion = document.getElementById("copy-live-region");
    if (!input || !chainList || !gallery) return;

    let chain = []; // ordered style ids
    let stepEls = []; // parallel to chain: { previewEl, badgeEl }

    /* ---------- URL state (shareable combos) ---------- */

    function readUrl() {
      const params = new URLSearchParams(location.search);
      const text = params.get("text") || "";
      const chainParam = params.get("chain");
      const ids = chainParam
        ? chainParam.split(",").filter((id) => STYLE_BY_ID[id]).slice(0, MAX_STEPS)
        : null;
      return { text, ids };
    }

    function writeUrl() {
      const params = new URLSearchParams();
      if (input.value) params.set("text", input.value);
      if (chain.length) params.set("chain", chain.join(","));
      const qs = params.toString();
      history.replaceState(null, "", qs ? "?" + qs : location.pathname);
    }
    const writeUrlDebounced = debounce(writeUrl, 300);

    /* ---------- favorites row + save/star ---------- */

    function defaultComboName() {
      return chain.map((id) => STYLE_BY_ID[id].name).join(" + ");
    }

    function renderFavRow() {
      favRow.innerHTML = "";
      const combos = Favs.combos();
      favRow.hidden = combos.length === 0;
      combos.forEach((combo) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "filter-pill fav-pill";
        chip.title = combo.ids.map((id) => (STYLE_BY_ID[id] ? STYLE_BY_ID[id].name : id)).join(" → ");

        const label = document.createElement("span");
        label.textContent = combo.name;

        const unstar = document.createElement("span");
        unstar.className = "fav-unstar";
        unstar.textContent = "★";
        unstar.setAttribute("role", "button");
        unstar.setAttribute("aria-label", "Remove " + combo.name + " from favorites");
        unstar.title = "Remove from favorites";
        unstar.addEventListener("click", (evt) => {
          evt.stopPropagation();
          Favs.removeCombo(combo.id);
          renderFavRow();
          updateStarState();
        });

        chip.append(label, unstar);
        chip.addEventListener("click", () => {
          chain = combo.ids.filter((id) => STYLE_BY_ID[id]).slice(0, MAX_STEPS);
          rebuildSteps();
        });
        favRow.appendChild(chip);
      });
    }

    function updateStarState() {
      if (!saveFavBtn) return;
      const saved = chain.length ? Favs.findCombo(chain) : null;
      saveFavBtn.textContent = saved ? "★" : "☆";
      saveFavBtn.setAttribute("aria-pressed", String(Boolean(saved)));
      saveFavBtn.title = saved
        ? "Remove this combo from favorites"
        : "Save this combo as a favorite";
      if (!saved && nameRow && !nameRow.hidden) return; // keep the open form
      if (nameRow) nameRow.hidden = true;
    }

    if (saveFavBtn) {
      saveFavBtn.addEventListener("click", () => {
        if (!chain.length) return;
        const saved = Favs.findCombo(chain);
        if (saved) {
          Favs.removeCombo(saved.id);
          renderFavRow();
          updateStarState();
          return;
        }
        nameRow.hidden = false;
        nameInput.value = defaultComboName();
        nameInput.focus();
        nameInput.select();
      });

      function saveCurrent() {
        if (!chain.length) return;
        const name = nameInput.value.trim() || defaultComboName();
        Favs.addCombo(name, chain);
        nameRow.hidden = true;
        renderFavRow();
        updateStarState();
        if (liveRegion) liveRegion.textContent = name + " saved to favorites";
      }

      nameSave.addEventListener("click", saveCurrent);
      nameInput.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") saveCurrent();
        if (evt.key === "Escape") nameRow.hidden = true;
      });
      nameCancel.addEventListener("click", () => {
        nameRow.hidden = true;
      });
    }

    /* ---------- chain step DOM ---------- */

    function iconButton(className, glyph, label) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chain-btn " + className;
      btn.textContent = glyph;
      btn.setAttribute("aria-label", label);
      btn.title = label;
      return btn;
    }

    function buildStep(styleId, index) {
      const style = STYLE_BY_ID[styleId];
      const li = document.createElement("li");
      li.className = "chain-step";

      const head = document.createElement("div");
      head.className = "chain-step-head";

      const num = document.createElement("span");
      num.className = "chain-step-num";
      num.textContent = index + 1;

      const name = document.createElement("span");
      name.className = "chain-step-name";
      name.textContent = style.name;

      const badge = document.createElement("span");
      badge.className = "noop-badge";
      badge.textContent = "no change";
      badge.title = "This step's style found nothing it knows how to transform, so the text passed through unchanged.";
      badge.hidden = true;

      const controls = document.createElement("span");
      controls.className = "chain-step-controls";

      if (style.random) {
        const reroll = iconButton("chain-reroll", "⟳", "Re-roll step " + (index + 1));
        reroll.addEventListener("click", render);
        controls.appendChild(reroll);
      }

      const up = iconButton("chain-up", "↑", "Move step " + (index + 1) + " up");
      up.disabled = index === 0;
      up.addEventListener("click", () => {
        [chain[index - 1], chain[index]] = [chain[index], chain[index - 1]];
        rebuildSteps();
      });

      const down = iconButton("chain-down", "↓", "Move step " + (index + 1) + " down");
      down.disabled = index === chain.length - 1;
      down.addEventListener("click", () => {
        [chain[index + 1], chain[index]] = [chain[index], chain[index + 1]];
        rebuildSteps();
      });

      const remove = iconButton("chain-remove", "✕", "Remove step " + (index + 1));
      remove.addEventListener("click", () => {
        chain.splice(index, 1);
        rebuildSteps();
      });

      controls.append(up, down, remove);
      head.append(num, name, badge, controls);

      const preview = document.createElement("div");
      preview.className = "chain-step-preview";

      li.append(head, preview);
      stepEls.push({ previewEl: preview, badgeEl: badge });
      return li;
    }

    function rebuildSteps() {
      chainList.innerHTML = "";
      stepEls = [];
      chain.forEach((id, i) => chainList.appendChild(buildStep(id, i)));
      render();
      updateStarState();
      writeUrlDebounced();
    }

    /* ---------- style picker gallery ---------- */

    // style id -> category id, for pill filtering.
    const CATEGORY_OF = {};
    CATEGORIES.forEach((cat) => {
      cat.ids.forEach((id) => {
        CATEGORY_OF[id] = cat.id;
      });
    });

    const tiles = []; // { style, tileEl, outputEl, starEl, category }

    function buildTile(style) {
      const tile = document.createElement("div");
      tile.className = "tile picker-tile";
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", "Add " + style.name + " to the chain");

      const outputEl = document.createElement("div");
      outputEl.className = "tile-output";

      const foot = document.createElement("div");
      foot.className = "tile-foot";

      const nameEl = document.createElement("span");
      nameEl.className = "tile-name";
      nameEl.textContent = style.name;

      const starEl = document.createElement("button");
      starEl.type = "button";
      starEl.className = "tile-star";
      starEl.setAttribute("aria-label", "Pin " + style.name + " to the top");

      const addEl = document.createElement("span");
      addEl.className = "tile-add";
      addEl.setAttribute("aria-hidden", "true");
      addEl.textContent = "+";

      foot.append(nameEl, starEl, addEl);
      tile.append(outputEl, foot);

      function addStep(evt) {
        if (evt) evt.stopPropagation();
        if (chain.length >= MAX_STEPS) return;
        chain.push(style.id);
        rebuildSteps();
      }

      tile.addEventListener("click", addStep);
      tile.addEventListener("keydown", (evt) => {
        if (evt.target !== tile) return;
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          addStep(evt);
        }
      });
      starEl.addEventListener("click", (evt) => {
        evt.stopPropagation();
        Favs.toggleStyle(style.id);
        syncStars();
        orderGallery();
      });

      tiles.push({ style, tileEl: tile, outputEl, starEl, category: CATEGORY_OF[style.id] });
      gallery.appendChild(tile);
    }

    const orderSet = new Set(TILE_ORDER);
    TILE_ORDER.forEach((id) => {
      const style = STYLE_BY_ID[id];
      if (style) buildTile(style);
    });
    STYLES.forEach((s) => {
      if (!orderSet.has(s.id)) buildTile(s);
    });

    function syncStars() {
      for (const t of tiles) {
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

    // Filter pills, same set as the homepage gallery.
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

    function applyFilter() {
      for (const t of tiles) {
        t.tileEl.hidden = Boolean(activeCategory) && t.category !== activeCategory;
      }
    }

    /* ---------- rendering ---------- */

    function render() {
      const raw = input.value;
      const hasInput = raw.trim().length > 0;
      if (clearBtn) clearBtn.hidden = raw.length === 0;

      let text = hasInput ? raw : SAMPLE_TEXT;
      chain.forEach((id, i) => {
        const next = STYLE_BY_ID[id].transform(text);
        stepEls[i].previewEl.textContent = next;
        stepEls[i].badgeEl.hidden = next !== text;
        text = next;
      });
      output.textContent = text;

      // Gallery tiles preview the *next* step: what the current result
      // becomes if this style is tapped. Styles that wouldn't change
      // anything are dimmed (alphabet styles no-op on already-styled text).
      const full = chain.length >= MAX_STEPS;
      if (pickerFull) pickerFull.hidden = !full;
      gallery.classList.toggle("is-full", full);
      for (const t of tiles) {
        const next = t.style.transform(text);
        t.outputEl.textContent = next;
        const noop = next === text;
        t.tileEl.classList.toggle("tile-noop", noop);
        t.tileEl.title = noop ? "Won't change the current result" : "";
      }
    }

    /* ---------- controls ---------- */

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
      if (liveRegion) liveRegion.textContent = "Combined text copied to clipboard";
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        render();
        writeUrlDebounced();
        input.focus();
      });
    }

    input.addEventListener("input", debounce(() => {
      render();
      writeUrlDebounced();
    }, 50));

    /* ---------- init ---------- */

    const initial = readUrl();
    input.value = initial.text.slice(0, 300);
    chain = initial.ids && initial.ids.length ? initial.ids : DEFAULT_CHAIN.slice();
    renderFavRow();
    syncStars();
    orderGallery();
    rebuildSteps();
  });
})();
