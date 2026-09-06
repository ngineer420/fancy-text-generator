/* fontloom.com — the sch3ma link. Loaded as a module by favorites.js on every page.
   Two things, both off until the project below is set:

     the tally    when a style or character is copied, one row saying which one, and
                  nothing else, so the tile can say how often it is used
     sync         favorites kept across devices, which a visitor turns on by signing in
                  with an email on the homepage; off by default, nothing minted until then

   sch3ma is our own product (a database as an API, with the auth already in it) and this
   site is its first real user. Keep the shapes here the shapes a customer would write. */

const PROJECT = "prj_01M1TEYNYXZR8FNTQ2ZFSAWBE8";
const KEY = "pk_live_01M1TF03GXMNNDA7D2DSFKVZS6_g3bILr00xT6lTx9A5vJ1wq7nZ256TQGw"; // publishable: it ships in the page by design
const SYNC_KEY = "ftg-sync-v1";

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
};

let dbPromise = null;
function client() {
  if (!PROJECT || !KEY) return Promise.resolve(null);
  if (!dbPromise) dbPromise = import("https://sch3ma.com/sdk/1.js").then((m) => m.sch3ma({ project: PROJECT, key: KEY })).catch(() => null);
  return dbPromise;
}

/* ---------- the tally ---------- */

window.addEventListener("ftg:copied", async (e) => {
  const db = await client();
  if (!db) return;
  const { kind, item, target } = e.detail || {};
  if ((kind !== "style" && kind !== "char") || typeof item !== "string" || item.length === 0 || item.length > 64) return;
  try {
    await db.create("copies", { kind, item });
    const c = await db.count("copies", { filter: { kind, item } });
    const label = target && target.querySelector(".tile-copied span");
    if (label && c.count > 1) label.textContent = "Copied " + c.count.toLocaleString() + (c.exact ? "" : "+") + " times";
  } catch {
    /* the tally is a nicety; the copy already happened */
  }
});

/* ---------- sync ---------- */

const Favs = window.Favs;
let rowId = null;
let timer = null;

async function pull(db) {
  const page = await db.list("favorites", { limit: 1 });
  const row = page.data[0];
  if (row) {
    rowId = row.id;
    Favs.mergeRemote(row.doc);
  }
  return row || null;
}

async function push(db) {
  const doc = Favs.snapshot();
  if (rowId) await db.update("favorites", rowId, { doc });
  else rowId = (await db.create("favorites", { doc })).id;
}

function syncOn() { return store.get(SYNC_KEY) === "on"; }

window.addEventListener("ftg:favorites-changed", () => {
  if (!syncOn()) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const db = await client();
    if (!db) return;
    try { await push(db); } catch { /* next change tries again */ }
  }, 800);
});

/* ---------- the control on the homepage ---------- */

const CSS = `
.sync-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 0 0 14px; font-size: .92em; opacity: .88; }
.sync-line form { display: inline-flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sync-line input { font: inherit; padding: 5px 9px; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; min-width: 220px; }
.sync-line button { font: inherit; padding: 5px 11px; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
.sync-line button:hover { opacity: .75; }
.sync-line .quiet { border-color: transparent; text-decoration: underline; padding: 5px 4px; }
.sync-line .note { flex-basis: 100%; margin: 0; }
`;

function renderControl(db, state, note) {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  let line = document.getElementById("sync-line");
  if (!line) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    line = document.createElement("div");
    line.id = "sync-line";
    line.className = "sync-line";
    gallery.parentNode.insertBefore(line, gallery);
  }
  line.textContent = "";
  const span = document.createElement("span");
  const button = document.createElement("button");
  button.type = "button";
  if (state === "on") {
    span.textContent = "Favorites sync is on. Star something here and it is starred on your other devices.";
    button.textContent = "Stop syncing";
    button.className = "quiet";
    button.onclick = async () => {
      store.del(SYNC_KEY);
      try { (await db.session()).signOut(); } catch { /* the local store is what matters */ }
      renderControl(db, "off");
    };
    line.append(span, button);
  } else if (state === "form") {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "email"; input.required = true; input.placeholder = "you@example.com"; input.autocomplete = "email";
    const send = document.createElement("button");
    send.textContent = "Send sign-in link";
    const cancel = document.createElement("button");
    cancel.type = "button"; cancel.textContent = "Cancel"; cancel.className = "quiet";
    cancel.onclick = () => renderControl(db, "off");
    form.append(input, send, cancel);
    form.onsubmit = async (evt) => {
      evt.preventDefault();
      send.disabled = true;
      try {
        await db.requestSignIn(input.value.trim());
        renderControl(db, "sent");
      } catch (err) {
        renderControl(db, "form", err && err.message ? err.message : "The link was not sent. Try again in a few minutes.");
      }
    };
    span.textContent = "Sign in with an email and your favorites follow you.";
    line.append(span, form);
    if (note) { const p = document.createElement("p"); p.className = "note"; p.textContent = note; line.append(p); }
    input.focus();
  } else if (state === "sent") {
    span.textContent = "Check your inbox. Open the link on any device and your favorites are there. It works for an hour.";
    line.append(span);
  } else {
    span.textContent = "Favorites stay in this browser.";
    button.textContent = "Keep them on every device";
    button.onclick = () => renderControl(db, "form");
    line.append(span, button);
  }
}

async function boot() {
  const db = await client();
  if (!db || !Favs) return;
  // Landing from a sign-in link: the code rides in the hash, and the SDK reads it.
  if (location.hash.includes("sch3ma_code=")) {
    try {
      const s = await db.completeSignIn();
      if (s.orphan && s.orphan.mergeable) await s.merge(s.orphan.identity);
      store.set(SYNC_KEY, "on");
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      /* an expired link: the page still works, the control still offers sync */
    }
  }
  if (syncOn()) {
    try {
      await pull(db);
      await push(db);
    } catch {
      /* offline, or the session lapsed: local favorites are untouched */
    }
  }
  renderControl(db, syncOn() ? "on" : "off");
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
