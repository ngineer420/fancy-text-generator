/* Font Combiner — /combine/ page wiring.
   Chains FancyText styles in sequence: each step's output is the next
   step's input. Requires fancytext-core.js and site.js to be loaded first. */

(function () {
  "use strict";

  const { debounce, copyText } = window.Site;
  const STYLES = FancyText.STYLES;
  const STYLE_BY_ID = FancyText.STYLE_BY_ID;

  const SAMPLE_TEXT = "Fancy Text";
  const MAX_STEPS = 6;
  // The default chain is the combo that inspired the tool: flip, then
  // underline every inverted letter.
  const DEFAULT_CHAIN = ["upside-down", "underline"];

  const PRESETS = [
    { name: "Flipped Underline", ids: ["upside-down", "underline"] },
    { name: "Struck Bold", ids: ["bold", "strikethrough"] },
    { name: "Gothic Glitch", ids: ["fraktur", "zalgo-medium"] },
    { name: "Wide Script", ids: ["script", "spaced"] },
    { name: "Royal Wrap", ids: ["bold-script", "ornamental-wrap"] },
    { name: "Cursed Bubble", ids: ["circled", "zalgo-light"] },
  ];

  // When the user adds a blank step, seed it with an effect that's not
  // already in the chain — effects apply to anything, so the new step
  // visibly does something instead of starting as a "no change" dud.
  const ADD_CANDIDATES = ["underline", "strikethrough", "zalgo-light", "spaced", "slashed", "double-underline"];

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("combine-input");
    const clearBtn = document.getElementById("clear-btn");
    const chainList = document.getElementById("chain-list");
    const addStepBtn = document.getElementById("add-step");
    const presetRow = document.getElementById("preset-row");
    const output = document.getElementById("combine-output");
    const copyBtn = document.getElementById("copy-result");
    const liveRegion = document.getElementById("copy-live-region");
    if (!input || !chainList) return;

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

      const select = document.createElement("select");
      select.className = "chain-select";
      select.setAttribute("aria-label", "Style for step " + (index + 1));
      STYLES.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
      select.value = styleId;
      select.addEventListener("change", () => {
        chain[index] = select.value;
        rebuildSteps();
      });

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
      head.append(num, select, badge, controls);

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
      addStepBtn.hidden = chain.length >= MAX_STEPS;
      render();
      writeUrlDebounced();
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
    }

    /* ---------- presets ---------- */

    PRESETS.forEach((preset) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-pill";
      chip.textContent = preset.name;
      chip.addEventListener("click", () => {
        chain = preset.ids.slice();
        rebuildSteps();
      });
      presetRow.appendChild(chip);
    });

    /* ---------- controls ---------- */

    addStepBtn.addEventListener("click", () => {
      if (chain.length >= MAX_STEPS) return;
      const id = ADD_CANDIDATES.find((c) => !chain.includes(c)) || "underline";
      chain.push(id);
      rebuildSteps();
    });

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
    rebuildSteps();
  });
})();
