/* fontloom.com — shared page chrome + tiny helpers used by every page
   (homepage gallery, /combine/, /mix/). Load after fancytext-core.js and
   before the page's own script. */

(function () {
  "use strict";

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Say what a styled string costs, in the units a destination will use.
   *
   * This is the most-reported surprise with fancy text and it is entirely
   * invisible: a ten-letter word with an underline is twenty characters, and
   * one in bold Math letters is twenty UTF-16 units, so a bio that plainly
   * fits gets refused with no explanation. Leading with what a human counts
   * and naming the machine's number beside it — only when the two disagree —
   * is the whole job.
   *
   * `plain` is what the visitor typed, `styled` the transformed result.
   */
  function renderCharCount(el, plain, styled) {
    if (!el) return;
    const count = FancyText.countText(styled);
    const typed = FancyText.countText(plain);
    const parts = [
      '<span class="count-main"><strong>' + count.visible + "</strong> visible " +
      (count.visible === 1 ? "character" : "characters") + "</span>",
    ];
    if (count.counted !== count.visible) {
      parts.push(
        '<span class="count-warn">counts as <strong>' + count.counted +
        "</strong> against a length limit</span>"
      );
    }
    if (typed.counted > 0 && count.counted >= typed.counted * 2) {
      parts.push(
        '<span class="count-warn">about ' + Math.round(count.counted / typed.counted) +
        "× your plain text</span>"
      );
    }
    el.innerHTML = parts.join('<span class="count-sep">·</span>');
  }

  document.addEventListener("DOMContentLoaded", () => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Keep sticky elements positioned right below the real (variable-height)
    // sticky header instead of a hardcoded guess.
    const header = document.querySelector(".site-header");
    function syncHeaderHeight() {
      if (header) {
        document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
      }
    }
    syncHeaderHeight();
    window.addEventListener("resize", debounce(syncHeaderHeight, 150));

    // Theme toggle, matching the portfolio's other tools.
    const toggle = document.getElementById("theme-toggle");
    const stored = localStorage.getItem("ftg-theme");
    if (stored) document.documentElement.setAttribute("data-theme", stored);
    if (toggle) {
      toggle.addEventListener("click", () => {
        const current =
          document.documentElement.getAttribute("data-theme") ||
          (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("ftg-theme", next);
      });
    }
  });

  window.Site = { debounce, copyText, renderCharCount };
})();
