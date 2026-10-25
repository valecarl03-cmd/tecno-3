const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'index.js'), 'utf8');
const start = src.indexOf('  function createIdleAutoplay(');
const end = src.indexOf('\n  }\n', start) + 4;
const fnSrc = src.slice(start, end);
// fake clock
let now = 0, seq = 0; const timers = new Map();
const setTimeout = (fn, ms) => { const id = ++seq; timers.set(id, {at: now + ms, fn}); return id; };
const clearTimeout = id => timers.delete(id);
const requestAnimationFrame = fn => setTimeout(fn, 16), cancelAnimationFrame = clearTimeout;
function advance(ms) { const target = now + ms; for (;;) { let next = null;
  for (const [id, t] of timers) if (t.at <= target && (!next || t.at < next[1].at)) next = [id, t];
  if (!next) break; timers.delete(next[0]); now = next[1].at; next[1].fn(); } now = target; }
// DOM stubs
function makeTarget() { const l = {}; return { l,
  addEventListener(t, f, o) { (l[t] ||= []).push({f, cap: typeof o === 'object' ? o.capture : !!o}); },
  removeEventListener(t, f, o) { const c = typeof o === 'object' ? o.capture : !!o; l[t] = (l[t]||[]).filter(x => !(x.f === f && x.cap === c)); },
  emit(t) { (l[t]||[]).forEach(x => x.f({type: t})); }, count() { return Object.values(l).reduce((a, b) => a + b.length, 0); } }; }
const container = makeTarget(); const document = Object.assign(makeTarget(), {hidden: false});
const cls = new Set(); const idleProgressElements = [{ classList: {add: c => cls.add(c), remove: c => cls.delete(c)},
  querySelector: () => ({ style: {} }) }]; document.body = { offsetWidth: 0 };
const createIdleAutoplay = eval('(' + fnSrc.trim().replace(/^function createIdleAutoplay/, 'function') + ')');
const fires = []; const ap = createIdleAutoplay(container, 8000, () => fires.push(now));
let ok = true; const check = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); ok = ok && cond; };

ap.start();
advance(7999); check('no advance before 8000ms', fires.length === 0);
advance(1); check('advances at exactly 8000ms', fires[0] === 8000);
advance(8000); check('re-arms recursively (16000ms)', fires[1] === 16000);
for (const ev of ['click','mouseenter','mouseleave','touchstart','touchend','scroll']) {
  const before = fires.length; const t = now; advance(5000); container.emit(ev); advance(7999);
  const noEarly = fires.length === before; advance(1);
  check(`${ev} at +5s resets: no fire at +12999, fires at +13000`, noEarly && fires[fires.length-1] === t + 13000);
}
const b = fires.length; for (let i = 0; i < 20; i++) { advance(1000); container.emit('pointermove'); }
check('continuous interaction never advances', fires.length === b);
advance(8000); check('advances 8s after interaction stops', fires.length === b + 1);
check('single pending timer (no queue build-up)', [...timers.values()].filter(t => t.at - now > 100).length === 1);
document.hidden = true; document.emit('visibilitychange'); advance(60000);
check('hidden tab: no advance', fires.length === b + 1);
document.hidden = false; document.emit('visibilitychange'); const tv = now; advance(8000);
check('visible again: full 8s countdown', fires[fires.length-1] === tv + 8000);
ap.stop(); const s = fires.length; advance(60000); check('stop() (pause button) halts autoplay', fires.length === s);
ap.start(); advance(100); check('progress bar running while armed', cls.has('running'));
ap.destroy(); advance(60000);
check('destroy(): no timers left', timers.size === 0);
check('destroy(): all listeners removed', container.count() === 0 && document.count() === 0);
check('destroy(): progress bar reset', !cls.has('running'));
console.log(ok ? '\nALL PASS' : '\nFAILURES'); process.exit(ok ? 0 : 1);
