/* Tests for the character catalogue (assets/js/characters.js) and the pages
   tools/build_character_pages.py writes from it.
   Run with: node test/characters.test.js

   The dataset is the part of this feature most likely to go quietly wrong:
   it is several hundred strings full of backslashes, quotes and characters
   from a dozen scripts, and every failure mode looks like valid text in a
   diff. So the assertions here are the ones a reviewer cannot make by eye —
   that the shrug still has both arms, that nothing is a duplicate of its
   neighbour, and that every character reached the HTML intact. */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const Characters = require("../assets/js/characters.js");

const ROOT = path.join(__dirname, "..");
const FAMILIES = [
  ["kaomoji", Characters.KAOMOJI],
  ["symbols", Characters.SYMBOLS],
];

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("ok  " + name);
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

/* ---------- the data ---------- */

test("the shrug survives as bytes, both arms intact", () => {
  const shrug = Characters.KAOMOJI.find((g) => g.slug === "shrug").items[0];

  // Asserted as code points, not only as a literal. A JavaScript string
  // literal is the one place this cannot be checked safely: "¯\_(ツ)_/¯" in
  // source is an unrecognised escape and silently becomes the one-armed
  // version, which is how the mistake gets into a fixture in the first place.
  assert.strictEqual(shrug.char, "¯\\_(ツ)_/¯");
  assert.deepStrictEqual(
    [...shrug.char].map((c) => c.codePointAt(0)),
    [0x00af, 0x005c, 0x005f, 0x0028, 0x30c4, 0x0029, 0x005f, 0x002f, 0x00af]
  );
  assert.strictEqual(shrug.char.length, 9, "the one-armed ¯_(ツ)_/¯ is eight");
  assert.ok(shrug.char.includes("\\"), "there is a real backslash in there");
});

test("every entry has a character, a name and at least one keyword", () => {
  for (const [family, groups] of FAMILIES) {
    for (const group of groups) {
      assert.ok(group.slug && group.name && group.id, family + " group is missing fields");
      assert.ok(group.items.length >= 20,
        family + "/" + group.slug + " has only " + group.items.length + " entries");
      for (const item of group.items) {
        const where = family + "/" + group.slug + " " + JSON.stringify(item.char);
        assert.ok(typeof item.char === "string" && item.char.length, where + ": no character");
        assert.strictEqual(item.char.trim(), item.char, where + ": stray outer whitespace");
        assert.ok(typeof item.name === "string" && item.name.length, where + ": no name");
        assert.ok(Array.isArray(item.keywords) && item.keywords.length, where + ": no keywords");
        for (const k of item.keywords) {
          assert.strictEqual(k, k.toLowerCase(), where + ": keyword " + k + " is not lowercase");
        }
      }
    }
  }
});

test("no group repeats a character, and no group repeats a name", () => {
  // Across groups is fine and deliberate — a cat belongs under both cute and
  // animals, and ▶ is both an arrow and a play button. Twice in one grid is
  // the bug: it reads as padding.
  for (const [family, groups] of FAMILIES) {
    for (const group of groups) {
      const chars = group.items.map((i) => i.char);
      const names = group.items.map((i) => i.name.toLowerCase());
      assert.strictEqual(new Set(chars).size, chars.length,
        family + "/" + group.slug + " repeats a character");
      assert.strictEqual(new Set(names).size, names.length,
        family + "/" + group.slug + " repeats a name");
    }
  }
});

test("the symbol pages that survived curation carry 40+ entries each", () => {
  // The point of cutting currency, zodiac and dingbats was that a page of
  // twelve entries is a page about nothing. If a kind drops back under forty,
  // it should be merged or dropped rather than shipped thin.
  for (const group of Characters.SYMBOLS) {
    assert.ok(group.items.length >= 40,
      "symbols/" + group.slug + " is down to " + group.items.length + " entries");
  }
});

test("the cut categories stay cut", () => {
  const slugs = Characters.SYMBOLS.map((g) => g.slug);
  for (const gone of ["currency", "zodiac", "dingbats"]) {
    assert.ok(!slugs.includes(gone),
      gone + " is back; currency duplicates /currency-text-generator/ and the "
      + "other two were the thinnest pages in the set");
  }
});

/* ---------- the pages ---------- */

test("every group has a page, and every page has its whole group in it", () => {
  for (const [family, groups] of FAMILIES) {
    for (const group of groups) {
      const html = read(path.join(family, group.slug, "index.html"));
      for (const item of group.items) {
        // The card's data-char is the string the runtime inserts and copies,
        // so this is the assertion that the escaping held all the way from
        // the JavaScript source through Node, Python and HTML escaping.
        const attr = 'data-char="' + item.char
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#x27;") + '"';
        assert.ok(html.includes(attr),
          family + "/" + group.slug + " is missing " + JSON.stringify(item.char));
      }
    }
  }
});

test("the shrug reached its page with the backslash still in it", () => {
  const html = read("kaomoji/shrug/index.html");
  assert.ok(html.includes('data-char="¯\\_(ツ)_/¯"'), "the card inserts the real shrug");
  assert.ok(html.includes(">¯\\_(ツ)_/¯<"), "and the page shows it");
  assert.ok(!/data-char="¯_\(ツ\)_\/¯"/.test(html), "no one-armed shrug anywhere");
});

