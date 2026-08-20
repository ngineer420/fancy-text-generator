#!/usr/bin/env node
/* Fail if any character in assets/js/characters.js has no glyph in a system font.
 *
 *     node tools/check_glyphs.mjs
 *
 * fontloom loads no webfont anywhere — zero external requests is a hard rule —
 * so a character the visitor's device has no glyph for arrives as a tofu box.
 * A picker full of tofu is worse than a smaller picker, and it is invisible to
 * every kind of review that is not "render it and look", because the source
 * file is perfectly valid text either way.
 *
 * How it decides: it paints one code point at a time onto a canvas in the
 * site's own font stack and compares the pixels against U+0378, a code point
 * Unicode has permanently left unassigned. Nothing can ever have a glyph for
 * U+0378, so whatever the browser draws there is this machine's tofu, and any
 * code point that paints the same bitmap has no glyph either. A blank raster
 * is reported separately: an invisible character in a picker is its own bug.
 *
 * Skipped, because painting them alone proves nothing: ASCII, whitespace,
 * combining marks (they need a base), and the joiners and variation selectors
 * that only have meaning inside a sequence. Whole entries containing those are
 * still checked visually — see the browser-check pass in the PR.
 *
 * This is a per-machine answer, not a universal one: it certifies the glyph
 * coverage of the box it runs on. That is still the check worth having, since
 * the alternative is shipping the set unlooked-at.
 */

import { execFile } from "node:child_process";
import { writeFile, rm, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Characters = require(join(HERE, "..", "assets", "js", "characters.js"));

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));

if (!CHROME) {
  console.error("No Chrome found — cannot check glyph coverage.");
  process.exit(2);
}

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/* ------------------------------------------------------------------ collect */

const SKIP_CATEGORY = /\p{Mn}|\p{Me}|\p{Cf}|\p{Zs}|\p{Cc}/u;

const points = new Map(); // code point -> [{group, name}]
for (const [kind, list] of [["kaomoji", Characters.KAOMOJI], ["symbols", Characters.SYMBOLS]]) {
  for (const group of list) {
    for (const item of group.items) {
      for (const ch of item.char) {
        const cp = ch.codePointAt(0);
        if (cp < 0x80) continue;
        if (SKIP_CATEGORY.test(ch)) continue;
        if (!points.has(ch)) points.set(ch, []);
        points.get(ch).push(kind + "/" + group.slug + " " + item.name);
      }
    }
  }
}

const chars = [...points.keys()];

/* ------------------------------------------------------------------- render */

const PAGE = `<!doctype html><meta charset="utf-8"><body><pre id="out"></pre><script>
const CHARS = ${JSON.stringify(chars)};
const c = document.createElement("canvas");
c.width = 64; c.height = 64;
const g = c.getContext("2d", { willReadFrequently: true });

function raster(ch) {
  g.clearRect(0, 0, 64, 64);
  g.font = '40px ${FONT_STACK.replace(/'/g, "\\'")}';
  g.textBaseline = "middle";
  g.fillStyle = "#000";
  g.fillText(ch, 6, 34);
  const d = g.getImageData(0, 0, 64, 64).data;
  let h = 5381, ink = 0;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] > 8) ink++;
    h = ((h * 33) ^ d[i]) >>> 0;
  }
  return { h, ink };
}

const tofu = raster("\\u0378");
const blank = raster("\\u0020");
const out = [];
for (const ch of CHARS) {
  const r = raster(ch);
  if (r.h === tofu.h) out.push([ch, "tofu"]);
  else if (r.ink === 0 || r.h === blank.h) out.push([ch, "blank"]);
}
document.getElementById("out").textContent =
  JSON.stringify({ checked: CHARS.length, tofuRef: tofu.ink, bad: out });
</script>`;

const dir = await mkdtemp(join(tmpdir(), "glyphcheck-"));
const file = join(dir, "check.html");
await writeFile(file, PAGE, "utf8");

// execFile rather than spawn: Chrome's crash handler inherits whichever of the
// standard streams is left unpiped and outlives the browser holding it open,
// so a spawn that discards stderr never reaches the end of stdout and the
// script hangs forever. Piping both is what lets it finish.
const html = await new Promise((resolve, reject) => {
  execFile(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${join(dir, "profile")}`,
      "--dump-dom",
      "file://" + file,
    ],
    { maxBuffer: 64 * 1024 * 1024, timeout: 60000 },
    (err, stdout) => (err && !stdout ? reject(err) : resolve(stdout))
  );
});

await rm(dir, { recursive: true, force: true });

const match = html.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!match) {
  console.error("Chrome produced no result — is it able to run headless here?");
  process.exit(2);
}
const result = JSON.parse(
  match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
);

/* ------------------------------------------------------------------- report */

if (result.tofuRef === 0) {
  console.error(
    "U+0378 painted nothing, so there is no tofu bitmap to compare against and\n" +
      "this check cannot tell a missing glyph from a present one. Not a pass."
  );
  process.exit(2);
}

if (!result.bad.length) {
  console.log(`every glyph renders: ${result.checked} distinct code points, no tofu, no blanks`);
  process.exit(0);
}

console.log(`${result.bad.length} of ${result.checked} code points do not render:`);
for (const [ch, why] of result.bad) {
  const cp = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
  console.log(`  ${cp} ${why} — ${points.get(ch).slice(0, 3).join("; ")}`);
}
console.log("\nReplace or drop these in assets/js/characters.js.");
process.exit(1);
