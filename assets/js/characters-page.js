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
   character is the variable — every card is the same words with a different
   face in front of them. So `?text=` is read once and written into every
   link that leaves: the cards, the mood chips, the other family. No text box
   is needed to hold it, because nothing here edits it; changing it is a link
   back to the generator, which is where text is edited.

   Load after fancytext-core.js, site.js and favorites.js. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;
  const Favs = window.Favs;

  const MAX_LEN = 300;

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

    const noun = main.dataset.charKind === "symbols" ? "symbols" : "kaomoji";

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
      const doCopy = wireCopy(card, () => ch, name);
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

    /* The line the visitor brought with them, if they brought one. It is
       never edited here and never stored — it exists only as the text half
       of every link off this page. */
    const carried = (new URLSearchParams(location.search).get("text") || "").slice(0, MAX_LEN);

    function applyCarry() {
      if (!carried) return;

      const strip = document.getElementById("char-carry");
      const shown = document.getElementById("char-carry-text");
      const back = document.getElementById("char-carry-edit");
      if (shown) shown.textContent = "“" + carried + "”";
      // Back to the only place that edits text, with the line intact.
      if (back) back.href = "/?text=" + encodeURIComponent(carried);
      if (strip) strip.hidden = false;

      // Every card is now that line with this character in front of it.
      for (const card of cards) {
        const link = card.querySelector(".char-insert");
        if (!link) continue;
        link.href = "/?text=" + encodeURIComponent(card.dataset.char + " " + carried);
      }

      /* And the browse controls keep it. Losing the line by clicking "Cute"
         would make the mood chips a trap rather than a filter. Every link
         from here into another picker page gets it; links out of the family
         (the generator, /styles/, the Combiner) already point somewhere that
         reads `?text=` on its own terms and are left alone. */
      for (const a of main.querySelectorAll('a[href^="/kaomoji/"], a[href^="/symbols/"]')) {
        if (a.classList.contains("char-insert")) continue;
        // Built by hand rather than through URLSearchParams, which spells a
        // space "+". Both decode the same but the site would then be writing
        // the line two ways in two places on one page.
        const path = a.getAttribute("href").split(/[?#]/)[0];
        a.setAttribute("href", path + "?text=" + encodeURIComponent(carried));
      }
    }

    /* ---------- init ---------- */

    syncStars();
    pinStarred();
    applyCarry();
  });
})();
