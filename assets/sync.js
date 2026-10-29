// Cross-device sync (owner, Oct 2026): sign in with Google and the settings the site saves in
// this browser (lock marks, what-ifs, coach mode, trade block, Dynasty filters...) also go to
// Cloud Firestore, so the phone and the computer see the same ones within seconds.
//
// localStorage stays the working copy: the site reads it exactly as before and works signed out
// or offline. Signed in, every save of a SYNCED key is also written to users/{uid}/prefs/{key}
// as { v: JSON text, t: time saved (ms), dev: device id }; a live listener copies newer values
// from other devices into localStorage and calls onChange so the open page redraws.
// Newest save wins per key (t). The first sign-in on a device merges what it already had:
// lock marks / what-ifs / trade block are combined, other keys take the newer one and the
// replaced local value is kept in localStorage sync-backup.
//
// The Firebase SDK is only downloaded once someone taps Sign in (then on every visit from that
// browser while signed in), so other visitors load nothing extra. The config below is public by
// design (every Firebase website ships it); the Firestore rules (firestore.rules) are the lock.

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBc3-Ejlfxj_9ul7K-2CqZxWi_QMqBJLE0',
  authDomain: 'dynasty-hof.firebaseapp.com',
  projectId: 'dynasty-hof',
  storageBucket: 'dynasty-hof.firebasestorage.app',
  messagingSenderId: '317101804636',
  appId: '1:317101804636:web:664aa5877e7be468c12a99',
};
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

// Keys that follow the account. A key matches an entry exactly, or starts with it when the entry
// ends in '-'. To sync a new setting: save it with gmSave in app.js and add its key here.
// Never add caches (gm-tips-{date}) or session flags (cm-open).
export const SYNCED = [
  'gm-locks-', // lock marks per week, yours and opponents'
  'gm-whatif-', // what-if locks per week
  'gm-mode', // Lock-in coach mode
  'gm-block-', // trade block per team
  'gm-eval', // Evaluate a trade draft
  'gm-dyn-', // Dynasty tab filters (full / pos / hidetaxi / sec)
  'gm-tracker-seen-', // Team tracker "New" marker
  'gm-inj-', // injury news already seen
  'wager-saved', // Wager Weeks results waiting for GitHub
  'gm-tags', // custom player tags (2K breakdown): { pid: [tag] }
  'gm-tag-colors', // custom tag colors (2K breakdown): { tag: color index }
  'gm-tag-order', // custom tag order (2K breakdown, drag to sort): [tag]
  'gm-autotag-order', // auto tag order in the 2K filter row: [tag]
  'gm-bk-', // 2K breakdown filters (pos / sec)
  'gm-notes', // player notes (2K breakdown): { pid: text }
];
export const isSynced = key => SYNCED.some(k => (k.endsWith('-') ? key.startsWith(k) : key === k));

// How the first sign-in on a device combines its value with the account's (later saves: newest wins).
const MERGE = [['gm-locks-', 'object'], ['gm-whatif-', 'object'], ['gm-block-', 'list'], ['gm-tracker-seen-', 'max'], ['gm-tags', 'object'], ['gm-tag-colors', 'object'], ['gm-notes', 'object']];
const mergeKind = key => MERGE.find(([p]) => key.startsWith(p))?.[1] ?? 'newest';

const ls = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* full or blocked */ } },
  del: k => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
  json: (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
};
const put = ls.set;
const UID_KEY = 'sync-uid'; // signed in on this browser: load the SDK on the next visit
const META_KEY = 'sync-meta'; // { key: time of the local value }
const MERGED_KEY = 'sync-merged'; // uid whose account this browser already merged into
const DEV = ls.get('sync-dev') || (() => { const d = Math.random().toString(36).slice(2, 10); put('sync-dev', d); return d; })();

let fb = null; // { auth, db, ...functions } once loaded
let user = null;
let status = 'off'; // off | loading | connecting | synced | saving | offline | error
let error = '';
let unsub = null;
let started = null; // the sign-in listener, set up once
let onChange = () => {};
const meta = () => ls.json(META_KEY, {});
const setMeta = (key, t) => { const m = meta(); m[key] = t; put(META_KEY, JSON.stringify(m)); };

function setStatus(s, err = '') { status = s; error = err; paintSync(); }
export const syncState = () => ({ status, error, user: user && { uid: user.uid, name: user.displayName, photo: user.photoURL } });

