'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dist = path.join(__dirname, '..', 'dist');
const plain = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  const elements = new Map(), handlers = {}, calls = [], saved = [];
  const element = (id, dataset = {}) => ({ id, dataset, innerHTML: '', textContent: '', value: '', disabled: false,
    querySelector: () => null, focus() {}, hasAttribute() { return false; } });
  const doc = {
    getElementById: id => elements.get(id) || null,
    addEventListener(type, callback) { (handlers[type] ||= []).push(callback); }
  };
  class FormData {
    constructor(form) { this.values = form.values; }
    get(key) { return this.values[key] ?? null; }
  }
  const context = { document: doc, FormData, URL, setTimeout, clearTimeout,
    localStorage: { getItem() { return null; }, setItem() {} },
    addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  context.window = context; context.globalThis = context; vm.createContext(context);
  for (const file of ['data.js', 'engine.js', 'i18n.js', 'community.js', 'resident-talk.js', 'resident-talk-ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(dist, file), 'utf8'), context, { filename: file });
  }
  let state = context.CM_ENGINE.create(), playing = true, language = 'zh';
  const ui = context.CM_TALK_UI, core = context.CM_TALK;
  const status = element('cm-talk-settings-status'); elements.set(status.id, status);
  const question = element('cm-talk-question'); elements.set(question.id, question);
  const open = (...args) => { ui.cancel(); elements.delete('cm-talk-panel'); calls.push(['open', ...args]); };
  function mount(id = 'chen') {
    ui.cancel();
    const panel = element('cm-talk-panel', { talkResident: id }); elements.set(panel.id, panel);
    panel.innerHTML = ui.panel(id); ui.mount(id); return panel;
  }
  const hooks = {
    getState: () => state, getLanguage: () => language, isPlaying: () => playing,
    save() { saved.push(JSON.stringify(state)); }, open,
    close() { ui.cancel(); elements.delete('cm-talk-panel'); calls.push(['close']); },
    showResident(id) { calls.push(['resident', id]); mount(id); },
    showCard(id) { ui.cancel(); elements.delete('cm-talk-panel'); calls.push(['card', id]); },
    toast(message) { calls.push(['toast', message]); }
  };
  ui.initialize(hooks);
  const click = (attribute, value = '', parent = null) => {
    const camel = attribute.replace(/^data-/, '').replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    const button = { disabled: false, dataset: { [camel]: value }, hasAttribute: key => key === attribute,
      closest: selector => selector === 'form' ? parent : null };
    for (const handler of handlers.click || []) handler({ target: { closest: selector => selector === 'button' ? button : null } });
  };
  const submit = (selector, values) => {
    const form = { values, matches: match => match === selector };
    for (const handler of handlers.submit || []) handler({ target: form, preventDefault() {} });
  };
  const ask = text => submit('[data-talk-form]', { question: text });
  const setup = values => submit('[data-talk-settings-form]', values);
  const network = implementation => { context.V2LLM = { chat: implementation, parseJSON: JSON.parse }; };
  return { context, ui, core, hooks, elements, handlers, calls, saved, mount, click, ask, setup, network,
    get state() { return state; }, set state(value) { state = value; },
    set playing(value) { playing = value; }, set language(value) { language = value; },
    panel: () => elements.get('cm-talk-panel')?.innerHTML || '',
    lastModal: () => calls.filter(c => c[0] === 'open').at(-1) };
}

test('unchanged indoor refreshes reuse rule-derived notes and keep the existing dialogue DOM',()=>{
  const f=fixture(),panel=f.mount();let writes=0,html=panel.innerHTML,notes=0;
  Object.defineProperty(panel,'innerHTML',{get:()=>html,set:value=>{writes++;html=value;},configurable:true});
  const original=f.core.notes;f.core.notes=(...args)=>{notes++;return original(...args);};
  for(let i=0;i<8;i++)f.ui.refresh('chen');
  assert.equal(notes,0,'the paused household does not recompute card availability');
  assert.equal(writes,0,'unchanged refreshes preserve the actual input and log nodes');
  f.state.budget=0;f.ui.refresh('chen');
  assert.equal(notes,1,'changing budget invalidates availability notes');assert.equal(writes,1);
  assert(f.panel().includes('预算还差'),'requirements reflect the changed budget');
  f.state.outcome='won';f.ui.refresh('chen');
  assert.equal(notes,2,'the end of the game invalidates cached suggestions');
  assert(f.panel().includes('本局已经结束'));
  f.language='en';f.ui.refresh('chen');
  assert.equal(notes,3,'a new language never reuses Chinese notes');assert(f.panel().includes('Everyday needs'));
  f.mount('kumar');assert.equal(notes,4,'another household has a distinct note cache');
});

test('a free conversation follows the existing game lifecycle without changing resources', async () => {
  const f = fixture(), before = plain(f.state);
  f.playing = false; f.mount(); assert(f.panel().includes('进入金文泰经营')); assert.equal(f.core.session(f.state, 'chen'), null);
  f.playing = true; f.mount(); f.ask('最近在楼下生活怎样？'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1);
  const after = plain(f.state); delete after.residentTalks; delete after.residentTalkSerial;
  assert.deepEqual(after, before, 'chat changes neither budget, trust, staff, time nor engine flags');
  f.state.outcome = 'won'; f.mount(); f.ask('再问一句'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1);
  assert(f.panel().includes('本局已经结束'));
});

test('duplicate submission, reopening and three questions cannot silently reset a conversation', async () => {
  const f = fixture(); f.mount();
  f.ask('第一问'); f.ask('同时第二次点击'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1);
  f.mount(); assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1);
  f.ask('第二问'); await tick(); f.ask('第三问'); await tick(); f.ask('第四问'); await tick();
  const first = f.core.session(f.state, 'chen');
  assert.equal(first.exchanges.length, 3); assert(f.panel().includes('data-talk-new="chen"'));
  assert(!f.panel().includes('data-talk-form="chen"'));
  f.click('data-talk-new', 'chen');
  const second = f.core.session(f.state, 'chen');
  assert.notEqual(second.id, first.id); assert.equal(second.exchanges.length, 0);
  assert.equal(f.state.residentTalks.length, 2);
});

