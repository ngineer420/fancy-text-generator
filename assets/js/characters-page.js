/* fontloom.com — the runtime for /kaomoji/ and /symbols/.

   Every card on these pages is already in the HTML: tools/build_character_pages.py
   bakes the whole grid, so the page is a working list of characters with
   JavaScript switched off and this file is enhancement rather than rendering.
   What it adds is the reason the pages exist at all — clicking a character puts
   it in the text box rather than only on the clipboard, and the box is the
   site's styler, so an arriving symbol-searcher ends up holding a styled line
   instead of one character.

   Three behaviours, in the order they matter:

     insert   a card click drops its character in at the cursor and restyles
     filter   instant keyword match over every card on the page
     save     the star adds it to favorites as the fourth kind, "chars"

   Copy is deliberately the secondary action, on its own button. Making the
   whole card copy would be the obvious choice and it is the one that leaves
   the visitor with nothing but a clipboard.

   Load after fancytext-core.js, site.js and favorites.js. */

(function () {
  "use strict";

  const { debounce, copyText, renderCharCount } = window.Site;
  const { STYLE_BY_ID } = FancyText;
  const Favs = window.Favs;

  const SAMPLE_TEXT = "Fancy Text";
  const MAX_LEN = 300;

  /* The styles the composer previews. Six substitution alphabets, no combining
     marks: an underline or strikethrough is drawn to the width of its base
     character, and on the fullwidth characters a kaomoji is built from the
     marks meet end to end and paint a bar straight through the face. */
  const PREVIEW = ["script", "bold", "fraktur", "double-struck", "circled", "small-caps"];

  const COPY_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>';
  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main.char-page");
    if (!main) return;

    const input = document.getElementById("tool-input");
    const clearBtn = document.getElementById("clear-btn");
    const countEl = document.getElementById("char-count");
    const outHost = document.getElementById("composer-out");
    const moreLink = document.getElementById("composer-more");
    const filterEl = document.getElementById("char-filter");
    const filterCount = document.getElementById("char-filter-count");
    const liveRegion = document.getElementById("copy-live-region");
    const cards = [...main.querySelectorAll(".char-card")];
    const grids = [...main.querySelectorAll(".char-grid")];
    const groups = [...main.querySelectorAll(".char-group")];
    if (!input || !cards.length) return;

    const noun = main.dataset.charKind === "symbols" ? "symbols" : "kaomoji";

    function sourceText() {
      return input.value || SAMPLE_TEXT;
    }

    function announce(message) {
      if (liveRegion) liveRegion.textContent = message;
    }

    /* ---------- copy, shared by the preview tiles and the cards ---------- */

    function wireCopy(el, getText, label) {
      return async function doCopy(evt) {
        if (evt) evt.stopPropagation();
        const ok = await copyText(getText());
        if (!ok) return;
        el.classList.remove("is-copied");
        void el.offsetWidth; // restart the flash on a rapid second click
        el.classList.add("is-copied");
        clearTimeout(el._copyTimer);
        el._copyTimer = setTimeout(() => el.classList.remove("is-copied"), 1200);
        announce(label + " copied to clipboard");
      };
    }

    /* ---------- the composer ---------- */

    const previews = [];

    for (const id of PREVIEW) {
      const style = STYLE_BY_ID[id];
      if (!style) continue;

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", "Copy your text in " + style.name);

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
      copiedEl.innerHTML = CHECK_ICON + "<span>Copied</span>";
      label.append(nameEl, copiedEl);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-icon-btn";
      copyBtn.setAttribute("aria-label", "Copy your text in " + style.name);
      copyBtn.innerHTML = COPY_ICON;

      foot.append(label, copyBtn);
      tile.append(output, foot);

      const doCopy = wireCopy(tile, () => output.textContent, style.name + " text");
      tile.addEventListener("click", doCopy);
      tile.addEventListener("keydown", (evt) => {
        if (evt.target !== tile) return;
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          doCopy(evt);
        }
      });
      copyBtn.addEventListener("click", doCopy);

      outHost.appendChild(tile);
      previews.push({ style, output });
    }

    function render() {
      const text = sourceText();
      let longest = text;
      for (const p of previews) {
        const out = p.style.transform(text);
        p.output.textContent = out;
        if (out.length > longest.length) longest = out;
      }
      renderCharCount(countEl, text, longest);
      if (clearBtn) clearBtn.hidden = !input.value;
      if (moreLink) moreLink.href = "/?text=" + encodeURIComponent(text);
    }

    /* ---------- URL state, matching the other tool pages ---------- */

    function readUrl() {
      const value = new URLSearchParams(location.search).get("text");
      return value ? value.slice(0, MAX_LEN) : "";
    }

    function writeUrl() {
      const params = new URLSearchParams(location.search);
      if (input.value) params.set("text", input.value);
      else params.delete("text");
      const query = params.toString();
      history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
    }

    const writeUrlDebounced = debounce(writeUrl, 400);

    /* ---------- insert: the whole point of the page ---------- */

    function insert(text) {
      const before = input.value;
      // At the cursor, not at the end: somebody decorating a name wants the
      // heart between the words, and appending would make them re-type it.
      const start = input.selectionStart == null ? before.length : input.selectionStart;
      const end = input.selectionEnd == null ? before.length : input.selectionEnd;
      const next = (before.slice(0, start) + text + before.slice(end)).slice(0, MAX_LEN);
      input.value = next;
      const caret = Math.min(start + text.length, next.length);
      input.focus();
      input.setSelectionRange(caret, caret);
      render();
      writeUrl();
    }

    /* ---------- the cards ---------- */

    for (const card of cards) {
      const ch = card.dataset.char;
      const name = card.querySelector(".char-name").textContent;

      const doInsert = () => {
        insert(ch);
        announce(name + " added to your text");
      };

      card.addEventListener("click", (evt) => {
        if (evt.target.closest("button")) return;
        doInsert();
      });
      card.addEventListener("keydown", (evt) => {
        if (evt.target !== card) return;
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          doInsert();
        }
      });

      const copyBtn = card.querySelector(".char-copy");
      if (copyBtn) {
        const doCopy = wireCopy(card, () => ch, name);
        copyBtn.innerHTML = COPY_ICON;
        copyBtn.addEventListener("click", doCopy);
      }

      const starBtn = card.querySelector(".char-star");
      if (starBtn) {
        starBtn.addEventListener("click", (evt) => {
          evt.stopPropagation();
          const saved = Favs.toggleChar(ch);
          syncStars();
          pinStarred();
          announce(name + (saved ? " saved to favorites" : " removed from favorites"));
        });
      }
    }

    function syncStars() {
      for (const card of cards) {
        const starBtn = card.querySelector(".char-star");
        if (!starBtn) continue;
        const starred = Favs.hasChar(card.dataset.char);
        starBtn.textContent = starred ? "★" : "☆";
        starBtn.setAttribute("aria-pressed", String(starred));
        starBtn.title = starred ? "Remove from favorites" : "Save to favorites";
        card.classList.toggle("is-starred", starred);
      }
    }

    /* Starred characters move to the front of their own grid, the same way a
       starred style pins to the front of the homepage gallery. Within a grid
       only — a favorite does not jump out of the mood it belongs to. */
    function pinStarred() {
      for (const grid of grids) {
        const items = [...grid.children];
        const starred = items.filter((li) => li.querySelector(".char-card.is-starred"));
        for (let i = starred.length - 1; i >= 0; i--) grid.prepend(starred[i]);
      }
    }

    /* ---------- filter ---------- */

    function applyFilter() {
      const query = filterEl.value.trim().toLowerCase();
      const terms = query ? query.split(/\s+/) : [];
      let shown = 0;

      for (const card of cards) {
        const keys = card.dataset.keys || "";
        const hit = terms.every((t) => keys.indexOf(t) !== -1);
        card.parentElement.hidden = !hit;
        if (hit) shown++;
      }

      // A hub is sectioned by group; a section with nothing left in it is a
      // heading over a gap, so it goes too.
      for (const group of groups) {
        const any = [...group.querySelectorAll(".char-card")]
          .some((c) => !c.parentElement.hidden);
        group.hidden = !any;
      }

      if (!terms.length) {
        filterCount.textContent = "";
      } else if (shown) {
        filterCount.textContent = shown + " of " + cards.length + " " + noun;
      } else {
        filterCount.textContent = "Nothing matches “" + filterEl.value.trim() + "”";
      }
    }

    if (filterEl) {
      filterEl.addEventListener("input", debounce(applyFilter, 60));
      // Enter in a search field submits nothing here; stop the page reloading.
      filterEl.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") evt.preventDefault();
      });
    }

    /* ---------- init ---------- */

    input.value = readUrl();
    input.addEventListener("input", debounce(() => {
      render();
      writeUrlDebounced();
    }, 50));
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        input.focus();
        render();
        writeUrl();
      });
    }

    syncStars();
    pinStarred();
    render();
  });
})();
