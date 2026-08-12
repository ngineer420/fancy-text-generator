#!/usr/bin/env node
/* What each style is actually made of, and what that means per platform.
 *
 * The four platform pages (/instagram-fonts/, /discord-fonts/, /tiktok-fonts/,
 * /twitter-fonts/) claim that a specific shortlist of styles survives on a
 * specific field. The claim has to come from somewhere checkable, so it comes
 * from here: for every style, this reports
 *
 *   - the Unicode blocks its output lands in, and whether they are BMP or
 *     astral (the astral Enclosed Alphanumeric Supplement is the one with
 *     visibly thinner font coverage on older Android system fonts);
 *   - whether any character it emits has Emoji_Presentation, i.e. will be
 *     drawn as a colour emoji rather than a letter. That is not a stylistic
 *     nitpick: 🅰 🅱 🅾 🅿 are emoji, so "negative squared" text arrives with
 *     four random letters in colour;
 *   - whether it can form a country flag (regional indicators do);
 *   - what a 20-character display name costs under it, in code points, which
 *     is what a bio limit counts.
 *
 * `node tools/platform_check.js` prints the table. `test/platform.test.js`
 * asserts the shortlists below against it, and against the pages themselves,
 * so a page and its evidence cannot drift apart.
 *
 * What this is NOT: a claim that anyone pasted every style into every app on
 * every handset. It is a claim about the characters and about each field's
 * documented input rules. The pages say exactly that, in those words.
 */
"use strict";

const FancyText = require("../assets/js/fancytext-core.js");

const SAMPLE_NAME = "Fancy Text Example"; // 18 chars, a realistic display name

// Unicode blocks these transforms can reach, and how safe each one is.
const BLOCKS = [
  { name: "Basic Latin", from: 0x0000, to: 0x007f, tier: "plain" },
  { name: "Latin-1 Supplement", from: 0x0080, to: 0x00ff, tier: "wide" },
  { name: "Latin Extended-A/B", from: 0x0100, to: 0x024f, tier: "wide" },
  { name: "Thai (currency baht)", from: 0x0e00, to: 0x0e7f, tier: "wide" },
  { name: "IPA Extensions", from: 0x0250, to: 0x02af, tier: "wide" },
  { name: "Spacing Modifier Letters", from: 0x02b0, to: 0x02ff, tier: "wide" },
  { name: "Combining Diacritical Marks", from: 0x0300, to: 0x036f, tier: "combining" },
  { name: "Greek and Coptic", from: 0x0370, to: 0x03ff, tier: "wide" },
  { name: "Cyrillic", from: 0x0400, to: 0x04ff, tier: "wide" },
  { name: "Hebrew", from: 0x0590, to: 0x05ff, tier: "wide" },
  { name: "Arabic", from: 0x0600, to: 0x06ff, tier: "wide" },
  { name: "Phonetic Extensions", from: 0x1d00, to: 0x1d7f, tier: "wide" },
  { name: "Phonetic Extensions Supplement", from: 0x1d80, to: 0x1dbf, tier: "wide" },
  { name: "Latin Extended Additional", from: 0x1e00, to: 0x1eff, tier: "wide" },
  { name: "General Punctuation", from: 0x2000, to: 0x206f, tier: "wide" },
  { name: "Superscripts and Subscripts", from: 0x2070, to: 0x209f, tier: "wide" },
  { name: "Currency Symbols", from: 0x20a0, to: 0x20cf, tier: "wide" },
  { name: "Letterlike Symbols", from: 0x2100, to: 0x214f, tier: "wide" },
  { name: "Mathematical Operators", from: 0x2200, to: 0x22ff, tier: "wide" },
  { name: "Enclosed Alphanumerics", from: 0x2460, to: 0x24ff, tier: "wide" },
  { name: "Miscellaneous Symbols", from: 0x2600, to: 0x26ff, tier: "wide" },
  { name: "Dingbats", from: 0x2700, to: 0x27bf, tier: "wide" },
  { name: "Latin Extended-C", from: 0x2c60, to: 0x2c7f, tier: "wide" },
  { name: "Latin Extended-D", from: 0xa720, to: 0xa7ff, tier: "wide" },
  { name: "Arabic Presentation Forms-B", from: 0xfe70, to: 0xfeff, tier: "rtl" },
  { name: "Hangul Jamo / CJK compat", from: 0x1100, to: 0x11ff, tier: "wide" },
  { name: "Halfwidth and Fullwidth Forms", from: 0xff00, to: 0xffef, tier: "cjk" },
  { name: "CJK Symbols and Punctuation", from: 0x3000, to: 0x303f, tier: "cjk" },
  { name: "Bopomofo / CJK strokes", from: 0x3100, to: 0x31ef, tier: "cjk" },
  { name: "Mathematical Alphanumeric Symbols", from: 0x1d400, to: 0x1d7ff, tier: "math" },
  { name: "Enclosed Alphanumeric Supplement", from: 0x1f100, to: 0x1f1ff, tier: "supplement" },
];

function blockOf(cp) {
  const hit = BLOCKS.find((b) => cp >= b.from && cp <= b.to);
  return hit || { name: "U+" + cp.toString(16).toUpperCase(), tier: "unknown" };
}

