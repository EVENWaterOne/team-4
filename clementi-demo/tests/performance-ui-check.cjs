'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const defaultRoot = path.resolve(__dirname, '..');

function fixture(root = defaultRoot) {
  const elements = {}, handlers = {}, windowHandlers = {}, intervals = [], storage = new Map(), syncs = [];
  const counters = { text: 0, html: 0, attributes: 0, queries: 0 };
  let now = 0, flowActive = true, flowConfig;
  class Element {
    constructor(id) {
      this.id = id; this._html = ''; this._text = ''; this.hidden = id === 'world' || id === 'placement-panel';
      this.open = false; this.dataset = {}; this.attributes = {}; this.handlers = {}; this.children = [];
      const values = new Set();
      this.classList = { add: (...a) => a.forEach(x => values.add(x)), remove: (...a) => a.forEach(x => values.delete(x)),
        toggle: (x, on) => { if (on == null) on = !values.has(x); on ? values.add(x) : values.delete(x); return on; },
        contains: x => values.has(x) };
    }
    get innerHTML() { return this._html; }
    set innerHTML(value) { counters.html++; this._html = value; }
    get textContent() { return this._text; }
    set textContent(value) { counters.text++; this._text = String(value); }
    setAttribute(key, value) { counters.attributes++; this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key]; }
    hasAttribute(key) { return key in this.attributes; }
    querySelector() { return null; } querySelectorAll() { return []; }
    addEventListener(type, fn) { this.handlers[type] = fn; }
    appendChild(el) { this.children.push(el); } remove() {}
    showModal() { this.open = true; }
    close() { this.open = false; this.handlers.close?.(); }
  }
  const doc = { hidden: false, documentElement: {}, title: '',
    getElementById: id => elements[id] || (elements[id] = new Element(id)),
    querySelectorAll: selector => { counters.queries++; return selector === '[aria-label],[title]'
      ? Object.values(elements).filter(el => Object.keys(el.attributes).length) : []; },
    createElement: tag => new Element(tag), addEventListener: (type, fn) => { handlers[type] = fn; } };
  doc.getElementById('speed').setAttribute('aria-label', '切换经营速度');
  const context = { document: doc, performance: { now: () => now },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setInterval: fn => intervals.push(fn), setTimeout: () => 1, clearTimeout() {},
    CustomEvent: function (type, options) { this.type = type; this.detail = options.detail; },
    addEventListener: (type, fn) => { (windowHandlers[type] || (windowHandlers[type] = [])).push(fn); },
    dispatchEvent: event => (windowHandlers[event.type] || []).forEach(fn => fn(event)),
    CM_FLOW: { start(config) { flowConfig = config; }, isActive: () => flowActive, showMap() { flowActive = true; } },
    HDBScene: { ready: true, view: 'neighborhood', sync: (state, options) => syncs.push({ state, options: { ...options } }),
      cue() {}, previewPlacement() {}, clearPreview() {}, focusIssue() {}, showNeighborhood() {} } };
  context.window = context; context.globalThis = context; vm.createContext(context);
  for (const file of ['data.js', 'engine.js', 'art.js', 'clementi-art.js', 'world.js', 'i18n.js', 'community.js', 'visuals.js', 'app.js', 'scene-adapter.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'dist', file), 'utf8'), context, { filename: file });
  }
  const app = context.CM_APP;
  const click = (action, id) => handlers.click({ target: { closest: selector => selector === '[data-action]' ? { dataset: { action, id }, disabled: false } : null } });
  const frame = (ms = 200) => { now += ms; intervals.forEach(fn => fn()); };
  function enter() { flowActive = false; flowConfig.onEnter({ resume: false }); click('tutorial-skip'); app.render(); }
  function reset() { for (const key of Object.keys(counters)) counters[key] = 0; syncs.length = 0; }
  return { app, E: context.CM_ENGINE, scene: context.CM_SCENE, context, doc, handlers, elements, syncs, counters, enter, frame, click, reset };
}