test('closing or switching a resident drops late model output', async () => {
  const f = fixture(); f.mount();
  let finish; const original = f.core.respond;
  f.core.respond = async (...args) => { await new Promise(resolve => { finish = resolve; }); return original(...args); };
  f.ask('一个还没有回来的问题'); f.hooks.close(); f.mount('kumar'); finish(); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 0);
  assert.equal(f.core.session(f.state, 'kumar').exchanges.length, 0);
});

test('new games, explicit new sessions and language changes reject obsolete replies', async () => {
  for (const change of ['game', 'session', 'language', 'native-close']) {
    const f = fixture(); f.mount(); let finish;
    const original = f.core.respond;
    f.core.respond = async (...args) => { const result = await original(...args); await new Promise(resolve => { finish = resolve; }); return result; };
    f.ask('请等一下'); await tick(); const old = f.state;
    if (change === 'game') f.state = f.context.CM_ENGINE.create();
    if (change === 'session') f.core.newVisit(f.state, 'chen', 'zh');
    if (change === 'language') f.language = 'en';
    if (change === 'native-close') f.elements.set('modal', { open: false });
    finish(); await tick();
    assert.equal(f.core.session(old, 'chen').exchanges.length, 0, change + ' rejected a stale reply');
  }
});

test('online failures consume no questions and offline fallback requires an explicit click', async () => {
  const f = fixture();
  f.setup({ provider: 'openai', baseUrl: 'https://example.test/v1', model: 'test', apiKey: 'test-secret' });
  f.network(async () => { throw new Error('model unavailable'); });
  f.mount(); f.ask('怎样安排屋外路线？'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 0);
  assert(f.panel().includes('model unavailable')); assert(f.panel().includes('data-talk-offline'));
  f.click('data-talk-offline'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1);
  assert.equal(f.core.session(f.state, 'chen').exchanges[0].source, 'offline');
});

