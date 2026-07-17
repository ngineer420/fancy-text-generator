/* Tests for the favorites store (assets/js/favorites.js).
   Run with: node test/favorites.test.js
   In Node there is no localStorage, so the module falls back to its
   in-memory store — which is exactly what these tests exercise. */

"use strict";

const assert = require("assert");
const Favs = require("../assets/js/favorites.js");
const FancyText = require("../assets/js/fancytext-core.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("ok  " + name);
}

test("seeds the default combos on first use", () => {
  const combos = Favs.combos();
  assert.strictEqual(combos.length, Favs.DEFAULT_COMBOS.length);
  assert.strictEqual(combos[0].name, "Flipped Underline");
  combos.forEach((c) => {
    assert.ok(c.id, "seeded combo has an id");
  });
});

test("every default combo uses only real style ids", () => {
  Favs.DEFAULT_COMBOS.forEach((c) => {
    c.ids.forEach((id) => {
      assert.ok(FancyText.STYLE_BY_ID[id], c.name + " references unknown style " + id);
    });
  });
});

test("default combos can be unstarred (removed)", () => {
  const before = Favs.combos();
  Favs.removeCombo(before[0].id);
  const after = Favs.combos();
  assert.strictEqual(after.length, before.length - 1);
  assert.ok(!after.some((c) => c.id === before[0].id));
});

test("findCombo matches by exact chain", () => {
  assert.ok(Favs.findCombo(["bold", "strikethrough"]), "seeded Struck Bold is found");
  assert.strictEqual(Favs.findCombo(["strikethrough", "bold"]), null, "order matters");
  assert.strictEqual(Favs.findCombo(["bold"]), null, "prefix does not match");
});

test("custom combos can be named, saved and found", () => {
  const combo = Favs.addCombo("My Combo", ["fraktur", "underline"]);
  assert.strictEqual(combo.name, "My Combo");
  const found = Favs.findCombo(["fraktur", "underline"]);
  assert.ok(found && found.id === combo.id);
  Favs.removeCombo(combo.id);
  assert.strictEqual(Favs.findCombo(["fraktur", "underline"]), null);
});

test("style stars toggle and persist", () => {
  assert.strictEqual(Favs.hasStyle("bold"), false);
  assert.strictEqual(Favs.toggleStyle("bold"), true);
  assert.ok(Favs.hasStyle("bold"));
  assert.deepStrictEqual(Favs.styleIds(), ["bold"]);
  assert.strictEqual(Favs.toggleStyle("bold"), false);
  assert.strictEqual(Favs.hasStyle("bold"), false);
});

test("mixes save with per-letter nulls intact", () => {
  const styleIds = ["bold", null, "fraktur", null];
  const mix = Favs.addMix("Test Mix", "abcd", styleIds);
  const found = Favs.findMix("abcd", styleIds);
  assert.ok(found && found.id === mix.id);
  assert.deepStrictEqual(found.styleIds, styleIds);
  assert.strictEqual(Favs.findMix("abcd", ["bold", null, null, null]), null, "paint job matters");
  assert.strictEqual(Favs.findMix("abce", styleIds), null, "text matters");
  Favs.removeMix(mix.id);
  assert.strictEqual(Favs.mixes().length, 0);
});

console.log("\nAll " + passed + " tests passed.");
