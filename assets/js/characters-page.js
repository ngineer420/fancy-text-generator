/* fontloom.com — the runtime for /kaomoji/ and /symbols/.

   Every card on these pages is already in the HTML: tools/build_character_pages.py
   bakes the whole grid, so the page is a working list of characters with
   JavaScript switched off and this file is enhancement rather than rendering.

   Four behaviours, in the order they matter:

     copy     a card click puts its character on the clipboard
     filter   instant keyword match over every card on the page
     save     the star adds it to favorites as the fourth kind, "chars"
     carry    `?text=` from a homepage tile rides along on every link out

   Styling is not among them, and that is deliberate. This page used to carry
   a composer — a text box and six preview tiles — so a visitor could build a
   styled line without leaving. The homepage is that same box with forty
   styles instead of six, and it already has "Add a face" for changing which
   character sits in it, so the composer was a smaller copy of a better page
   one link away. Every card's "Style it →" is that link, with the character
   already in the box. Nothing here has to reproduce the styler.

   What it does do is carry. A visitor who arrived from a homepage tile has
   a line already, and on this page that line is the constant and the
   character is the variable — so the page becomes "which face goes with my
   words", and every card SHOWS the combination rather than the character
   alone. You are picking against something you can see.

   `?text=` is read once and used three ways: printed on every card beside
   its character, copied with it, and written into every link that leaves —
   the cards, the mood chips, the other family. No text box is needed to hold
   it, because nothing here edits it; changing it is a link back to the
   generator, which is where text is edited.

   Load after fancytext-core.js, site.js and favorites.js. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;
  const Favs = window.Favs;

  const MAX_LEN = 300;
  // What a card's link hands over when the visitor has no line of their own.
  // Must match SAMPLE_TEXT in app.js and in build_character_pages.py;
  // test/characters.test.js checks that all three agree.
  const SAMPLE_TEXT = "Fancy Text";

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main.char-page");
    if (!main) return;

    const filterEl = document.getElementById("char-filter");
    const filterCount = document.getElementById("char-filter-count");
    const liveRegion = document.getElementById("copy-live-region");
    const cards = [...main.querySelectorAll(".char-card")];
    const grids = [...main.querySelectorAll(".char-grid")];
    const groups = [...main.querySelectorAll(".char-group")];
    if (!cards.length) return;

    const symbols = main.dataset.charKind === "symbols";
    const noun = symbols ? "symbols" : "kaomoji";
    const one = symbols ? "symbol" : "kaomoji";

    /* The line this page is holding. It arrives in `?text=` from a homepage
       character tile, and is editable here — not because this page styles
       anything, but because it is the page's own state and sending somebody
       back to the generator to change one word costs them their place in the
       grid. Never stored; the URL holds it for exactly as long as they are
       inside the picker. */
    let carried = (new URLSearchParams(location.search).get("text") || "").slice(0, MAX_LEN);

    // What a card is actually offering: its character, plus that line.
    function lineFor(char) {
      return carried ? char + " " + carried : char;
    }

    function announce(message) {
      if (liveRegion) liveRegion.textContent = message;
    }

    /* ---------- copy ---------- */

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

    /* ---------- the cards ---------- */

    for (const card of cards) {
      const ch = card.dataset.char;
      const name = card.querySelector(".char-name").textContent;

      // Copying is what the whole card does, because copying a face is what
      // the visit is for. Styling one is the other thing this page offers
      // and it has its own control — a link out to the generator.
      // Copy what the card shows. With a line carried that is the whole
      // combination, because the combination is what the card is offering
      // and copying less than what is on screen reads as a bug.
      const doCopy = wireCopy(card, () => lineFor(ch), name);
      card.addEventListener("click", (evt) => {
        // Both real controls on the card have to be able to answer for
        // themselves: the star is a button, "Style it" is a link, and either
        // one swallowed by the copy handler would look broken.
        if (evt.target.closest("button, a")) return;
        doCopy();
      });
      card.addEventListener("keydown", (evt) => {
        if (evt.target !== card) return;
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          doCopy();
        }
      });

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

    /* ---------- carry ---------- */

    const CLEAR_ICON =
      '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
      '<path fill="currentColor" d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12' +
      ' 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>';

    /* The strip is built here rather than baked, for the same reason
       charinsert.js builds its own button: with JavaScript off none of this
       works, and an input that silently does nothing is worse than no input.

       It replaced a line that read "Change the text or style it →" and went
       back to the generator. Both halves of that were wrong — changing was
       all it actually did, and every card already offers to style. Editing
       the line here keeps you where you are choosing. */
    function buildStrip() {
      const shell = main.querySelector(".tool-shell");
      const filterRow = main.querySelector(".char-filter-row");
      if (!shell || !filterRow) return null;

      const wrap = document.createElement("div");
      wrap.className = "char-carry";

      const label = document.createElement("label");
      label.className = "char-carry-label";
      label.setAttribute("for", "char-carry-input");
      label.textContent = "Your text";

      const box = document.createElement("div");
      box.className = "input-shell char-carry-shell";

      const field = document.createElement("input");
      field.type = "text";
      field.id = "char-carry-input";
      field.className = "input-field";
      field.maxLength = MAX_LEN;
      field.autocomplete = "off";
      field.spellcheck = false;
      field.placeholder = "Type to see it beside every " + one + "…";

      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "clear-btn";
      clear.setAttribute("aria-label", "Clear text");
      clear.innerHTML = CLEAR_ICON;
      clear.hidden = true;

      box.append(field, clear);
      wrap.append(label, box);
      shell.insertBefore(wrap, filterRow);
      return { field, clear };
    }

    function relabel(card, has) {
      const link = card.querySelector(".char-insert");
      if (!link) return;
      const name = card.querySelector(".char-name").textContent;
      /* Same link, different sentence: with no line the press adds one, with
         a line it styles what is there. The pencil is the mark the homepage
         tiles use for "this opens an editor". */
      if (has) {
        link.innerHTML = '<span aria-hidden="true">\u270E</span> Style text';
        link.title = "Style this line in the full generator";
        link.setAttribute("aria-label",
          "Style your text with " + name + " in the full generator");
      } else {
        link.innerHTML = '<span aria-hidden="true">+</span> Add fancy text';
        link.title = "Open the generator with this one in the box";
        link.setAttribute("aria-label",
          "Add fancy text to " + name + " in the full generator");
      }
    }

    function writeUrl() {
      // The line lives in the URL and nowhere else, which is what lets a
      // mood chip carry it and a shared address arrive holding it.
      history.replaceState(null, "", location.pathname +
        (carried ? "?text=" + encodeURIComponent(carried) : ""));
    }

    let carrying = null; // last applied state, so labels are rewritten once

    function syncCarry() {
      const has = carried.length > 0;

      /* Every card becomes that line with this character in front of it — on
         the card as well as in its link. Printing it is the point: the page
         is a chooser for the combination, and a grid of bare faces would
         make you imagine the result instead of reading it. */
      for (const card of cards) {
        const ch = card.dataset.char;
        const slot = card.querySelector(".char-glyph-text");
        if (slot) slot.textContent = has ? " " + carried : "";
        card.setAttribute("aria-label", "Copy " + lineFor(ch));
        const link = card.querySelector(".char-insert");
        // With no line of their own, the visitor still needs something at
        // the far end to see the styles on.
        if (link) {
          link.href = "/?text=" +
            encodeURIComponent(has ? ch + " " + carried : ch + " " + SAMPLE_TEXT);
        }
      }

      if (carrying !== has) {
        carrying = has;
        for (const card of cards) relabel(card, has);
        main.classList.toggle("is-carrying", has);
      }

      /* And the browse controls keep it. Losing the line by pressing "Cute"
         would make the mood chips a trap rather than a filter. Every link
         from here into another picker page gets it; links out of the family
         (the generator, /styles/, the Combiner) already read `?text=` on
         their own terms and are left alone. */
      for (const a of main.querySelectorAll('a[href^="/kaomoji/"], a[href^="/symbols/"]')) {
        if (a.classList.contains("char-insert")) continue;
        // Built by hand rather than through URLSearchParams, which spells a
        // space "+". Both decode the same but the site would then be writing
        // the line two ways in two places on one page.
        const path = a.getAttribute("href").split(/[?#]/)[0];
        a.setAttribute("href", path + (has ? "?text=" + encodeURIComponent(carried) : ""));
      }
    }

    /* ---------- init ---------- */

    syncStars();
    pinStarred();

    const strip = buildStrip();
    if (strip) {
      strip.field.value = carried;
      strip.clear.hidden = !carried;
      strip.field.addEventListener("input", debounce(() => {
        carried = strip.field.value.slice(0, MAX_LEN);
        strip.clear.hidden = !carried;
        syncCarry();
        writeUrl();
      }, 60));
      strip.field.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") evt.preventDefault();
      });
      strip.clear.addEventListener("click", () => {
        strip.field.value = "";
        carried = "";
        strip.clear.hidden = true;
        strip.field.focus();
        syncCarry();
        writeUrl();
      });
    }
    syncCarry();
  });
})();
