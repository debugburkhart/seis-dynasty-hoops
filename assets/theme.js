// Light / dark mode (owner, Nov 8 2026: "a light/dark mode option for the site ... on the navigation tab").
// styles.css has ~950 hard-coded colors, so dark mode is NOT a hand-written second stylesheet: when dark is on, this
// module reads every rule in styles.css once and writes an override sheet (<style id="theme-dark">) where each color is
// converted by ROLE: backgrounds (light surfaces -> dark, navy and bright accents kept), text (dark -> light, kept on a
// background that stays dark or bright), borders, SVG fills/strokes. New CSS gets a dark version automatically.
// Rules: html.dark + every selector (same specificity bump for all rules, so their order is unchanged); wrapped in
// @media screen so printing / Save as PDF stays light. Choice: localStorage 'theme' = light | dark | auto (auto =
// the device's setting); default light. index.html sets html.dark before the page draws (no white flash).

const KEY = 'theme';
const MODES = [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']];
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

export function themeMode() {
  try { return localStorage.getItem(KEY) || 'light'; } catch { return 'light'; }
}
const isDark = mode => mode === 'dark' || (mode === 'auto' && !!mq?.matches);

// ---------- Color math (sRGB <-> OKLab) ----------

const toLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(v => toLin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) };
}
function fromOklab({ L, C, h }) {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.map(v => Math.round(Math.min(1, Math.max(0, toSrgb(Math.max(0, v)))) * 255));
}

