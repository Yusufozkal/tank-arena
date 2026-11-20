(() => {
'use strict';

const DEBUG = /[?&#]debug/.test(location.href);
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ================= helpers ================= */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const turnTo = (a, t, s) => { const d = angDiff(a, t); return Math.abs(d) <= s ? t : a + (d > 0 ? s : -s); };
const dist2 = (ax, ay, bx, by) => { const x = ax - bx, y = ay - by; return x * x + y * y; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
function mulberry32(a) { return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (c, r, s) => (Math.imul(c + 7, 73856093) ^ Math.imul(r + 13, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0;
const fmt = n => Math.round(n).toLocaleString('tr-TR');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
const vibrate = p => { if (!SET.vibration) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
function rrectPath(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rrect(g, x, y, w, h, r) { g.beginPath(); rrectPath(g, x, y, w, h, r); }

