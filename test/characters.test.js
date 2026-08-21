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

/* html.escape() writes an apostrophe as &#x27;, so a hand-rolled list of the
   five named entities is not enough — the table-flip face has one in it and
   was the character that proved it. &amp; is unescaped last, or "&amp;lt;"
   would decode twice. */
function unescapeHtml(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

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

test("both hubs are tier-1 tools, in the rail on every page", () => {
  const navData = read("tools/nav_data.py");
  for (const href of ['"/kaomoji/"', '"/symbols/"']) {
    assert.ok(navData.includes('{"href": ' + href), href + " is not a tier-1 tool in nav_data.py");
  }
  // The rail is the point of the promotion: a hub link at the foot of the
  // sheet is what these pages had, and it is not discoverable.
  for (const page of ["kaomoji/index.html", "symbols/index.html", "index.html",
                      "combine/index.html", "bold-text-generator/index.html"]) {
    const html = read(page);
    const rail = html.split('<ul class="tb-rail">')[1];
    assert.ok(rail, page + " has no toolbar rail");
    const chips = rail.split("</ul>")[0];
    assert.ok(chips.includes('href="/kaomoji/"'), page + " has no Kaomoji chip in the rail");
    assert.ok(chips.includes('href="/symbols/"'), page + " has no Symbols chip in the rail");
  }
  // The current page is marked on its own chip.
  const kaomoji = read("kaomoji/index.html");
  assert.ok(kaomoji.includes('<a href="/kaomoji/" aria-current="page">'),
    "the kaomoji hub does not mark itself current in the toolbar");
  // A mood page is tier 2 under it, so the chip is "the current item in this
  // set" rather than a link to the page you are on.
  const happy = read("kaomoji/happy/index.html");
  assert.ok(happy.includes('<a href="/kaomoji/" aria-current="true">'),
    "a mood page does not mark the Kaomoji chip as its family's current item");
  const happyBar = happy.split("<!-- nav:start -->")[1].split("<!-- nav:end -->")[0];
  assert.ok(!happyBar.includes('aria-current="page"'),
    "a mood page claims a toolbar link points at the page you are on");
  // Its own sibling chip, outside the toolbar, is the one that does.
  assert.ok(happy.includes('href="/kaomoji/happy/" aria-current="page"'),
    "a mood page does not mark itself current in its sibling chips");
});

test("the homepage introduces the pickers where they can be seen", () => {
  const home = read("index.html");
  // A promo card each, in the row of tool cards under the gallery.
  for (const href of ["/kaomoji/", "/symbols/"]) {
    assert.ok(home.includes('<a class="tool-promo" href="' + href + '">'),
      "no homepage tool-promo card for " + href);
  }
  // And the inserter, which is the only way to get a face into a line
  // without leaving the page you are styling on.
  for (const page of ["index.html", "combine/index.html"]) {
    const html = read(page);
    assert.ok(html.includes("data-char-insert"),
      page + " does not opt into the character inserter");
    assert.ok(html.includes("charinsert.js"),
      page + " does not load charinsert.js");
    assert.ok(!html.includes('src="/assets/js/characters.js'),
      page + " loads the catalogue eagerly; charinsert.js fetches it on first open");
  }
});

test("each picker has a tile that opens it, and it transforms like any other", () => {
  const core = require(path.join(ROOT, "assets/js/fancytext-core.js"));
  assert.strictEqual(core.CHAR_SAMPLERS, undefined,
    "the sampler concept is gone: a tile that ignores what you type is the only one in the gallery that does");
  for (const hub of ["/kaomoji/", "/symbols/"]) {
    const ex = core.CHAR_EXAMPLES.find((e) => e.hub === hub);
    assert.ok(ex, "no homepage tile opens " + hub);
    // It has to answer to typing, like every other tile in the gallery.
    const a = core.applyCharExample(ex, "one");
    const b = core.applyCharExample(ex, "two");
    assert.notStrictEqual(a, b, ex.id + " ignores the text it is given");
    assert.ok(a.includes("one"), ex.id + " drops the text it is given");
    // Two different characters, one at each end: these tiles are about the
    // characters, so showing two beats showing the same one twice.
    assert.ok(ex.close && ex.close !== ex.char, ex.id + " uses the same character at both ends");
  }
});

test("every character example on the homepage is a real catalogue character", () => {
  const core = require(path.join(ROOT, "assets/js/fancytext-core.js"));
  const known = new Set();
  for (const [, groups] of FAMILIES) {
    for (const group of groups) for (const item of group.items) known.add(item.char);
  }
  assert.ok(core.CHAR_EXAMPLES.length >= 4, "too few character examples to introduce the pickers");
  for (const ex of core.CHAR_EXAMPLES) {
    // Nothing goes in front of a visitor that check_glyphs.mjs has not
    // painted, and the catalogue is what it paints.
    assert.ok(known.has(ex.char),
      ex.id + " uses " + JSON.stringify(ex.char) + ", which is not in characters.js");
    // The two picker tiles carry no style on purpose: 186 of the 198
    // kaomoji contain no letter, so a font style is a no-op on the face.
    if (ex.styleId !== null) {
      assert.ok(core.STYLE_BY_ID[ex.styleId], ex.id + " names a style that does not exist");
      // An overlay is safe on a face now, but it would demonstrate the
      // mark rather than the pairing these tiles exist to show.
      assert.ok(!/strikethrough|underline|slashed|overline|zalgo/.test(ex.styleId),
        ex.id + " pairs a face with " + ex.styleId + ", which shows the mark and not the pairing");
    }
    if (ex.close) assert.ok(known.has(ex.close),
      ex.id + " closes with " + JSON.stringify(ex.close) + ", which is not in characters.js");
    const out = core.applyCharExample(ex, "Fancy Text");
    assert.ok(out.includes(ex.char), ex.id + " drops its own character");
    assert.ok(out !== "Fancy Text", ex.id + " leaves the text untouched");
  }
});

test("a picker page is a picker, not a second styler", () => {
  // Three releases were spent trying to make these pages style text. The
  // homepage does that, with forty styles instead of six, and every path off
  // these pages goes there. A text box reappearing here is the regression.
  for (const page of ["kaomoji/index.html", "symbols/index.html",
                      "kaomoji/happy/index.html", "symbols/hearts/index.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    assert.ok(!/id="tool-input"/.test(html), page + " grew a text box back");
    assert.ok(!/class="composer/.test(html), page + " grew a composer back");
    assert.ok(!/id="composer-out"/.test(html), page + " grew preview tiles back");
    // Nor a styled sample. Every card links to the styler now, so a card
    // that showed one was a third message and the only thing on the page
    // wearing text the visitor did not type.
    assert.ok(!/char-styled/.test(html), page + " still carries a styled sample card");
    // ...and the way out is on every card.
    const links = html.match(/class="char-insert" href="\/\?text=[^"]+"/g) || [];
    const cards = html.match(/class="char-card"/g) || [];
    assert.strictEqual(links.length, cards.length,
      page + " has " + cards.length + " cards but " + links.length + " links to the generator");
  }
});

test("the carry strip is built, never baked", () => {
  // With JavaScript off none of the carrying works, and an input that
  // silently does nothing is worse than no input — so characters-page.js
  // builds the whole strip and the file ships without it.
  for (const page of ["kaomoji/index.html", "symbols/index.html",
                      "kaomoji/shrug/index.html", "symbols/stars/index.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    assert.ok(!/char-carry/.test(html), page + " bakes the carry strip");
  }
  const js = fs.readFileSync(path.join(ROOT, "assets/js/characters-page.js"), "utf8");
  assert.ok(js.includes('wrap.className = "char-carry"'),
    "characters-page.js no longer builds the carry strip");
  assert.ok(js.includes('field.id = "char-carry-input"'),
    "the carry strip has no input to change the line with");
});

test("every card offers the same thing, in the same words", () => {
  const html = fs.readFileSync(path.join(ROOT, "kaomoji/index.html"), "utf8");
  const actions = html.match(/class="char-insert"[^>]*>([\s\S]*?)<\/a>/g) || [];
  assert.ok(actions.length > 40, "expected an action on every card");
  for (const a of actions) {
    assert.ok(a.includes("Add fancy text"),
      "a card action reads " + JSON.stringify(a.slice(-40)) + " rather than \"Add fancy text\"");
  }
});

test("the way out leads with the card's own character", () => {
  const html = fs.readFileSync(path.join(ROOT, "kaomoji/index.html"), "utf8");
  const pairs = [...html.matchAll(/data-char="([^"]+)"[\s\S]*?class="char-insert" href="([^"]+)"/g)];
  assert.ok(pairs.length > 40, "no cards with both a character and a link out");
  for (const m of pairs) {
    const char = unescapeHtml(m[1]);
    const text = decodeURIComponent(m[2].replace("/?text=", ""));
    assert.ok(text.startsWith(char + " "),
      "the link hands off " + JSON.stringify(text) + " for the card " + JSON.stringify(char));
  }
});

test("a card with no line still hands over words to style", () => {
  // A bare face at the far end gives forty tiles showing a face and nothing
  // else. The sample the link carries has to be the one the homepage uses,
  // or the handoff would arrive looking like text somebody typed.
  const app = fs.readFileSync(path.join(ROOT, "assets/js/app.js"), "utf8");
  const m = app.match(/const SAMPLE_TEXT = "([^"]+)"/);
  assert.ok(m, "app.js no longer declares SAMPLE_TEXT");
  const sample = m[1];

  const py = fs.readFileSync(path.join(ROOT, "tools/build_character_pages.py"), "utf8");
  assert.ok(py.includes('SAMPLE_TEXT = "' + sample + '"'),
    "the builder's sample text has drifted from app.js's " + JSON.stringify(sample));
  const cp = fs.readFileSync(path.join(ROOT, "assets/js/characters-page.js"), "utf8");
  assert.ok(cp.includes('const SAMPLE_TEXT = "' + sample + '"'),
    "characters-page.js's sample text has drifted from app.js's " + JSON.stringify(sample));

  for (const page of ["kaomoji/index.html", "symbols/hearts/index.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    const links = [...html.matchAll(/class="char-insert" href="\/\?text=([^"]+)"/g)]
      .map((x) => decodeURIComponent(x[1]));
    assert.ok(links.length, page + " has no links out");
    for (const line of links) {
      assert.ok(line.endsWith(" " + sample),
        page + " hands off " + JSON.stringify(line) + " with nothing to style");
    }
  }
});

test("the baked label is the no-text one", () => {
  // "Add fancy text" is what the card offers with nothing carried. The
  // runtime rewrites it to "Style text" when a line arrives, so the baked
  // file must be the former — a page that shipped "Style text" would be
  // promising to style something the visitor has not given it.
  const html = fs.readFileSync(path.join(ROOT, "kaomoji/index.html"), "utf8");
  assert.ok(!/Style text/.test(html), "the file ships the carrying label");
  assert.ok(html.includes("Add fancy text"), "the file has lost the plain label");
});

test("a card has somewhere to print a carried line", () => {
  // Baked empty. The runtime fills it only when ?text= brought something,
  // which is what keeps a plain visit a grid of bare faces.
  const html = fs.readFileSync(path.join(ROOT, "kaomoji/index.html"), "utf8");
  const glyphs = html.match(/<span class="char-glyph">[\s\S]*?<\/span><\/span>/g) || [];
  assert.ok(glyphs.length > 40, "expected a glyph on every card");
  for (const g of glyphs) {
    assert.ok(g.includes('<span class="char-glyph-text"></span>'),
      "a card has no slot for the carried line, or it was baked non-empty");
  }
});

test("every character tile leaves for a picker page", () => {
  // Colour on a tile means one thing: the press opens something. The four
  // pairings act on the homepage itself, so they take none.
  const core = require(path.join(ROOT, "assets/js/fancytext-core.js"));
  // Every character tile is an example and every one leaves for a picker
  // page. None of them acts on the homepage: that is Add a face's job, and
  // two controls for one value is one too many.
  for (const ex of core.CHAR_EXAMPLES) {
    const hub = ex.hub || "/kaomoji/";
    assert.ok(hub === "/kaomoji/" || hub === "/symbols/",
      ex.id + " points at " + hub + ", which is not a picker page");
    assert.ok(fs.existsSync(path.join(ROOT, hub.replace(/^\/|\/$/g, ""), "index.html")),
      ex.id + " points at a page that does not exist");
  }
});

console.log("\nAll " + passed + " tests passed.");