const NAVY_H = oklab([16, 38, 79]).h; // --navy-800's hue
const NAMED = { white: [255, 255, 255], black: [0, 0, 0] };
function parse(tok) {
  const t = tok.toLowerCase();
  if (NAMED[t]) return { rgb: NAMED[t], a: 1 };
  if (t[0] === '#') {
    let h = t.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
    const n = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return { rgb: n, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  const m = t.match(/rgba?\(([^)]*)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean);
  const num = (v, max) => (v.endsWith('%') ? (parseFloat(v) / 100) * max : parseFloat(v));
  return { rgb: p.slice(0, 3).map(v => num(v, 255)), a: p[3] != null ? num(p[3], 1) : 1 };
}
const out = (rgb, a = 1) => (a >= 1 ? `rgb(${rgb.join(', ')})` : `rgba(${rgb.join(', ')}, ${+a.toFixed(3)})`);

// Is this background color kept as it is in dark mode? (navy / dark fills, and bright accents like gold or sky)
function keptBg(c) {
  if (!c) return true;
  const k = oklab(c.rgb);
  if (c.a < 1) return k.L > 0.6; // white glass on navy stays; black tints are converted
  return k.L < 0.5 || (k.C > 0.085 && k.L < 0.9);
}

// role: bg | text | border | graphic. keepText = the rule's own background stays dark/bright, so its text is kept.
function convert(c, role, keepText) {
  const k = oklab(c.rgb);
  if (c.a < 1) {
    if (role === 'text') return k.L < 0.6 ? out(fromOklab({ ...k, L: 0.94 - k.L * 0.5 }), c.a) : null;
    // black / navy tints (hover shades, light shadows on cards) become white tints
    if (k.L < 0.35 && role !== 'shadow') return out([255, 255, 255], Math.min(0.5, c.a * 1.4));
    return null;
  }
  if (role === 'shadow') return null;
  if (role === 'text') {
    if (keepText || k.L >= 0.62) return null;
    return out(fromOklab({ L: 0.96 - k.L * 0.58, C: Math.min(k.C, 0.16), h: k.h }));
  }
  if (role === 'bg') {
    if (keptBg(c)) return null;
    const t = Math.max(0, (k.L - 0.5) / 0.5); // 0..1 over light colors
    // near-grey surfaces (cream, white, pale lines) take a slight navy tint instead of their warm cream tint
    const tinted = k.C >= 0.03;
    return out(fromOklab({ L: 0.17 + t ** 6 * 0.1 + (1 - t) * 0.04, C: tinted ? Math.min(0.06, k.C * 1.3) : 0.022, h: tinted ? k.h : NAVY_H }));
  }
  if (role === 'border') {
    if (k.L >= 0.62) return out(fromOklab({ L: 0.32 + (k.L - 0.62) * 0.15, C: k.C >= 0.03 ? Math.min(0.05, k.C) : 0.025, h: k.C >= 0.03 ? k.h : NAVY_H }));
    if (k.L < 0.42 && k.C < 0.12) return out(fromOklab({ ...k, L: 0.5 - k.L * 0.3 }));
    return null;
  }
  // graphic (SVG fill / stroke): pale grid lines and areas go dark, navy marks go light, accents stay
  if (k.C > 0.085 && k.L > 0.45 && k.L < 0.9) return null;
  if (k.L >= 0.62) return convert(c, 'bg');
  if (k.L < 0.42) return out(fromOklab({ L: 0.82 - k.L * 0.5, C: Math.min(k.C, 0.14), h: k.h }));
  return null;
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function convertValue(val, role, keepText, vars) {
  const v = resolveVars(val, vars);
  let changed = false;
  const res = v.replace(COLOR_RE, tok => {
    const c = parse(tok);
    if (!c) return tok;
    const r = convert(c, role, keepText);
    if (r == null) return tok;
    changed = true;
    return r;
  });
  return { value: res, changed, resolved: v };
}
// var(--token) -> the token's light value (only :root tokens; class-level tokens are converted where they're set)
function resolveVars(val, vars, depth = 0) {
  if (depth > 4 || !val.includes('var(')) return val;
  return resolveVars(val.replace(/var\((--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (m, name, fb) => vars[name] ?? (fb ? fb : m)), vars, depth + 1);
}

function roleOf(prop, sel) {
  if (prop.startsWith('--')) {
    if (/bg|back|surface|tint/.test(prop)) return 'bg';
    if (/edge|line|border/.test(prop)) return 'border';
    if (/ink|-c$|color|text/.test(prop)) return 'text';
    return null;
  }
  if (prop === 'color' || prop === 'caret-color' || prop === '-webkit-text-fill-color' || prop === 'text-decoration-color') return 'text';
  if (prop.startsWith('background')) return 'bg';
  if (prop.startsWith('border') || prop.startsWith('outline') || prop === 'column-rule-color') return 'border';
  if (prop === 'box-shadow' || prop === 'text-shadow') return 'shadow';
  if (prop === 'fill' || prop === 'stroke' || prop === 'stop-color') return /\btext\b|tspan/.test(sel) ? 'text' : 'graphic';
  return null;
}

// Shorthands the browser can't split when they use var(): their longhands read as '' in the CSSOM.
const SHORT = [['background', /^background-/], ['border', /^border-(top|right|bottom|left)-(color|style|width)$/],
  ['border-top', /^border-top-/], ['border-right', /^border-right-/], ['border-bottom', /^border-bottom-/],
  ['border-left', /^border-left-/], ['border-color', /^border-\w+-color$/], ['outline', /^outline-/]];

function splitSelectors(text) {
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
function darkSelector(text) {
  return splitSelectors(text).map(s => {
    if (/^:root\b/.test(s)) return s.replace(/^:root/, ':root.dark');
    if (/^html\b/.test(s)) return s.replace(/^html/, 'html.dark');
    return `html.dark ${s}`;
  }).join(', ');
}

function darkRule(rule, vars, asIs = false) {
  const st = rule.style;
  let sel = rule.selectorText;
  if (!st || !sel) return '';
  // parts inside an already-dark container keep their light-mode colors (written again unchanged, so no converted rule
  // of lower specificity can beat them)
  const parts = splitSelectors(sel);
  const keep = asIs ? [] : parts.filter(insideDark);
  if (keep.length) {
    const rest = parts.filter(s => !insideDark(s));
    return [darkRule({ style: st, selectorText: keep.join(', ') }, vars, true),
      rest.length ? darkRule({ style: st, selectorText: rest.join(', ') }, vars) : ''].filter(Boolean).join('\n');
  }
  const props = [];
  const shorts = new Set();
  for (let i = 0; i < st.length; i++) {
    const p = st.item(i);
    let v = st.getPropertyValue(p);
    if (!v) {
      const sh = SHORT.find(([, re]) => re.test(p));
      if (sh && st.getPropertyValue(sh[0])) { shorts.add(sh[0]); continue; }
    }
    props.push(p);
  }
  for (const s of shorts) props.push(s);
  // Does this rule keep a dark or bright background? Then its text color was chosen for that and stays.
  let bgKept = null;
  for (const p of ['background-color', 'background', '--dk-bg', '--dg-bg']) {
    const raw = st.getPropertyValue(p);
    if (!raw) continue;
    // only solid colors count: a see-through tint shows the (converted) surface under it
    const solid = (resolveVars(raw, vars).match(COLOR_RE) ?? []).map(parse).filter(c => c && c.a >= 0.5);
    if (solid.length) { bgKept = solid.some(keptBg); break; }
  }
  // A text-only rule aimed inside a bright background set elsewhere (a gold selected row's cells) keeps its text too.
  const keepText = bgKept === true || (bgKept == null && splitSelectors(sel).some(s => insideBright(s)));
  const decl = [];
  for (const p of props) {
    const role = roleOf(p, sel);
    if (!role) continue;
    const raw = st.getPropertyValue(p);
    if (!raw || (!COLOR_RE.test(raw) && !raw.includes('var('))) { COLOR_RE.lastIndex = 0; continue; }
    COLOR_RE.lastIndex = 0;
    // a kept background is kept whole (a light-to-gold gradient stays one piece)
    const { value, resolved } = asIs || (role === 'bg' && bgKept === true) ?{ value: resolveVars(raw, vars), resolved: resolveVars(raw, vars) }
      : convertValue(raw, role, keepText, vars);
    // Every color declaration is written (changed or not), so a more specific light rule never loses to a dark one.
    if (resolved.includes('var(') && value === resolved) continue; // a class-level token: converted where it's set
    const imp = st.getPropertyPriority(p) ? ' !important' : '';
    decl.push(`${p}: ${value}${imp}`);
  }
  return decl.length ? `${darkSelector(sel)} { ${decl.join('; ')} }` : '';
}

// Selectors whose element gets a BRIGHT solid background (gold, sky...), as "contexts": the selector itself and, when
// it's specific enough, its parent part (".bk .bk-table tr.on td" -> ".bk .bk-table tr.on").
let BRIGHT = [];
const compounds = s => s.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean);
function collectBright(rules, vars) {
  for (const r of rules) {
    if (r.type === 4 || r.type === 12) { collectBright(r.cssRules, vars); continue; }
    if (r.type !== 1 || !r.style) continue;
    const raw = r.style.getPropertyValue('background-color') || r.style.getPropertyValue('background');
    if (!raw) continue;
    const solid = (resolveVars(raw, vars).match(COLOR_RE) ?? []).map(parse).filter(c => c && c.a >= 0.5);
    if (!solid.some(c => keptBg(c) && oklab(c.rgb).L >= 0.5)) continue;
    for (const s of splitSelectors(r.selectorText)) {
      const base = s.replace(/::?[\w-]+(\([^)]*\))?$/, '').trim();
      BRIGHT.push(base);
      const parts = compounds(base);
      if (parts.length >= 3 && /[.:[]/.test(parts.at(-2))) BRIGHT.push(parts.slice(0, -1).join(' '));
    }
  }
}
// Containers that are ALREADY dark in light mode (sidebar, the 2K card, fight cards...): rules scoped inside them were
// designed for a dark background and are left exactly as they are. KEEP = badges drawn on such a card whose
// selectors don't name it.
const KEEP = ['.bk-total', '.bk-dyn', '.bk-lock', '.pc', '.bk-mchip']; // .pc = Sleeper position-color boxes (Nov 11 2026): same in both themes
let DARK = [];
function collectDark(rules, vars) {
  for (const r of rules) {
    if (r.type === 4 || r.type === 12) { collectDark(r.cssRules, vars); continue; }
    if (r.type !== 1 || !r.style) continue;
    const raw = r.style.getPropertyValue('background-color') || r.style.getPropertyValue('background');
    if (!raw) continue;
    const solid = (resolveVars(raw, vars).match(COLOR_RE) ?? []).map(parse).filter(c => c && c.a >= 0.5);
    if (!solid.length || !solid.every(c => oklab(c.rgb).L < 0.45)) continue;
    for (const s of splitSelectors(r.selectorText)) {
      const parts = compounds(s);
      if (parts.length === 1 && !/:/.test(s)) DARK.push(s.trim()); // plain containers only (.bk, .fight, .sidebar)
    }
  }
}
const insideDark = s => {
  const parts = compounds(s);
  return parts.length > 1 && DARK.includes(parts[0]) || KEEP.some(k => parts[0] === k || parts[0].startsWith(k + '.') || parts[0].startsWith(k + ':'));
};
const insideBright = s => {
  const flat = compounds(s).join(' ');
  return BRIGHT.some(x => flat.startsWith(x + ' '));
};

function walk(rules, vars) {
  const outRules = [];
  for (const r of rules) {
    if (r.type === 1) { const d = darkRule(r, vars); if (d) outRules.push(d); }
    else if (r.type === 4) { // @media
      const cond = r.media.mediaText;
      if (/\bprint\b/.test(cond)) continue;
      const inner = walk(r.cssRules, vars);
      if (inner.length) outRules.push(`@media ${cond} { ${inner.join('\n')} }`);
    } else if (r.type === 12) { // @supports
      const inner = walk(r.cssRules, vars);
      if (inner.length) outRules.push(`@supports ${r.conditionText} { ${inner.join('\n')} }`);
    }
  }
  return outRules;
}

let built = null;
function buildCss() {
  if (built != null) return built;
  const sheets = [...document.styleSheets].filter(s => (s.href || '').includes('/assets/styles.css'));
  const vars = {};
  const rules = [];
  for (const s of sheets) {
    let list;
    try { list = s.cssRules; } catch { continue; }
    for (const r of list) {
      if (r.type === 1 && /^:root$/.test(r.selectorText)) {
        for (let i = 0; i < r.style.length; i++) {
          const p = r.style.item(i);
          if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim();
        }
      }
    }
    collectBright(list, vars);
    collectDark(list, vars);
    rules.push(...walk(list, vars));
  }
  // Tokens for inline styles written by the scripts (var(--ink) etc. outside styles.css)
  const tok = ['--cream', '--paper', '--ink', '--muted', '--line', '--gold-ink'].map(t => {
    const c = vars[t] && parse(vars[t]);
    if (!c) return '';
    const role = t === '--ink' || t === '--muted' || t === '--gold-ink' ? 'text' : t === '--line' ? 'border' : 'bg';
    const v = convert(c, role, false);
    return v ? `${t}: ${v};` : '';
  }).join(' ');
  built = `@media screen {\n:root.dark { color-scheme: dark; ${tok} }\n${rules.join('\n')}\n}`;
  return built;
}

async function sheetReady() {
  const link = document.querySelector('link[href*="assets/styles.css"]');
  if (!link) return;
  try { if (link.sheet?.cssRules) return; } catch { return; }
  await new Promise(res => { link.addEventListener('load', res, { once: true }); setTimeout(res, 4000); });
}

export async function applyTheme(mode = themeMode()) {
  const dark = isDark(mode);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#07142b' : '#10264f');
  let el = document.getElementById('theme-dark');
  if (!dark) { el?.remove(); return; }
  await sheetReady();
  if (!el) {
    el = document.createElement('style');
    el.id = 'theme-dark';
    document.head.appendChild(el);
  }
  if (!el.textContent) el.textContent = buildCss();
}

export function setTheme(mode) {
  try { localStorage.setItem(KEY, mode); } catch { /* private mode: this visit only */ }
  applyTheme(mode);
  document.querySelectorAll('[data-theme-box]').forEach(paintTheme);
}

// The switch in the sidebar: Light / Dark / Auto.
export function themeSwitch() {
  return '<div class="theme-box" data-theme-box></div>';
}
export function paintTheme(box) {
  const mode = themeMode();
  box.innerHTML = `<span class="theme-lbl">Theme</span><div class="theme-seg" role="radiogroup" aria-label="Color theme">${MODES.map(([m, l]) =>
    `<button type="button" role="radio" aria-checked="${m === mode}" class="${m === mode ? 'on' : ''}" data-theme-set="${m}">${l}</button>`).join('')}</div>`;
  box.onclick = e => {
    const b = e.target.closest('[data-theme-set]');
    if (b) setTheme(b.dataset.themeSet);
  };
}

mq?.addEventListener?.('change', () => { if (themeMode() === 'auto') applyTheme('auto'); });
applyTheme();
