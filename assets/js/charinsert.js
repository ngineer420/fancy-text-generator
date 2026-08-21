/* Insert a kaomoji or a symbol into a styler's input, without leaving it.

   The character pages already do this the other way round: you pick a face
   there and the composer styles the line around it. This is the same move
   from the other side — you are on the homepage or in the Combiner, the
   text is already the shape you want, and what is missing is a face at the
   front of it. Sending that visitor to /kaomoji/ and back would cost them
   the chain they had built.

   Opt in from the HTML by putting `data-char-insert` on the `.input-shell`
   wrapping the input. Everything else is built here, so a page with
   JavaScript off is unchanged rather than showing a dead button.

   The catalogue (`characters.js`, ~12kB over the wire) is fetched the
   first time the panel is opened, not on page load. It is otherwise a
   build-time file — `build_character_pages.py` bakes the character pages'
   grids into their HTML — and most homepage visitors never open this
   panel, so making every one of them pay for it to save one round trip
   for the few who do is the wrong trade.

   Load after site.js. */

(function () {
  "use strict";

  var PANEL_ID = "charpick-panel";

  // What the panel says about styling a face. This is not a disclaimer, it
  // is the answer to the question the button raises: alphabet styles map
  // A-Z and leave everything else alone, which is exactly why a kaomoji
  // survives them intact. Combining marks are drawn to the width of the
  // base character, and the characters a face is built from are mostly
  // fullwidth, so an underline over one paints a bar across the face.
  var TABS = [
    {
      id: "faces",
      label: "Faces",
      groupsOf: function (C) { return C.KAOMOJI; },
      note: "A face is ordinary characters, so bold, script and gothic pass " +
            "straight over it and style only your words. Underline, " +
            "strikethrough and slash draw across it instead.",
      more: { href: "/kaomoji/", text: "All kaomoji, by mood" },
    },
    {
      id: "symbols",
      label: "Symbols",
      groupsOf: function (C) { return C.SYMBOLS; },
      note: "Single characters, so they cost one each against a bio limit " +
            "and survive every alphabet style unchanged.",
      more: { href: "/symbols/", text: "All symbols, by kind" },
    },
  ];

  var CATALOGUE_SRC = "/assets/js/characters.js?v=1";

  // Fetch the catalogue once, on demand. Resolves to window.Characters, or
  // rejects if the script will not load — the caller degrades to a link.
  var cataloguePromise = null;
  function loadCatalogue() {
    if (window.Characters) return Promise.resolve(window.Characters);
    if (cataloguePromise) return cataloguePromise;
    cataloguePromise = new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = CATALOGUE_SRC;
      el.onload = function () {
        if (window.Characters) resolve(window.Characters);
        else reject(new Error("characters.js loaded but defined nothing"));
      };
      el.onerror = function () { reject(new Error("characters.js failed to load")); };
      document.head.appendChild(el);
    });
    return cataloguePromise;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var shell = document.querySelector("[data-char-insert]");
    if (!shell) return;
    var input = shell.querySelector("input");
    if (!input) return;
    var C = null; // set once the catalogue arrives

    var liveRegion = document.getElementById("copy-live-region");
    var maxLen = Number(input.getAttribute("maxlength")) || 300;

    // ---------------------------------------------------------------
    // Markup
    // ---------------------------------------------------------------

    var wrap = document.createElement("div");
    wrap.className = "charpick";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "charpick-btn";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", PANEL_ID);
    btn.innerHTML = '<span class="charpick-btn-face" aria-hidden="true">(◕‿◕)</span>' +
                    '<span class="charpick-btn-text">Add a face</span>';

    var panel = document.createElement("div");
    panel.className = "charpick-panel";
    panel.id = PANEL_ID;
    panel.hidden = true;

    var tabsEl = document.createElement("div");
    tabsEl.className = "charpick-tabs";
    tabsEl.setAttribute("role", "tablist");
    tabsEl.setAttribute("aria-label", "Character set");

    var searchWrap = document.createElement("div");
    searchWrap.className = "charpick-search";
    var search = document.createElement("input");
    search.type = "search";
    search.className = "input-field";
    search.setAttribute("autocomplete", "off");
    search.setAttribute("aria-label", "Filter characters");
    searchWrap.appendChild(search);

    var noteEl = document.createElement("p");
    noteEl.className = "charpick-note";

    var grid = document.createElement("div");
    grid.className = "charpick-grid";

    var emptyEl = document.createElement("p");
    emptyEl.className = "charpick-empty";
    emptyEl.hidden = true;

    // Loading / failed-to-load line. Polite rather than assertive: it
    // resolves in a few hundred milliseconds and is not an alert.
    var statusEl = document.createElement("p");
    statusEl.className = "charpick-status";
    statusEl.setAttribute("role", "status");
    statusEl.hidden = true;

    var moreEl = document.createElement("a");
    moreEl.className = "charpick-more";

    panel.append(tabsEl, searchWrap, noteEl, statusEl, grid, emptyEl, moreEl);
    wrap.append(btn, panel);
    shell.insertAdjacentElement("afterend", wrap);

    // ---------------------------------------------------------------
    // Cards. Built once per tab and kept — filtering only hides them, the
    // same trade the gallery makes, so typing in the search box never
    // rebuilds four hundred nodes.
    // ---------------------------------------------------------------

    var built = {}; // tab id -> { cards: [], frag: DocumentFragment }
    var activeTab = TABS[0];

    function buildCards(tab) {
      if (built[tab.id]) return built[tab.id];
      var frag = document.createDocumentFragment();
      var cards = [];
      tab.groupsOf(C).forEach(function (group) {
        group.items.forEach(function (item) {
          var card = document.createElement("button");
          card.type = "button";
          card.className = "charpick-card";
          card.title = item.name;
          card.setAttribute("aria-label", "Insert " + item.name);
          var glyph = document.createElement("span");
          glyph.className = "charpick-glyph";
          glyph.textContent = item.char;
          card.appendChild(glyph);
          card.addEventListener("click", function () { insert(item); });
          frag.appendChild(card);
          cards.push({
            el: card,
            // One lowercased haystack per card, joined once here rather
            // than rebuilt on every keystroke.
            hay: (item.name + " " + (item.keywords || []).join(" ") + " " +
                  group.name + " " + group.slug).toLowerCase(),
          });
        });
      });
      built[tab.id] = { cards: cards, frag: frag };
      return built[tab.id];
    }

    function showTab(tab) {
      activeTab = tab;
      var b = buildCards(tab);
      grid.textContent = "";
      b.cards.forEach(function (c) { grid.appendChild(c.el); });
      noteEl.textContent = tab.note;
      moreEl.href = tab.more.href;
      moreEl.textContent = tab.more.text + " →";
      search.placeholder = "Filter " + tab.label.toLowerCase() + "…";
      tabsEl.querySelectorAll("[role=tab]").forEach(function (t) {
        t.setAttribute("aria-selected", String(t.dataset.tab === tab.id));
      });
      applySearch();
    }

    TABS.forEach(function (tab) {
      var t = document.createElement("button");
      t.type = "button";
      t.className = "charpick-tab";
      t.setAttribute("role", "tab");
      t.dataset.tab = tab.id;
      t.textContent = tab.label;
      t.addEventListener("click", function () {
        activeTab = tab;
        if (C) showTab(tab);
      });
      tabsEl.appendChild(t);
    });

    function applySearch() {
      // The box is reachable while the catalogue is still in flight.
      if (!built[activeTab.id]) return;
      var q = search.value.trim().toLowerCase();
      var cards = built[activeTab.id].cards;
      var shown = 0;
      cards.forEach(function (c) {
        var hit = !q || c.hay.indexOf(q) !== -1;
        c.el.hidden = !hit;
        if (hit) shown++;
      });
      emptyEl.hidden = shown > 0;
      emptyEl.textContent = shown > 0 ? "" : "Nothing matches “" + search.value.trim() + "”";
    }
    search.addEventListener("input", applySearch);

    // ---------------------------------------------------------------
    // Insert at the cursor, then let the page's own wiring react
    // ---------------------------------------------------------------

    function insert(item) {
      var start = input.selectionStart;
      var end = input.selectionEnd;
      var before = input.value;
      if (start === null || start === undefined) { start = before.length; end = before.length; }
      var next = (before.slice(0, start) + item.char + before.slice(end)).slice(0, maxLen);
      if (next === before) {
        // The input is full. A card that visibly does nothing reads as a
        // broken card, so the reason gets said out loud.
        if (liveRegion) liveRegion.textContent = "No room left — the box holds " + maxLen + " characters";
        return;
      }
      input.value = next;
      var caret = Math.min(start + item.char.length, next.length);
      input.setSelectionRange(caret, caret);
      // The homepage, the Combiner and every other consumer listen for
      // `input`. Dispatching it is the whole integration — nothing here
      // knows what those pages do with the text.
      input.dispatchEvent(new Event("input", { bubbles: true }));
      if (liveRegion) liveRegion.textContent = item.name + " added to your text";
    }

    // ---------------------------------------------------------------
    // Open / close
    // ---------------------------------------------------------------

    var loading = false;

    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (!open) return;
      if (C) {
        if (!built[activeTab.id]) showTab(activeTab);
        search.focus();
        return;
      }
      if (loading) return;
      loading = true;
      statusEl.hidden = false;
      statusEl.textContent = "Loading characters…";
      loadCatalogue().then(function (cat) {
        C = cat;
        loading = false;
        statusEl.hidden = true;
        showTab(activeTab);
        // Only steal focus if the panel is still open — a visitor who hit
        // Escape while it loaded should not have the caret yanked back.
        if (!panel.hidden) search.focus();
      }).catch(function () {
        loading = false;
        statusEl.hidden = false;
        statusEl.innerHTML =
          'Could not load the characters. <a href="/kaomoji/">Open the kaomoji picker</a> instead.';
      });
    }

    btn.addEventListener("click", function () {
      setOpen(panel.hidden);
    });

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && !panel.hidden) {
        setOpen(false);
        btn.focus();
      }
    });

    document.addEventListener("click", function (evt) {
      if (panel.hidden) return;
      if (!wrap.contains(evt.target)) setOpen(false);
    });

    // Chrome only — the grid stays empty until the catalogue arrives.
    tabsEl.querySelectorAll("[role=tab]").forEach(function (t) {
      t.setAttribute("aria-selected", String(t.dataset.tab === activeTab.id));
    });
    noteEl.textContent = activeTab.note;
    moreEl.href = activeTab.more.href;
    moreEl.textContent = activeTab.more.text + " →";
    search.placeholder = "Filter " + activeTab.label.toLowerCase() + "…";
    setOpen(false);
  });
})();
