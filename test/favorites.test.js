/* Tests for the favorites store (assets/js/favorites.js).
   Run with: node test/favorites.test.js
   A fake localStorage is installed before the module loads so the tests
   control exactly what's stored — including legacy data that the
   one-time migration must clean up. */

"use strict";

const assert = require("assert");

// Deterministic in-memory localStorage, installed before the module loads.
const backing = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
  },
});

// Legacy store shape: combos seeded by the old default-favorites version.
backing.set(
  "ftg-favorites-v1",
  JSON.stringify({
    styles: ["bold"],
    combos: [
      { id: "a1", name: "Flipped Underline", ids: ["upside-down", "underline"] },
      { id: "a2", name: "Struck Bold", ids: ["bold", "strikethrough"] },
      { id: "a3", name: "My Own Combo", ids: ["fraktur", "underline"] },
      { id: "a4", name: "Triple Flip", ids: ["upside-down", "strikethrough", "underline"] },
    ],
    mixes: [],
  })
);

const Favs = require("../assets/js/favorites.js");
const FancyText = require("../assets/js/fancytext-core.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("ok  " + name);
}

test("migration prunes legacy seeded combos but keeps custom ones", () => {
  const combos = Favs.combos();
  assert.deepStrictEqual(combos.map((c) => c.name), ["My Own Combo"]);
  assert.ok(Favs.hasStyle("bold"), "starred styles survive the migration");
});

test("migration runs once: re-saving a legacy-named combo sticks", () => {
  const combo = Favs.addCombo("Struck Bold", ["bold", "strikethrough"]);
  assert.ok(Favs.findCombo(["bold", "strikethrough"]), "identical recipe can be re-saved");
  Favs.removeCombo(combo.id);
});

test("legacy seeded list only references real style ids", () => {
  Favs.LEGACY_SEEDED.forEach((c) => {
    c.ids.forEach((id) => {
      assert.ok(FancyText.STYLE_BY_ID[id], c.name + " references unknown style " + id);
    });
  });
});

test("a fresh store starts with no combos, mixes or stars", () => {
  backing.clear();
  assert.deepStrictEqual(Favs.combos(), []);
  assert.deepStrictEqual(Favs.mixes(), []);
  assert.deepStrictEqual(Favs.styleIds(), []);
});

test("findCombo matches by exact chain", () => {
  Favs.addCombo("Test", ["bold", "strikethrough"]);
  assert.ok(Favs.findCombo(["bold", "strikethrough"]));
  assert.strictEqual(Favs.findCombo(["strikethrough", "bold"]), null, "order matters");
  assert.strictEqual(Favs.findCombo(["bold"]), null, "prefix does not match");
});

test("custom combos can be named, saved and removed", () => {
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