test("every character page is a real page: unique title, description, canonical, h1", () => {
  const seen = { title: new Set(), description: new Set(), canonical: new Set(), h1: new Set() };
  const pages = [];
  for (const [family, groups] of FAMILIES) {
    pages.push(path.join(family, "index.html"));
    for (const group of groups) pages.push(path.join(family, group.slug, "index.html"));
  }
  assert.strictEqual(pages.length, 16);

  for (const page of pages) {
    const html = read(page);
    const grab = (re, what) => {
      const m = html.match(re);
      assert.ok(m, page + " has no " + what);
      return m[1];
    };
    const fields = {
      title: grab(/<title>([^<]+)<\/title>/, "title"),
      description: grab(/<meta name="description" content="([^"]+)">/, "description"),
      canonical: grab(/<link rel="canonical" href="([^"]+)">/, "canonical"),
      h1: grab(/<h1>([^<]+)<\/h1>/, "h1"),
    };
    for (const [key, value] of Object.entries(fields)) {
      assert.ok(!seen[key].has(value), page + " reuses a " + key + ": " + value);
      seen[key].add(value);
    }
    const slug = "/" + page.replace(/index\.html$/, "");
    assert.strictEqual(fields.canonical, "https://fontloom.com" + slug,
      page + " canonical does not match its own URL");
  }
});

test("the copy on each page is written for that page, not interpolated", () => {
  // Two pages sharing an intro paragraph is the failure the copy file exists
  // to prevent, and it is invisible in a diff that adds sixteen pages at once.
  const intros = new Map();
  for (const [family, groups] of FAMILIES) {
    const pages = [path.join(family, "index.html")]
      .concat(groups.map((g) => path.join(family, g.slug, "index.html")));
    for (const page of pages) {
      const html = read(page);
      const body = html.slice(html.indexOf('class="container-narrow explainer"'));
      for (const m of body.matchAll(/<p>([^<]{80,})<\/p>/g)) {
        const text = m[1];
        assert.ok(!intros.has(text),
          page + " repeats a paragraph from " + intros.get(text));
        intros.set(text, page);
      }
    }
  }
  assert.ok(intros.size >= 16 * 5, "expected several distinct paragraphs per page");
});

test("every character page carries the ad tag once and no ad slots", () => {
  for (const [family, groups] of FAMILIES) {
    const pages = [path.join(family, "index.html")]
      .concat(groups.map((g) => path.join(family, g.slug, "index.html")));
    for (const page of pages) {
      const html = read(page);
      const tags = html.match(/adsbygoogle\.js\?client=ca-pub-7560786263587509/g) || [];
      assert.strictEqual(tags.length, 1, page + " has " + tags.length + " ad tags");
      assert.ok(!html.includes("ad-slot"), page + " has a manual ad slot");
      assert.ok(!/<img[^>]+src="https?:/.test(html) && !/<script[^>]+src="\/\//.test(html),
        page + " requests something off-site");
    }
  }
});

test("the erabbit mark is the last element in the DOM", () => {
  for (const [family, groups] of FAMILIES) {
    const pages = [path.join(family, "index.html")]
      .concat(groups.map((g) => path.join(family, g.slug, "index.html")));
    for (const page of pages) {
      const html = read(page);
      const after = html.slice(html.indexOf("</footer>"));
      assert.ok(after.includes('class="erabbit-mark"'), page + " has no erabbit mark");
      const tail = html.trimEnd();
      assert.ok(tail.endsWith("</html>"), page + " does not end with </html>");
      // Nothing but the scripts may come between the mark and the end.
      const rest = after.slice(after.indexOf("</a>") + 4);
      assert.ok(!/<(?!\/?(script|body|html)\b)[a-z]/i.test(rest),
        page + " has an element after the erabbit mark");
    }
  }
});

test("every character URL is in the sitemap exactly once", () => {
  const sitemap = read("sitemap.xml");
  for (const [family, groups] of FAMILIES) {
    const urls = ["/" + family + "/"]
      .concat(groups.map((g) => "/" + family + "/" + g.slug + "/"));
    for (const url of urls) {
      const loc = "<loc>https://fontloom.com" + url + "</loc>";
      const hits = sitemap.split(loc).length - 1;
      assert.strictEqual(hits, 1, url + " appears " + hits + " times in sitemap.xml");
    }
  }
});

test("the hubs and the toolbar agree that these pages exist", () => {
  const navData = read("tools/nav_data.py");
  assert.ok(navData.includes('("/kaomoji/"'), "no kaomoji hub in nav_data.py");
  assert.ok(navData.includes('("/symbols/"'), "no symbols hub in nav_data.py");
  for (const page of ["kaomoji/index.html", "symbols/index.html", "index.html"]) {
    const html = read(page);
    assert.ok(html.includes('class="tb-hub"'), page + " has no hub links in the toolbar");
    assert.ok(html.includes('href="/kaomoji/"') && html.includes('href="/symbols/"'),
      page + " does not link both hubs");
  }
  // The current page is marked, on its own hub link and nowhere else.
  const kaomoji = read("kaomoji/index.html");
  assert.ok(kaomoji.includes('<a href="/kaomoji/" aria-current="page">'),
    "the kaomoji hub does not mark itself current in the toolbar");
});

console.log("\nAll " + passed + " tests passed.");