const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u;
// Emoji_Presentation is the "always drawn in colour" set. The wider Emoji
// property catches the letters that are colour on *some* platforms and mono on
// others — 🅰 🅱 🅾 🅿 and Ⓜ — which is exactly the surprise worth warning about.
const EMOJI_ANY = /\p{Emoji}/u;
const REGIONAL = /[\u{1F1E6}-\u{1F1FF}]/u;
// Right-to-left characters reorder the text around them under the bidi
// algorithm. Two sneak into the Greek-style alphabet: j becomes Hebrew נ and
// g becomes Arabic ﻭ. (V8 has no Bidi_Class property escape, so this is the
// RTL block ranges written out: Hebrew through Arabic Extended, plus both
// Arabic Presentation Forms blocks.)
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;

function analyse(styleId) {
  const style = FancyText.STYLE_BY_ID[styleId];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const out = style.transform(alphabet);
  const blocks = new Map();
  const emoji = [];
  const colourRisk = [];
  const rtl = [];
  for (const ch of out) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) continue; // untouched ASCII: the fallback, not the style
    const b = blockOf(cp);
    if (!blocks.has(b.name)) blocks.set(b.name, b.tier);
    if (EMOJI_PRESENTATION.test(ch)) emoji.push(ch);
    else if (EMOJI_ANY.test(ch)) colourRisk.push(ch);
    if (RTL.test(ch)) rtl.push(ch);
  }
  const styledName = style.transform(SAMPLE_NAME);
  return {
    id: styleId,
    name: style.name,
    blocks: [...blocks.keys()],
    tiers: [...new Set(blocks.values())],
    emoji: [...new Set(emoji)],
    colourRisk: [...new Set(colourRisk)],
    rtl: [...new Set(rtl)],
    formsFlags: REGIONAL.test(out),
    plainCost: Array.from(SAMPLE_NAME).length,
    styledCost: Array.from(styledName).length,
    sample: style.transform("Fancy Text"),
  };
}

/* ---- the shortlists the four pages publish ---------------------------- */
/* A style earns a place on a platform page when nothing in the analysis
   above disqualifies it for that platform's field:
     - no Emoji_Presentation character (it would arrive in colour);
     - it cannot form a flag;
     - under the field's length limit for a realistic name/bio;
     - and for the tightest fields, no combining marks, which double the cost
       with nothing visible to show for it. */

const PLATFORMS = {
  instagram: {
    slug: "instagram-fonts",
    // The field each list is written against, and the tightest field on the
    // same platform, which is where a doubled character count starts to hurt.
    field: { name: "bio", limit: 150 },
    tightField: null,
    // Bio is 150 characters and captions 2200, so cost is rarely the binding
    // constraint; the constraint is font coverage on the phone reading it.
    styles: ["bold", "italic", "bold-italic", "script", "bold-script", "fraktur",
             "bold-fraktur", "double-struck", "monospace", "sans-serif", "sans-bold",
             "sans-italic", "sans-bold-italic", "small-caps", "circled", "fullwidth",
             "superscript", "subscript", "strikethrough", "underline", "upside-down"],
  },
  discord: {
    slug: "discord-fonts",
    field: { name: "message", limit: 2000 },
    tightField: { name: "nickname", limit: 32 },
    // Nicknames cap at 32 characters; messages do not. Combining marks are
    // fine in a message and wasteful in a nickname, so they stay listed with
    // the cost spelled out.
    styles: ["bold", "italic", "bold-italic", "script", "bold-script", "fraktur",
             "bold-fraktur", "double-struck", "monospace", "sans-serif", "sans-bold",
             "sans-italic", "sans-bold-italic", "small-caps", "circled", "fullwidth",
             "superscript", "subscript", "strikethrough", "underline", "upside-down",
             "negative-circled", "parenthesized", "faux-cyrillic", "currency"],
  },
  tiktok: {
    slug: "tiktok-fonts",
    field: { name: "bio", limit: 80 },
    tightField: null,
    // Bio is 80 characters. Combining-mark styles double the count for no
    // visible gain, so they are deliberately absent from this one.
    styles: ["bold", "italic", "bold-italic", "script", "bold-script", "fraktur",
             "bold-fraktur", "double-struck", "monospace", "sans-serif", "sans-bold",
             "sans-italic", "sans-bold-italic", "small-caps", "circled", "fullwidth",
             "superscript", "upside-down"],
  },
  twitter: {
    slug: "twitter-fonts",
    field: { name: "post", limit: 280 },
    tightField: { name: "display name", limit: 50 },
    // Display name caps at 50 characters.
    styles: ["bold", "italic", "bold-italic", "script", "bold-script", "fraktur",
             "bold-fraktur", "double-struck", "monospace", "sans-serif", "sans-bold",
             "sans-italic", "sans-bold-italic", "small-caps", "circled", "fullwidth",
             "superscript", "subscript", "strikethrough", "underline", "upside-down"],
  },
};

module.exports = { analyse, PLATFORMS, SAMPLE_NAME, EMOJI_PRESENTATION, EMOJI_ANY, RTL };

if (require.main === module) {
  const rows = FancyText.STYLE_PAGES.map((p) => analyse(p.id));
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("style", 20), pad("tiers", 26), pad("emoji", 8), pad("colour?", 8),
              pad("rtl", 5), pad("flags", 6), "18 chars costs");
  for (const r of rows) {
    console.log(pad(r.id, 20), pad(r.tiers.join(","), 26), pad(r.emoji.join("") || "-", 8),
                pad(r.colourRisk.join("") || "-", 8), pad(r.rtl.join("") || "-", 5),
                pad(r.formsFlags ? "YES" : "-", 6), r.styledCost + " (plain " + r.plainCost + ")");
  }
  console.log("\nblocks per style:");
  for (const r of rows) console.log("  " + pad(r.id, 20) + r.blocks.join(", "));
}
