/* fontloom.com — the focused single-purpose tool pages (/flip/, /glitch/,
   /strikethrough/, /small-caps/, /vaporwave/).

   Every one of these is the same page with a different shortlist of styles, so
   they share one runtime rather than five near-identical scripts. The page
   declares which tool it is with `data-tool` on <main>; everything else —
   which styles, what to warn about, what the sample text is — comes from the
   TOOLS table below.

   Two things here exist on every page and matter more than the tool count:

   - a "where this works" note per style, because most of these transforms are
     stripped, refused or unrenderable somewhere, and finding that out after
     pasting is the single most common complaint about tools in this category;
   - a character-count readout, because combining marks push a "20 character"
     bio past the limit with nothing visible to explain it.

   Load after fancytext-core.js, site.js and favorites.js. */

(function () {
  "use strict";

  const { debounce, copyText, renderCharCount } = window.Site;
  const {
    STYLE_BY_ID, applyChain, supportNote, SUPPORT_KINDS,
    zalgoText, ZALGO_LEVELS, ZALGO_MAX_MARKS,
  } = FancyText;
  const Favs = window.Favs;

  const SAMPLE_TEXT = "Fancy Text";
  const MAX_LEN = 300;

  /* ---------- the tools ---------- */
  /* `chain` is a list of style ids applied in order, so a variant can be a
     combination without inventing a registry entry for it. `gap` is the
     honest note about which letters this style simply does not have — the
     fallback to a plain character is by design and saying so up front stops
     it being reported as a bug. */

  const TOOLS = {
    flip: {
      variants: [
        {
          id: "upside-down", name: "Upside-Down", chain: ["upside-down"],
          blurb: "Every letter swapped for its rotated lookalike, then the whole line reversed so it reads correctly when turned over.",
        },
        {
          id: "mirror", name: "Backwards / Mirror", chain: ["mirror"],
          blurb: "Reversed order with the letters that have a mirrored twin swapped for it. Read it in a mirror.",
        },
        {
          id: "flip-mirror", name: "Upside-Down + Backwards", chain: ["upside-down", "mirror"],
          support: "reordered",
          blurb: "Both at once — rotated glyphs left in their original order, which is what you want for a rotated banner rather than a mirror.",
        },
        {
          id: "flip-underline", name: "Upside-Down + Underlined", chain: ["upside-down", "underline"],
          support: "combining",
          blurb: "The flip survives an underline because the mark travels with its letter through the reverse.",
        },
      ],
    },

    strikethrough: {
      variants: [
        {
          id: "strikethrough", name: "Strikethrough", chain: ["strikethrough"],
          blurb: "A line through the middle, in a field that has no formatting button — pricing, edits, crossed-off lists.",
        },
        {
          id: "underline", name: "Underline", chain: ["underline"],
          blurb: "A single rule under every character, glued to the letter rather than drawn by the app.",
        },
        {
          id: "double-underline", name: "Double Underline", chain: ["double-underline"],
          blurb: "Two rules. Reads as emphasis where a single underline reads as a link.",
        },
        {
          id: "overline", name: "Overline", chain: ["overline"],
          blurb: "A rule above — the vinculum, for a mean (x̅) or a repeating decimal, where the maths notation has to survive as plain text.",
        },
        {
          id: "slashed", name: "Slashed", chain: ["slashed"],
          blurb: "A diagonal stroke per character. Heavier than a strikethrough and harder to miss.",
        },
        {
          id: "strike-underline", name: "Struck + Underlined", chain: ["strikethrough", "underline"],
          support: "combining",
          blurb: "Marks stack, so effects combine freely — two per character here, and two per character against your bio limit.",
        },
      ],
    },

    "small-caps": {
      variants: [
        {
          id: "small-caps", name: "Small Caps", chain: ["small-caps"],
          gap: "Unicode has no small-capital Q or X anywhere, so those two stay lowercase. Type them as capitals if you need the shape.",
          blurb: "Real small-capital characters from the phonetic blocks, not shrunk capitals — so they survive copy and paste.",
        },
        {
          id: "superscript", name: "Superscript", chain: ["superscript"],
          gap: "Lowercase q has no superscript form, and capital C, F, Q, S, V, X, Y and Z have none either. Those stay as typed.",
          blurb: "Raised characters for footnote marks, exponents and units in a field that will not take formatting.",
        },
        {
          id: "subscript", name: "Subscript", chain: ["subscript"],
          gap: "Subscript is the thinnest set in Unicode: no capitals at all, and no b, c, d, f, g, q, w, y or z. Everything else passes through unchanged.",
          blurb: "Lowered characters — chemical formulae, indices, H₂O in a plain-text field.",
        },
        {
          id: "small-caps-underline", name: "Small Caps + Underlined", chain: ["small-caps", "underline"],
          support: "combining",
          blurb: "Small caps are ordinary BMP letters, so combining marks sit on them cleanly — which is not true of the maths alphabets.",
        },
      ],
    },

    vaporwave: {
      variants: [
        {
          id: "fullwidth", name: "Fullwidth (ａｅｓｔｈｅｔｉｃ)", chain: ["fullwidth"],
          blurb: "The real vaporwave look. These are separate double-width characters from the CJK block — not letters with spaces jammed between them, and it shows.",
        },
        {
          id: "spaced", name: "Spaced Out", chain: ["spaced"],
          blurb: "An ordinary space after every character. Cruder than fullwidth, but it works on the handful of fonts that lack the wide forms.",
        },
        {
          id: "fullwidth-spaced", name: "Fullwidth + Spaced", chain: ["fullwidth", "spaced"],
          support: "fullwidth",
          blurb: "Maximum drift. Doubles the width again — check it still fits wherever you are pasting it.",
        },
        // No combining-mark variant here on purpose. A strikethrough or an
        // underline is drawn to the width of its base character, and a
        // fullwidth base is twice as wide — so the marks meet end to end and
        // the line renders as a row of solid black bars with the letters
        // completely hidden. It reads as a broken font, not an effect.
      ],
    },

    glitch: {
      mode: "single",
      support: "zalgo",
    },
  };

  const COPY_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>';
  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main[data-tool]");
    if (!main) return;
    const config = TOOLS[main.dataset.tool];
    if (!config) return;

    const input = document.getElementById("tool-input");
    const clearBtn = document.getElementById("clear-btn");
    const grid = document.getElementById("variant-grid");
    const liveRegion = document.getElementById("copy-live-region");
    const countEl = document.getElementById("char-count");
    if (!input) return;

    /* ---------- URL state ---------- */
    /* Same contract as /combine/ and /mix/: `?text=` only, replaceState so the
       back button still leaves the page, and the typed text re-clamped to the
       field's own limit on the way in. */

    function readUrl() {
      return (new URLSearchParams(location.search).get("text") || "").slice(0, MAX_LEN);
    }

    function writeUrl() {
      const params = new URLSearchParams();
      if (input.value) params.set("text", input.value);
      const qs = params.toString();
      history.replaceState(null, "", qs ? "?" + qs : location.pathname);
    }
    const writeUrlDebounced = debounce(writeUrl, 300);

    /** What we actually transform: the typed text, or the sample when empty. */
    function sourceText() {
      return input.value || SAMPLE_TEXT;
    }

    /* ---------- character count ---------- */

    function renderCount(styledText) {
      renderCharCount(countEl, sourceText(), styledText);
    }

    /* ---------- the "where this works" note ---------- */

    function supportBlock(variant) {
      const note = variant.support ? SUPPORT_KINDS[variant.support] : supportNote(variant.chain[0]);
      const wrap = document.createElement("div");
      wrap.className = "tile-support";
      const bits = [];
      if (variant.blurb) bits.push('<span class="support-blurb">' + variant.blurb + "</span>");
      bits.push('<span class="support-line support-works"><span class="support-key">Works</span>' + note.works + "</span>");
      bits.push('<span class="support-line support-watch"><span class="support-key">Watch out</span>' + note.watch + "</span>");
      if (variant.gap) {
        bits.push('<span class="support-line support-gap"><span class="support-key">Missing letters</span>' + variant.gap + "</span>");
      }
      wrap.innerHTML = bits.join("");
      return wrap;
    }

    /* ---------- copy behaviour, shared by every card ---------- */

    function wireCopy(card, getText, label) {
      async function doCopy(evt) {
        if (evt) evt.stopPropagation();
        const ok = await copyText(getText());
        if (!ok) return;
        card.classList.remove("is-copied");
        void card.offsetWidth; // restart the flash on a rapid second click
        card.classList.add("is-copied");
        clearTimeout(card._copyTimer);
        card._copyTimer = setTimeout(() => card.classList.remove("is-copied"), 1200);
        if (liveRegion) liveRegion.textContent = label + " copied to clipboard";
      }
      return doCopy;
    }

    /* ---------- grid mode: one card per variant ---------- */

    const cards = [];

    function buildCard(variant) {
      const card = document.createElement("div");
      card.className = "tile variant-tile";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Copy " + variant.name + " text");

      const output = document.createElement("div");
      output.className = "tile-output";

      const foot = document.createElement("div");
      foot.className = "tile-foot";

      const label = document.createElement("span");
      label.className = "tile-foot-label";
      const nameEl = document.createElement("span");
      nameEl.className = "tile-name";
      nameEl.textContent = variant.name;
      const copiedEl = document.createElement("span");
      copiedEl.className = "tile-copied";
      copiedEl.setAttribute("aria-hidden", "true");
      copiedEl.innerHTML = CHECK_ICON + "<span>Copied</span>";
      label.append(nameEl, copiedEl);

      // Only single-style variants can be starred — the favorites store keys
      // on style ids, and inventing ids for these combinations would put
      // entries in it that no other page could resolve.
      let starEl = null;
      if (variant.chain.length === 1 && STYLE_BY_ID[variant.chain[0]]) {
        starEl = document.createElement("button");
        starEl.type = "button";
        starEl.className = "tile-star";
        starEl.addEventListener("click", (evt) => {
          evt.stopPropagation();
          Favs.toggleStyle(variant.chain[0]);
          syncStars();
        });
      }

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-icon-btn";
      copyBtn.setAttribute("aria-label", "Copy " + variant.name + " text");
      copyBtn.innerHTML = COPY_ICON;

      foot.append(label, ...(starEl ? [starEl] : []), copyBtn);
      card.append(output, foot, supportBlock(variant));

      const doCopy = wireCopy(card, () => output.textContent, variant.name);
      card.addEventListener("click", doCopy);
      card.addEventListener("keydown", (evt) => {
        // Let a focused nested button own its own activation rather than
        // firing the copy twice.
        if (evt.target !== card) return;
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          doCopy(evt);
        }
      });
      copyBtn.addEventListener("click", doCopy);

      cards.push({ variant, outputEl: output, starEl, cardEl: card });
      grid.appendChild(card);
    }

    function syncStars() {
      for (const c of cards) {
        if (!c.starEl) continue;
        const starred = Favs.hasStyle(c.variant.chain[0]);
        c.starEl.textContent = starred ? "★" : "☆";
        c.starEl.setAttribute("aria-pressed", String(starred));
        c.starEl.title = starred ? "Remove from favorites" : "Save to favorites";
        c.cardEl.classList.toggle("is-starred", starred);
      }
    }

    /* ---------- single mode: the glitch slider ---------- */

    const slider = document.getElementById("intensity");
    const intensityOut = document.getElementById("intensity-value");
    const rerollBtn = document.getElementById("reroll");
    const singleOut = document.getElementById("tool-output");
    const singleCopy = document.getElementById("copy-result");

    function renderSingle() {
      const level = slider ? Number(slider.value) : ZALGO_LEVELS.medium;
      const text = zalgoText(sourceText(), level);
      singleOut.textContent = text;
      if (intensityOut) {
        // Naming the ceiling explains why the slider stops feeling stronger
        // near the top, instead of leaving it looking broken.
        intensityOut.textContent =
          level + "%" + (level >= 95 ? " — capped at " + ZALGO_MAX_MARKS + " marks per character" : "");
      }
      renderCount(text);
      return text;
    }

    /* ---------- render ---------- */

    function render() {
      const text = sourceText();
      if (config.mode === "single") {
        renderSingle();
      } else {
        let longest = "";
        for (const c of cards) {
          const out = applyChain(c.variant.chain, text);
          c.outputEl.textContent = out;
          if (out.length > longest.length) longest = out;
        }
        // The readout reflects the heaviest variant on the page, which is the
        // one most likely to blow a limit.
        renderCount(longest);
      }
      if (clearBtn) clearBtn.hidden = !input.value;
    }

    /* ---------- init ---------- */

    if (config.mode === "single") {
      if (!singleOut) return;
      if (slider) slider.addEventListener("input", renderSingle);
      if (rerollBtn) {
        rerollBtn.addEventListener("click", () => {
          renderSingle();
          if (liveRegion) liveRegion.textContent = "Glitch re-rolled";
        });
      }
      if (singleCopy) {
        const card = singleCopy.closest(".result-panel") || singleCopy;
        const doCopy = wireCopy(card, () => singleOut.textContent, "Glitch text");
        singleCopy.addEventListener("click", async (evt) => {
          await doCopy(evt);
          singleCopy.classList.add("is-copied");
          singleCopy.textContent = "Copied ✓";
          clearTimeout(singleCopy._copyTimer);
          singleCopy._copyTimer = setTimeout(() => {
            singleCopy.classList.remove("is-copied");
            singleCopy.textContent = "Copy";
          }, 1200);
        });
      }
      const supportHost = document.getElementById("support-note");
      if (supportHost) supportHost.appendChild(supportBlock({ support: config.support, chain: [] }));
      // Preset buttons just move the slider; one source of truth for level.
      document.querySelectorAll("[data-level]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (slider) slider.value = String(ZALGO_LEVELS[btn.dataset.level] ?? ZALGO_LEVELS.medium);
          renderSingle();
        });
      });
    } else {
      if (!grid) return;
      config.variants.forEach(buildCard);
      syncStars();
    }

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
    render();
  });
})();