// Shared Firestore for other features (Weekly Props): the SDK + the signed-in user, loading it on
// first use (even signed out: locked picks are public). onAuth(cb) runs on every sign-in/out.
const authWatchers = new Set();
let authKnown;
const authFirst = new Promise(r => { authKnown = r; });
// Resolves once Firebase knows whether someone is signed in on this browser.
export async function firebase() {
  await start();
  await authFirst;
  return fb;
}
export function onAuth(cb) {
  authWatchers.add(cb);
  return () => authWatchers.delete(cb);
}
export const currentUser = () => user;

async function loadSdk() {
  if (fb) return fb;
  const [app, auth, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`),
  ]);
  const a = app.initializeApp(FIREBASE_CONFIG);
  fb = { ...auth, ...fs, auth: auth.getAuth(a), db: fs.getFirestore(a) };
  return fb;
}

// Called once at boot. onChange(keys) runs after other devices' saves land in localStorage.
export async function syncInit(opts = {}) {
  onChange = opts.onChange ?? onChange;
  window.addEventListener('online', paintSync);
  window.addEventListener('offline', paintSync);
  if (!ls.get(UID_KEY)) return;
  await start().catch(e => setStatus('error', e.message));
}

function start() {
  return (started ??= startOnce());
}
async function startOnce() {
  setStatus('loading');
  const f = await loadSdk();
  f.getRedirectResult(f.auth).catch(e => setStatus('error', e.message));
  f.onAuthStateChanged(f.auth, u => {
    unsub?.();
    unsub = null;
    user = u;
    authKnown();
    for (const cb of authWatchers) { try { cb(u); } catch { /* a page's problem */ } }
    if (!u) { ls.del(UID_KEY); setStatus('off'); return; }
    put(UID_KEY, u.uid);
    f.setDoc(f.doc(f.db, 'users', u.uid), { name: u.displayName ?? '', photo: u.photoURL ?? '', seen: Date.now() }, { merge: true }).catch(() => {});
    listen(u.uid);
  });
}

export async function signIn() {
  try {
    setStatus('loading');
    const f = await loadSdk();
    await start();
    const provider = new f.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await f.signInWithPopup(f.auth, provider);
    } catch (e) {
      // Some home-screen apps can't open the Google window: go there and come back instead.
      if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(e.code ?? '')) {
        put(UID_KEY, 'pending');
        return f.signInWithRedirect(f.auth, provider);
      }
      throw e;
    }
  } catch (e) {
    if (/popup-closed|cancelled-popup/.test(e.code ?? '')) setStatus(user ? 'synced' : 'off');
    else setStatus('error', e.code === 'auth/unauthorized-domain' ? 'This web address isn’t on Firebase’s authorized domains list.' : e.message);
  }
}

export async function signOut() {
  if (!fb) return;
  await fb.signOut(fb.auth);
  ls.del(UID_KEY);
}

const fsError = e => setStatus('error', e.code === 'permission-denied' ? 'Firestore said no: check the rules were published, then reload.' : e.message);
const docRef = (uid, key) => fb.doc(fb.db, 'users', uid, 'prefs', key);
const push = (key, v, t) => {
  if (!user) return;
  fb.setDoc(docRef(user.uid, key), { v, t, dev: DEV }).catch(fsError);
};

// gmSave in app.js calls this after writing localStorage (only when the value changed).
export function syncSave(key, text) {
  if (!isSynced(key)) return;
  const t = Date.now();
  setMeta(key, t);
  push(key, text, t);
}

function listen(uid) {
  let first = true;
  const col = fb.collection(fb.db, 'users', uid, 'prefs');
  setStatus('connecting');
  unsub = fb.onSnapshot(col, { includeMetadataChanges: true }, snap => {
    const changed = [];
    if (first && !snap.metadata.fromCache) {
      first = false;
      reconcile(uid, snap, changed);
    } else if (!first) {
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') continue;
        if (apply(ch.doc.id, ch.doc.data())) changed.push(ch.doc.id);
      }
    }
    setStatus(first ? 'connecting' : snap.metadata.hasPendingWrites ? 'saving' : snap.metadata.fromCache ? 'offline' : 'synced');
    if (changed.length) onChange(changed);
  }, fsError);
}

// A newer value from the account: copy it into localStorage.
function apply(key, d) {
  if (!isSynced(key) || typeof d?.t !== 'number') return false;
  if (d.t <= (meta()[key] ?? 0)) return false;
  if (d.v == null) ls.del(key); else put(key, d.v);
  setMeta(key, d.t);
  return true;
}

// First server snapshot after sign-in: send what only this device has (or has newer), take what's
// newer in the account. The first time this browser meets this account, combine instead.
function reconcile(uid, snap, changed) {
  const remote = new Map(snap.docs.map(d => [d.id, d.data()]));
  const firstMerge = ls.get(MERGED_KEY) !== uid;
  const m = meta();
  const local = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (isSynced(k)) local.push(k); } } catch { /* blocked */ }
  for (const key of local) {
    const text = ls.get(key);
    const lt = m[key] ?? 0;
    const r = remote.get(key);
    if (!r || typeof r.t !== 'number') { const t = lt || Date.now(); setMeta(key, t); push(key, text, t); continue; }
    if (r.v === text) { if (lt !== r.t) setMeta(key, r.t); continue; }
    if (firstMerge) {
      const merged = combine(key, text, lt, r.v, r.t);
      if (merged !== text) { backup(key, text); put(key, merged); changed.push(key); }
      const t = Math.max(Date.now(), r.t + 1);
      setMeta(key, t);
      if (merged !== r.v) push(key, merged, t);
    } else if (r.t > lt) { if (apply(key, r)) changed.push(key); } else if (lt > r.t) push(key, text, lt);
  }
  for (const [key, r] of remote) if (!local.includes(key) && apply(key, r)) changed.push(key);
  put(MERGED_KEY, uid);
}

// Two saved values of one key -> one, without losing marks from either device.
function combine(key, localText, lt, remoteText, rt) {
  const parse = s => { try { return JSON.parse(s); } catch { return undefined; } };
  const [a, b] = [parse(localText), parse(remoteText)];
  const [older, newer] = rt >= lt ? [a, b] : [b, a];
  const kind = mergeKind(key);
  const plain = x => x && typeof x === 'object' && !Array.isArray(x);
  if (kind === 'object' && plain(a) && plain(b)) return JSON.stringify({ ...older, ...newer });
  if (kind === 'list' && Array.isArray(a) && Array.isArray(b)) {
    const seen = new Set();
    return JSON.stringify([...newer, ...older].filter(x => { const s = JSON.stringify(x); return !seen.has(s) && seen.add(s); }));
  }
  if (kind === 'max' && Number.isFinite(Number(a)) && Number.isFinite(Number(b))) return JSON.stringify(Math.max(Number(a), Number(b)));
  return rt >= lt ? remoteText : localText;
}
function backup(key, text) {
  const b = ls.json('sync-backup', {});
  b[key] = { v: text, at: Date.now() };
  put('sync-backup', JSON.stringify(b));
}

// ---- Sign-in box: fills every element with data-sync ("side" = sidebar, "office" = commish) ----
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const G_LOGO = '<svg class="sync-g" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>';
const LABEL = { loading: 'Connecting…', connecting: 'Connecting…', synced: 'Synced', saving: 'Saving…', offline: 'Offline: saved here, syncs later', error: 'Sync problem' };

export function paintSync(root = document) {
  const shown = status === 'synced' && !navigator.onLine ? 'offline' : status;
  for (const el of root.querySelectorAll('[data-sync]')) {
    const office = el.dataset.sync === 'office';
    if (!user || shown === 'off') {
      const busy = shown === 'loading' || shown === 'connecting';
      el.innerHTML = `<button class="sync-in" type="button"${busy ? ' disabled' : ''}>${G_LOGO}<span>${busy ? 'Connecting…' : 'Sign in with Google'}</span></button>
        ${office ? '<small class="sync-why">Sign in on your phone and computer and your lock marks and settings follow you.</small>' : ''}
        ${shown === 'error' ? `<small class="sync-err">${esc(error)}</small>` : ''}`;
    } else {
      el.innerHTML = `<div class="sync-user">
          ${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : ''}
          <span class="sync-name">${esc(user.displayName || 'Signed in')}</span>
          <button class="sync-out" type="button">Sign out</button>
        </div>
        <span class="sync-status sync-${shown}"><i></i>${esc(LABEL[shown] ?? '')}</span>
        ${shown === 'error' ? `<small class="sync-err">${esc(error)}</small>` : ''}`;
    }
    el.querySelector('.sync-in')?.addEventListener('click', () => signIn());
    el.querySelector('.sync-out')?.addEventListener('click', () => signOut());
  }
}
