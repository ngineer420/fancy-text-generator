#!/usr/bin/env node
/* One-time project setup on sch3ma, run with the project's secret key. Safe to re-run:
   a definition that already exists is replayed through the two-call confirm.

     SCH3MA_PROJECT=prj_… SCH3MA_SECRET=sk_live_… node tools/sch3ma_setup.mjs

   Two collections. `copies` is the tally: one row per copy, saying which style or
   character, readable by anyone and written by anyone. `favorites` holds one document per
   visitor who turned sync on, readable and writable by its owner alone. */

const project = process.env.SCH3MA_PROJECT;
const secret = process.env.SCH3MA_SECRET;
if (!project || !secret) {
  console.error("Set SCH3MA_PROJECT and SCH3MA_SECRET.");
  process.exit(1);
}
const base = `https://admin.sch3ma.com/${project}`;

const COPIES = {
  prefix: "cpy",
  rules: { read: "public", create: "public" },
  fields: {
    kind: { type: "text", required: true, enum: ["style", "char"], visible: "public" },
    item: { type: "text", required: true, maxLength: 64, visible: "public" },
  },
};
const FAVORITES = {
  prefix: "fav",
  rules: { read: "owner:visitor", create: "authenticated", update: "owner:visitor", delete: "owner:visitor" },
  fields: {
    doc: { type: "json", required: true, visible: "authenticated" },
    visitor: { type: "reference", to: "users" },
  },
};
const ORIGINS = ["https://fontloom.com"];
const IDENTITY = { anonymous: true, on_email_conflict: "signin", landing_url: "https://fontloom.com/" };

async function call(method, path, body) {
  const res = await fetch(base + path, { method, headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

// The two-call rule: a first call answers a report and a token, the second commits.
async function twoCall(method, path, body) {
  const first = await call(method, path, body);
  if (first.status === 201) return first;
  if (first.status !== 200 || !first.json || !first.json.report) throw new Error(`${method} ${path}: ${first.status} ${first.text}`);
  const second = await call(method, `${path}?_confirm=${encodeURIComponent(first.json.report.confirm_token)}`, body);
  if (second.status !== 200) throw new Error(`${method} ${path} (confirm): ${second.status} ${second.text}`);
  return second;
}

for (const [name, def] of [["copies", COPIES], ["favorites", FAVORITES]]) {
  const r = await twoCall("PUT", `/_schemas/${name}`, def);
  console.log(`${name}: ${r.status}`);
}
console.log(`origins: ${(await twoCall("PUT", "/_origins", { origins: ORIGINS })).status}`);
const identity = await call("PATCH", "/_identity", IDENTITY);
console.log(`identity: ${identity.status} ${identity.text}`);
