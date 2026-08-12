/* The platform pages claim a specific shortlist of styles survives a specific
   field. This is where that claim is held to account.

   Run with: node test/platform.test.js

   Two directions are checked. First, that every style each page lists actually
   passes the checks tools/platform_check.js performs — no character that draws
   as a colour emoji, nothing that can form a flag, no right-to-left character,
   and a cost the field can afford. Second, that the published HTML says what
   the shortlist says: the table on disk is parsed, and its rows compared with
   the list, so hand-editing a page to add a style that fails the checks turns
   the table red instead of shipping. */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const FancyText = require("../assets/js/fancytext-core.js");
const { analyse, PLATFORMS } = require("../tools/platform_check.js");

const ROOT = path.join(__dirname, "..");

let count = 0;
function test(name, fn) {
  fn();
  count++;
  console.log("ok  " + name);
}

/** The (slug, sample) pairs a platform page's compatibility table publishes. */
function tableRows(slug) {
  const html = fs.readFileSync(path.join(ROOT, slug, "index.html"), "utf8");
  const table = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
  const rows = [];
  const re = /<td><a href="\/([a-z0-9-]+)\/">[^<]*<\/a><\/td>\s*<td class="sample">([^<]*)<\/td>\s*<td>([^<]*)<\/td>/g;
  let m;
  while ((m = re.exec(table))) rows.push({ slug: m[1], sample: m[2], note: m[3] });
  return rows;
}

const bySlug = {};
FancyText.STYLE_PAGES.forEach((p) => {
  bySlug[p.slug] = p.id;
});

test("no listed style can render as a colour emoji or form a flag", () => {
  for (const [name, cfg] of Object.entries(PLATFORMS)) {
    for (const id of cfg.styles) {
      const a = analyse(id);
      assert.strictEqual(a.emoji.length, 0,
        name + " lists " + id + ", which emits emoji-presentation characters: " + a.emoji.join(""));
      assert.strictEqual(a.formsFlags, false, name + " lists " + id + ", which forms flags");
      assert.strictEqual(a.rtl.length, 0,
        name + " lists " + id + ", which emits right-to-left characters: " + a.rtl.join(""));
    }
  }
});

test("the styles held back are held back for a stated reason", () => {
  // Each of these fails a specific check. If one of them ever stops failing,
  // the reason to exclude it has gone and the pages should be revisited.
  assert.strictEqual(analyse("regional-indicator").formsFlags, true);
  assert.ok(analyse("negative-squared").colourRisk.length > 0,
    "negative squared is excluded because 🅰 🅱 🅾 🅿 carry the emoji property");
  assert.ok(analyse("greek-style").rtl.length > 0,
    "greek style is excluded because it hides right-to-left characters");
  for (const [name, cfg] of Object.entries(PLATFORMS)) {
    for (const id of ["regional-indicator", "negative-squared", "greek-style", "squared"]) {
      assert.ok(!cfg.styles.includes(id), name + " must not list " + id);
    }
  }
});

test("a colour-risk style is only listed if its note says so", () => {
  // The circled M (U+24C2) carries the emoji property without emoji
  // presentation: it is mono on some platforms and colour on others. That is
  // allowed on a page, but only if the page warns about it.
  for (const cfg of Object.values(PLATFORMS)) {
    for (const row of tableRows(cfg.slug)) {
      const a = analyse(bySlug[row.slug]);
      if (a.colourRisk.length) {
        assert.ok(/colour|color/i.test(row.note),
          cfg.slug + " lists " + row.slug + " without warning that " +
          a.colourRisk.join("") + " can arrive in colour");
      }
    }
  }
});

test("TikTok's list contains nothing that inflates the character count", () => {
  // 80 characters of bio: a combining-mark style spends half of it on marks
  // nobody can see.
  for (const id of PLATFORMS.tiktok.styles) {
    const a = analyse(id);
    assert.strictEqual(a.styledCost, a.plainCost,
      "tiktok lists " + id + ", which costs " + a.styledCost + " for a " + a.plainCost + "-character name");
  }
});

test("every listed style fits the field it is listed for", () => {
  for (const [name, cfg] of Object.entries(PLATFORMS)) {
    for (const id of cfg.styles) {
      const a = analyse(id);
      assert.ok(a.styledCost <= cfg.field.limit,
        name + ": " + id + " costs " + a.styledCost + " against a " +
        cfg.field.limit + "-character " + cfg.field.name);
    }
  }
});

test("a style too expensive for the platform's tightest field is called out", () => {
  // Combining marks are fine in a 2000-character Discord message and ruinous
  // in a 32-character nickname. Listing them is allowed; listing them without
  // saying which field they break is not.
  for (const [name, cfg] of Object.entries(PLATFORMS)) {
    if (!cfg.tightField) continue;
    const overspend = cfg.styles.filter((id) => analyse(id).styledCost > cfg.tightField.limit);
    if (!overspend.length) continue;
    const html = fs.readFileSync(path.join(ROOT, cfg.slug, "index.html"), "utf8");
    assert.ok(html.includes(String(cfg.tightField.limit) + "-character " + cfg.tightField.name) ||
              html.includes(cfg.tightField.name + " limit"),
      cfg.slug + " lists " + overspend.join(", ") + " but never names the " +
      cfg.tightField.limit + "-character " + cfg.tightField.name + " limit");
  }
});

test("each platform page publishes exactly its shortlist, in order", () => {
  for (const [name, cfg] of Object.entries(PLATFORMS)) {
    const rows = tableRows(cfg.slug);
    assert.ok(rows.length > 0, cfg.slug + " has no compatibility table rows");
    const listed = rows.map((r) => bySlug[r.slug]);
    assert.deepStrictEqual(listed, cfg.styles,
      cfg.slug + " table does not match the checked shortlist for " + name);
  }
});

test("the samples printed on a platform page are the real transform output", () => {
  // A retyped sample is a sample that quietly stops being true. These have to
  // be the engine's own answer, character for character.
  for (const cfg of Object.values(PLATFORMS)) {
    for (const row of tableRows(cfg.slug)) {
      const style = FancyText.STYLE_BY_ID[bySlug[row.slug]];
      assert.strictEqual(row.sample, style.transform("Fancy Text"),
        cfg.slug + ": sample for " + row.slug + " is not what the transform produces");
    }
  }
});

test("no platform page claims anyone tested it on a device", () => {
  // The pages are allowed to say what the characters are. They are not
  // allowed to imply a lab of handsets that does not exist.
  const banned = [/we tested/i, /we pasted/i, /verified on (an? )?(iphone|android|device)/i,
                  /tested on (an? )?(iphone|android|device)/i];
  for (const cfg of Object.values(PLATFORMS)) {
    const html = fs.readFileSync(path.join(ROOT, cfg.slug, "index.html"), "utf8");
    for (const re of banned) {
      assert.ok(!re.test(html), cfg.slug + " claims device testing: " + re);
    }
    assert.ok(/How this list was checked/.test(html),
      cfg.slug + " must show its method");
  }
});

test("every platform page carries the ad tag once and no ad slots", () => {
  for (const cfg of Object.values(PLATFORMS)) {
    const html = fs.readFileSync(path.join(ROOT, cfg.slug, "index.html"), "utf8");
    const tags = html.match(/adsbygoogle\.js\?client=ca-pub-7560786263587509/g) || [];
    assert.strictEqual(tags.length, 1, cfg.slug + " should carry exactly one AdSense tag");
    assert.ok(!/class="[^"]*\bad-slot\b/.test(html), cfg.slug + " must not contain ad slots");
  }
});

console.log("\nAll " + count + " tests passed.");