test('player text and model text are escaped in live replies and the notebook', async () => {
  const f = fixture();
  f.setup({ provider: 'openai', baseUrl: 'https://example.test/v1', model: 'test', apiKey: 'test-secret' });
  f.network(async () => ({ text: JSON.stringify({ narration: '<img src=x onerror=alert(1)>', reply: '<script>bad()</script>' }), meta: {} }));
  f.mount(); f.ask('<svg onload=bad()>'); await tick();
  const html = f.panel();
  assert(html.includes('&lt;svg onload=bad()&gt;')); assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert(!html.includes('<script>bad()')); assert(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  f.ui.notesModal(); const notebook = f.lastModal()[2];
  assert(notebook.includes('&lt;script&gt;bad()&lt;/script&gt;')); assert(!notebook.includes('<svg onload'));
});

test('API keys stay out of saved worlds and HTML, endpoint changes never reuse a key', async () => {
  const f = fixture(), key = 'private-test-key'; let sent;
  f.setup({ provider: 'openai', baseUrl: 'https://example.test/v1/', model: 'test', apiKey: key });
  assert.equal(f.lastModal()[5].kind, 'talk-settings'); assert(!f.lastModal()[2].includes(key));
  f.network(async settings => { sent = settings; return { text: JSON.stringify({ narration: '场景', reply: '答话' }), meta: {} }; });
  f.mount(); f.ask('你好'); await tick();
  assert.equal(sent.apiKey, key); assert.equal(sent.baseUrl, 'https://example.test/v1');
  assert(!JSON.stringify(f.state).includes(key)); assert(!f.saved.join('').includes(key));
  f.setup({ provider: 'openai', baseUrl: 'https://different.test/v1', model: 'test', apiKey: '' });
  assert(f.elements.get('cm-talk-settings-status').textContent.includes('需要完整'));
  const keyInput = { value: '', placeholder: '' }, form = { querySelector: () => keyInput };
  f.click('data-talk-clear-key', '', form); f.mount(); f.ask('清除后再问'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1, 'cleared credentials cannot make another online request');
});

test('notebook, configuration and card buttons use the host hooks without executing game actions', async () => {
  const f = fixture(); const clicks = f.handlers.click.length, submits = f.handlers.submit.length;
  f.ui.initialize(f.hooks); assert.equal(f.handlers.click.length, clicks); assert.equal(f.handlers.submit.length, submits);
  f.mount(); f.ask('你好'); await tick(); const before = plain(f.state);
  f.click('data-talk-card', 'cover'); assert.deepEqual(f.calls.at(-1), ['card', 'cover']); assert.deepEqual(plain(f.state), before);
  f.click('data-talk-settings'); assert.equal(f.lastModal()[5].kind, 'talk-settings');
  f.language = 'en'; f.ui.settingsModal(); assert.equal(f.lastModal()[1], 'Resident dialogue settings');
  f.click('data-talk-notes'); assert.equal(f.lastModal()[5].kind, 'talk-notes'); assert(f.lastModal()[2].includes('Mdm Chen Yuying'));
  f.click('data-talk-resident-open', 'kumar'); assert.equal(f.calls.at(-1)[0], 'resident');
  assert(!f.panel().includes('data-action='), 'talk controls do not conflict with the host action dispatcher');
});

test('indoor proximity gates new conversations and refresh enables talking without remounting the home', async () => {
  const f = fixture(), before = plain(f.state); let near = false;
  f.hooks.canTalkTo = id => near && id === 'chen';
  f.mount();
  assert(f.panel().includes('先在屋内走近居民'));
  assert(f.panel().includes('data-talk-form="chen"'), 'composer stays visible while approaching');
  assert(f.panel().includes('disabled'));
  assert.equal(f.core.session(f.state, 'chen'), null, 'entering at the doorway does not create an empty visit');
  f.ask('隔着屋子发问'); await tick(); assert.deepEqual(plain(f.state), before);
  const listeners = [f.handlers.click.length, f.handlers.submit.length];
  near = true; f.ui.refresh('chen'); f.ui.refresh('chen');
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 0);
  assert.deepEqual([f.handlers.click.length, f.handlers.submit.length], listeners);
  f.ask('走近以后问一句'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1);
  near = false; f.ui.refresh('chen'); f.ask('已经离开后再问'); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 1);
  assert(f.panel().includes('先在屋内走近居民'));
});

test('walking away and back cannot revive a pending reply from an earlier indoor interaction', async () => {
  const f = fixture(); let near = true, finish;
  f.hooks.canTalkTo = () => near; f.mount();
  const original = f.core.respond;
  f.core.respond = async (...args) => { const result = await original(...args); await new Promise(resolve => { finish = resolve; }); return result; };
  f.ask('请慢慢说'); await tick();
  near = false; f.ui.refresh('chen'); near = true; f.ui.refresh('chen');
  finish(); await tick();
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 0);
  assert(!f.panel().includes('等待回复…'), 'the new interaction is not left busy');
});

test('observing a household object only prefills a question and does not send it', async () => {
  const f = fixture(); let near = false, focused = 0;
  f.hooks.canTalkTo = () => near; f.mount();
  const input = f.elements.get('cm-talk-question'); input.disabled = true; input.focus = () => { focused += 1; };
  const question = '我留意到 <旧茶杯>，这对你的日常有什么影响？';
  const writes = f.saved.length;
  f.ui.focusQuestion(question);
  assert(f.panel().includes('&lt;旧茶杯&gt;'));
  assert.equal(focused, 0); assert.equal(f.saved.length, writes);
  assert.equal(f.core.session(f.state, 'chen'), null);
  near = true; f.ui.refresh('chen'); input.disabled = false;
  f.ui.focusQuestion();
  assert.equal(focused, 1); assert.equal(f.core.session(f.state, 'chen').exchanges.length, 0);
  assert(f.panel().includes('&lt;旧茶杯&gt;'), 'approaching preserves the observed-object question');
  input.value = '我自己补充的问题'; near = false; f.ui.refresh('chen');
  assert(f.panel().includes('我自己补充的问题'), 'moving around preserves a manually edited unsent draft');
});

test('a fresh indoor conversation stays in the current home and requires renewed proximity', async () => {
  const f = fixture(); let near = true;
  f.hooks.canTalkTo = () => near; f.mount();
  for (const question of ['一', '二', '三']) { f.ask(question); await tick(); }
  const first = f.core.session(f.state, 'chen');
  near = false; f.ui.refresh('chen'); f.click('data-talk-new', 'chen');
  assert.equal(f.core.session(f.state, 'chen').id, first.id);
  near = true; f.ui.refresh('chen'); f.click('data-talk-new', 'chen');
  assert.notEqual(f.core.session(f.state, 'chen').id, first.id);
  assert.equal(f.core.session(f.state, 'chen').exchanges.length, 0);
  assert(!f.calls.some(call => call[0] === 'resident'), 'does not jump back to the profile');
});
