#!/usr/bin/env node
/* Hand the style catalogue to the page generator, as JSON on stdout.
 *
 * `tools/build_style_pages.py` needs two things the engine owns and nothing
 * else can reproduce: which styles have a landing page (FancyText.STYLE_PAGES)
 * and what every letter of the alphabet turns into under each of them. The
 * second one is the point — the character map baked into each generated page
 * has to be the real output of the real transform, not a table maintained by
 * hand next to it, or the page and the tool on it will drift.
 *
 * Python cannot run the transforms, so it shells out to this. Deterministic by
 * construction: STYLE_PAGES excludes the random (zalgo) styles.
 *
 *     node tools/dump_styles.js > /tmp/styles.json
 */
"use strict";

const FancyText = require("../assets/js/fancytext-core.js");

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
const DIGITS = "0123456789".split("");
const SAMPLE = "Fancy Text";

function row(style, chars) {
  return chars.map((ch) => {
    const out = style.transform(ch);
    // `plain` is the honest fallback: Unicode simply has no character for
    // this letter in this style, so mapTransform passed it through. The page
    // marks those rather than pretending the map is complete.
    return { src: ch, out: out, plain: out === ch };
  });
}

const styles = FancyText.STYLE_PAGES.map((page) => {
  const style = FancyText.STYLE_BY_ID[page.id];
  if (!style) throw new Error("STYLE_PAGES references unknown style id: " + page.id);
  if (style.random) throw new Error("style " + page.id + " is random; it cannot have a generated page");
  const note = FancyText.supportNote(page.id);
  const category = FancyText.CATEGORIES.find((c) => c.ids.indexOf(page.id) !== -1);
  return {
    id: style.id,
    name: style.name,
    slug: page.slug,
    sample: style.transform(SAMPLE),
    category: category ? category.id : null,
    categoryTitle: category ? category.title : null,
    support: { kind: note.kind, works: note.works, watch: note.watch },
    upper: row(style, UPPER),
    lower: row(style, LOWER),
    digits: row(style, DIGITS),
  };
});

const payload = {
  sample: SAMPLE,
  categories: FancyText.CATEGORIES.map((c) => ({ id: c.id, title: c.title, ids: c.ids })),
  styles: styles,
};

process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
