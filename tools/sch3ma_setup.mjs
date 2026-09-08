#!/usr/bin/env node
/* One-time project setup on sch3ma, run with the project's secret key. Safe to re-run:
   a definition that already exists is replayed through the two-call confirm.

     SCH3MA_PROJECT=prj_… SCH3MA_SECRET=sk_live_… node tools/sch3ma_setup.mjs

   Two collections. `copies` is the tally: one row per copy, saying which style or
   character, readable by anyone and written by anyone. `favorites` holds one document per
   visitor who turned sync on, readable and writable by its owner alone.

   It also sets how the sign-in mail reads: the sender name, the wording, and the link.
   The link points at /signin.html here rather than at auth.sch3ma.com, so a person opening
   her inbox sees fontloom.com.

   To send that mail from fontloom.com's own domain as well, add:

     SCH3MA_SENDER_DOMAIN=mail.fontloom.com

   That registers the domain and prints the DNS records to publish. It is opt-in because it
   commits a domain at the mail provider. Until every record answers, the mail keeps leaving
   sch3ma's address under the name below, so sign-in never stops working. */

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
const IDENTITY = {
  anonymous: true,
  on_email_conflict: "signin",
  landing_url: "https://fontloom.com/",
  // sch3ma doc 03 §08. The name costs no DNS work: the address stays sch3ma's own, so the
  // From domain still matches the signature and DMARC still passes. There is no support
  // address to reply to, so reply_to stays null rather than pointing somewhere unread.
  sender: { name: "Fontloom", reply_to: null },
  // Copy, never markup — every value is escaped into the message. The two kinds carry
  // different lifetimes, an hour and a week, so neither borrows the other's line.
  template: {
    product: "Fontloom",
    subject: "Your Fontloom sign-in link",
    activation_subject: "Confirm your email for Fontloom",
    body: "Open this link to sign in and keep your favourites on every device. It works once and expires in an hour.",
    activation_body: "Open this link to confirm your email and keep your favourites on every device. It works once and is good for seven days.",
    button: "Sign in to Fontloom",
    color: "#9d4edd",
    logo_url: null,
  },
  // The link points here, not at auth.sch3ma.com. The token rides the URL fragment, which a
  // browser never sends to a server, so it reaches nothing but the host that issued it.
  callback_url: "https://fontloom.com/signin.html",
};

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

// Opt-in: register fontloom's own sending domain and print what to publish in DNS.
const senderDomain = process.env.SCH3MA_SENDER_DOMAIN;
if (senderDomain) {
  const made = await call("PUT", "/_sender", { domain: senderDomain });
  console.log(`sender domain: ${made.status}`);
  if (made.status !== 200) {
    console.error(made.text);
  } else {
    const d = made.json.data;
    console.log(`\n${d.domain} is ${d.status}. Mail will leave ${d.address} once every record answers.\n`);
    console.log("Publish these, then re-run with the same variable to check:\n");
    for (const r of d.records) {
      console.log(`  ${r.type.padEnd(6)} ${r.name}`);
      console.log(`         ${r.value}${r.priority === null ? "" : `  (priority ${r.priority})`}\n`);
    }
  }
}
