'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = {};
vm.createContext(context);
for (const name of ['data.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', name), 'utf8'), context, { filename: name });
}
const E = context.CM_ENGINE;
const D = context.CM_DATA;
let s = E.create();
assert.equal(E.metrics(s).stay, 60);
assert.equal(D.residents.length, 8);
assert.equal(D.cards.filter(c => !c.actionOption).length, 11);
assert.equal(s.staffUsed, 0);
assert.equal(E.available(s, 'cover', 'locked').ok, false);
assert.equal(E.available(s, 'cca', 'route').ok, false);
assert(E.play(s, 'cover', 'route').ok);
assert.equal(E.play(s, 'cover', 'route').ok, false);
assert(E.play(s, 'ramp', 'crossing').ok);
assert(E.play(s, 'ease').ok);
E.tick(s, 60);
assert(s.flags.routeCovered);
assert.equal(s.plots.route.status, 'complete');
assert.equal(s.staffUsed, 0);
assert.equal(s.issues.find(i => i.id === 'route').status, 'resolved');
assert(E.play(s, 'corner', 'void').ok);
assert(E.play(s, 'appeal').ok);
E.tick(s, 45);
assert.equal(s.staffUsed, 1);
assert(s.flags.appealReviewed);
assert.equal(s.issues.find(i => i.id === 'noise').status, 'resolved');
assert.equal(s.issues.find(i => i.id === 'housing').status, 'resolved');
assert(E.play(s, 'event').ok);
E.tick(s, 20);
assert.equal(s.staffUsed, 1);
assert(s.issues.filter(i => i.status === 'open').length <= 3);
E.tick(s, 100);
assert.equal(s.outcome, 'win');
console.log('PASS winning path and temporary/persistent staff');

s = E.create();
E.tick(s, 2000);
assert.equal(s.outcome, 'lose');
console.log('PASS neglect causes staged decline and failure');

s = E.create();
assert(E.play(s, 'ease').ok);
E.tick(s, 60);
assert(!s.flags.routeCovered);
assert.equal(s.issues.find(i => i.id === 'route').status, 'open');
console.log('PASS EASE does not resolve the exposed outdoor route');

s = E.create();
assert(E.play(s, 'cca', 'garden').ok);
assert.equal(E.play(s, 'child', 'garden').ok, false);
assert.equal(s.staffUsed, 3);
E.tick(s, 110);
assert.equal(s.staffUsed, 3);
assert.equal(s.plots.garden.status, 'complete');
console.log('PASS exclusive land and continuous service staffing');

function reachPetition() {
  const state = E.create();
  state.issues.forEach(i => { i.status = 'resolved'; });
  E.tick(state, 181);
  state.issues.forEach(i => { if (i.id !== 'petition') i.status = 'resolved'; });
  E.tick(state, 1);
  return state;
}
s = reachPetition();
assert(E.choose(s, 'petition', 'startvote').ok);
E.tick(s, 1);
assert.equal(s.vote.support, 58);
s.trust = 100;
assert.equal(s.vote.support, 58);
assert.equal(E.available(s, 'nrp').ok, false);
assert(E.choose(s, 'ballot', 'meeting').ok);
assert.equal(s.vote.support, 70);
assert(E.choose(s, 'ballot', 'door').ok);
assert(s.vote.approved);
assert(E.play(s, 'nrp').ok);
assert.equal(E.choose(s, 'ballot', 'door').ok, false);
assert.equal(E.available(s, 'child', 'locked').ok, false);
console.log('PASS independent 75 percent vote and duplicate-action guards');

s = reachPetition();
assert(E.choose(s, 'petition', 'defer').ok);
assert.equal(s.issues.find(i => i.id === 'petition').status, 'resolved');
E.tick(s, 60);
assert.equal(s.issues.filter(i => i.id === 'petition').length, 1);
assert.equal(s.issues.find(i => i.id === 'petition').status, 'open');
assert(E.choose(s, 'petition', 'startvote').ok);
assert.equal(new Set(s.issues.map(i => i.id)).size, s.issues.length);
console.log('PASS deferred petition reopens without duplicate ids and remains actionable');
console.log('All engine checks passed.');
