'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
function fixture() {
  const timers = new Map(); let serial = 0;
  const ctx = { CM_DATA: { issueChannels: { housing:'mail', care:'mail', noise:'world', waiting:'mail' } },
    setTimeout(fn) { const id=++serial; timers.set(id,fn); return id; }, clearTimeout(id) { timers.delete(id); } };
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/mail-ui.js'),'utf8'),ctx);
  const values = new Map(), classes = new Set(), handlers = {};
  let html='', writes=0;
  const button = { dataset:{}, attributes:{}, offsetWidth:108,
    classList:{add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},toggle(name,on){on?classes.add(name):classes.delete(name);},contains:n=>classes.has(n)},
    querySelector(selector){if(!values.has(selector))values.set(selector,{textContent:'',hidden:false});return values.get(selector);},
    addEventListener(type,fn){handlers[type]=fn;},setAttribute(name,value){this.attributes[name]=value;},
    get innerHTML(){return html;},set innerHTML(value){html=value;writes++;}
  };
  return { ui:ctx.CM_MAIL_UI,button,classes,values,handlers,timers,get writes(){return writes;} };
}
const mail=(id,read=false)=>({id,channel:'mail',read,status:'open',age:0});
test('a delivered private letter animates once while ordinary renders preserve the envelope DOM',()=>{
  const f=fixture(),state={issues:[]};f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'0');assert.equal(f.writes,1);
  state.issues.push(mail('housing'));f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'1');assert(f.classes.has('is-arriving'));assert(f.classes.has('has-unread'));
  const markup=f.button.innerHTML;for(let n=0;n<5;n++)f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'1');assert.equal(f.button.innerHTML,markup);assert.equal(f.writes,1);
  assert.equal(f.values.get('.mailbox-count').textContent,'1');assert.equal(f.button.attributes['aria-label'],'居民来信，未读 1 · 点击拆阅新来信');
  f.handlers.animationend({animationName:'cm-mail-delivery'});assert(!f.classes.has('is-arriving'));
  f.ui.render(state,f.button);assert(!f.classes.has('is-arriving'));
});
test('public observations, read changes and language switches never masquerade as deliveries',()=>{
  const f=fixture(),state={issues:[{id:'noise',channel:'world',read:false}]};f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'0');assert(!f.classes.has('has-unread'));
  state.issues.push(mail('housing'));f.ui.render(state,f.button);f.handlers.animationend({animationName:'cm-mail-delivery'});
  state.issues[1].read=true;f.ui.render(state,f.button,'en');assert.equal(f.button.dataset.mailDelivery,'1');assert(!f.classes.has('is-arriving'));assert(!f.classes.has('has-unread'));assert.equal(f.values.get('.mailbox-count').hidden,true);assert(f.button.attributes['aria-label'].startsWith('Resident post, unread 0'));
  state.issues[1].read=false;f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'1');assert(!f.classes.has('is-arriving'));
  state.issues.push(mail('care'));f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'2');assert(f.classes.has('is-arriving'));
});
test('restored read mail stays history and a new game gets an independent delivery ledger',()=>{
  const f=fixture(),state={issues:[mail('housing',true)]};f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'0');
  state.issues.push(mail('care'));f.ui.render(state,f.button);assert.equal(f.button.dataset.mailDelivery,'1');
  const fresh={issues:[]};f.ui.render(fresh,f.button);assert.equal(f.button.dataset.mailDelivery,'0');assert(!f.classes.has('is-arriving'));fresh.issues.push(mail('care'));f.ui.render(fresh,f.button);assert.equal(f.button.dataset.mailDelivery,'1');
});
test('open animation is bounded, markup has folded paper and private content cannot become HTML',()=>{
  const f=fixture(),state={issues:[{...mail('housing'),title:'<img src=x onerror=alert(1)>',person:'<script>bad()</script>'}]};f.ui.render(state,f.button);
  assert(f.button.innerHTML.includes('mail-envelope-flap'));assert(f.button.innerHTML.includes('mail-envelope-paper'));assert(f.button.innerHTML.includes('mail-envelope-left'));assert(!f.button.innerHTML.includes('<img'));assert(!f.button.innerHTML.includes('<script>'));
  f.ui.open(f.button);assert(f.classes.has('is-opening'));f.handlers.animationend({animationName:'cm-mail-open'});assert(!f.classes.has('is-opening'));assert(f.classes.has('has-unread'));
  f.ui.open(f.button);for(const callback of [...f.timers.values()])callback();assert(!f.classes.has('is-opening'));assert(!f.classes.has('is-arriving'));
});
test('authoritative channel mapping prevents older saves from mixing public observations into the postbag',()=>{
  const f=fixture(),state={issues:[{...mail('noise'),channel:'mail'}, {id:'housing',read:false,status:'open',age:45}]};f.ui.render(state,f.button);
  assert.equal(f.values.get('.mailbox-count').textContent,'1');assert.equal(f.button.dataset.mailDelivery,'1');
});