function report(root) {
  const g = fixture(root); g.enter();
  g.elements.pause.onclick(); for (let i = 0; i < 5; i++) g.frame(); g.reset();
  for (let i = 0; i < 50; i++) g.frame();
  const paused = { ...g.counters, sceneSyncs: g.syncs.length };
  g.doc.hidden = true; g.handlers.visibilitychange(); g.reset();
  for (let i = 0; i < 50; i++) g.frame();
  const hidden = { ...g.counters, sceneSyncs: g.syncs.length };
  return { simulatedSecondsPerPhase: 10, paused, hidden };
}

if (process.argv.includes('--report')) {
  const argument = process.argv.find(value => value.startsWith('--base='));
  console.log(JSON.stringify(report(argument ? argument.slice(7) : defaultRoot), null, 2));
} else {
  test('unchanged paused and hidden views perform no repeated DOM repaint or scene synchronization', () => {
    const measured = report(defaultRoot);
    assert.deepEqual(measured.paused, { text: 0, html: 0, attributes: 0, queries: 0, sceneSyncs: 0 });
    assert.deepEqual(measured.hidden, { text: 0, html: 0, attributes: 0, queries: 0, sceneSyncs: 0 });
  });

  test('opening, native closing, visibility and resuming immediately synchronize scene pause state', () => {
    const g = fixture(); g.enter(); const state = g.app.getState();
    g.app.showResident('chen');
    assert.equal(g.syncs.at(-1).options.paused, true); assert.equal(g.syncs.at(-1).options.suspended, true);
    const before = state.time; for (let i = 0; i < 20; i++) g.frame(); assert.equal(state.time, before);
    g.elements.modal.close();
    assert.equal(g.syncs.at(-1).options.paused, false); assert.equal(g.syncs.at(-1).options.suspended, false);
    g.frame(); assert.equal(state.time, before + .2);
    g.doc.hidden = true; g.handlers.visibilitychange(); assert.equal(g.syncs.at(-1).options.suspended, true);
    const hiddenTime = state.time; g.frame(100000); assert.equal(state.time, hiddenTime);
    g.doc.hidden = false; g.handlers.visibilitychange(); g.frame(); assert.equal(state.time, hiddenTime + .2, 'background time is not replayed');
  });

  test('external state updates, new private mail and locale switches are still visible while paused', () => {
    const g = fixture(); g.enter(); g.elements.pause.onclick(); g.frame(800); g.reset();
    g.E.tick(g.app.getState(), 60); g.frame(800);
    assert.match(g.elements.mailbox.innerHTML, /1/); assert.match(g.elements['world-feed'].innerHTML, /楼上的年轻人/);
    assert(g.counters.html > 0, 'new events invalidate the paused HUD');
    g.app.setLanguage('en'); assert.match(g.elements['world-feed'].innerHTML, /upstairs|young|neighbou?r/i);
    assert.equal(g.elements.speed.getAttribute('aria-label'), 'Change simulation speed');
    g.app.setLanguage('zh'); assert.equal(g.elements.speed.getAttribute('aria-label'), '切换经营速度');
  });

  test('the adapter reuses static cards and identical plot models but forwards real state and selection changes', () => {
    const g = fixture(); g.enter(); const state = g.app.getState(), cards = g.context.Downstairs.cards;
    g.elements.pause.onclick(); g.reset();
    g.app.render(); g.app.render();
    assert.equal(g.syncs.length, 0); assert.equal(g.context.Downstairs.cards, cards);
    const before = g.scene.diagnostics().adapter.plotBuilds;
    assert(g.E.play(state, 'cover', 'route-west', { x: 0, z: 0, rotation: 0 }).ok); g.app.render();
    assert.equal(g.scene.diagnostics().adapter.plotBuilds, before + 1); assert.equal(g.syncs.length, 1);
    assert.equal(g.syncs[0].state.plots[6].cardId, 'cover');
    g.E.tick(state, 5); g.app.render(); assert.equal(g.syncs.length, 2);
    assert(g.syncs[1].state.plots[6].progress > 0, 'construction progress still reaches the renderer');
  });
}
