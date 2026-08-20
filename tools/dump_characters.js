#!/usr/bin/env node
/* Print the kaomoji/symbol catalogue as JSON on stdout, for the Python builder.
 *
 * Same arrangement as tools/dump_styles.js: the data lives in one JavaScript
 * file so it is loadable by the browser and by the tests, and Python reads it
 * by asking Node rather than by parsing JavaScript with a regular expression.
 *
 *     node tools/dump_characters.js | python3 -c 'import json,sys; ...'
 */

const path = require("path");
const Characters = require(path.join(__dirname, "..", "assets", "js", "characters.js"));

// Deliberately not pretty-printed: this is machine input, and JSON.stringify
// escapes nothing it does not have to, so the backslash in the shrug survives
// as a single escaped backslash rather than being mangled on the way through.
process.stdout.write(JSON.stringify({
  kaomoji: Characters.KAOMOJI,
  symbols: Characters.SYMBOLS,
}));
