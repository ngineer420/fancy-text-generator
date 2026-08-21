/* fontloom.com — the runtime for /kaomoji/ and /symbols/.

   Every card on these pages is already in the HTML: tools/build_character_pages.py
   bakes the whole grid, so the page is a working list of characters with
   JavaScript switched off and this file is enhancement rather than rendering.

   Three behaviours, in the order they matter:

     copy     a card click puts its character on the clipboard
     filter   instant keyword match over every card on the page
     save     the star adds it to favorites as the fourth kind, "chars"

   Styling is not among them, and that is deliberate. This page used to carry
   a composer — a text box and six preview tiles — so a visitor could build a
   styled line without leaving. The homepage is that same box with forty
   styles instead of six, and it already has "Add a face" for changing which
   character sits in it, so the composer was a smaller copy of a better page
   one link away. Every card's "Style it →" is that link, with the character
   already in the box. Nothing here has to reproduce the styler.

   Load after fancytext-core.js, site.js and favorites.js. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;
  const Favs = window.Favs;

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

    // The styled cards mixed into the grid: a real face in a real style,
    // linking into the styler. Adverts, not results — they come out while a
    // filter is running.
    const styledCells = [...main.querySelectorAll(".char-styled-cell")];

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

      // Leaving the adverts in a filtered grid would put them beside a count
      // that does not include them and among characters they have nothing to
      // do with.
      for (const cell of styledCells) cell.hidden = terms.length > 0;

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

    syncStars();
    pinStarred();
  });
})();
