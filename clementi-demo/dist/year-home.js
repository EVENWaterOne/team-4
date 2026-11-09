/* Annual-game interiors: six walkable homes with ten objects each. Each object has a short
 * observation and a family story the resident tells when asked. Forked from home-exploration.js
 * so the archived campaign builds keep their original four-object rooms. Same CM_HOME API. */
(function (root) {
  'use strict';
  const doc = root.document, TILE = 40, WIDTH = 14, HEIGHT = 9, DOOR = [6, 8], ENTRY = [6, 7];
  const DIRECTIONS = [[0,-1],[1,0],[0,1],[-1,0]];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy = value => JSON.parse(JSON.stringify(value));
  const content = () => root.CM_YEAR_CONTENT;
  let active = null, serial = 0, listening = false;
  const language = () => (active?.hooks.getLanguage?.() || root.CM_I18N?.getLanguage?.()) === 'en' ? 'en' : 'zh';
  const w = (zh, en) => language() === 'en' ? en : zh;
  const rooms = {}, roomData = new Map();
  function build() {
    const homes = content()?.homes || {};
    for (const [id, home] of Object.entries(homes)) {
      if (rooms[id]) continue;
      const props = home.props.map((p, index) => ({ ...p, id: id + '-' + p.kind + '-' + index }));
      const resident = home.resident || [8, 4];
      const walkable = new Uint8Array(WIDTH * HEIGHT);
      for (let y = 1; y < HEIGHT - 1; y++) for (let x = 1; x < WIDTH - 1; x++) {
        if (x === resident[0] && y === resident[1]) continue;
        if (!props.some(p => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height)) walkable[y * WIDTH + x] = 1;
      }
      walkable[DOOR[1] * WIDTH + DOOR[0]] = 1;
      rooms[id] = { ...home, props, resident };
      roomData.set(id, { walkable, propIds: new Set(props.map(p => p.id)) });
    }
  }
  function config(id) { build(); if (!rooms[id]) throw new Error('Unknown Clementi home.'); return rooms[id]; }
  function yearOf(state) { return Math.max(1, Math.min(10, Number(state?.year) || 1)); }
  function propText(state, id, item, lang = language()) { return content().propText(id, item, yearOf(state), lang); }
  function layout(id) { const room = config(id); return copy({ width: WIDTH, height: HEIGHT, door: DOOR, entry: ENTRY, resident: room.resident, person: room.resident, props: room.props }); }
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const distance = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  function free(id, x, y) {
    config(id); if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return false;
    return roomData.get(id).walkable[y * WIDTH + x] === 1;
  }
  function record(state, id) {
    config(id); if (!state.homeExplorations || typeof state.homeExplorations !== 'object' || Array.isArray(state.homeExplorations)) state.homeExplorations = {};
    let saved = state.homeExplorations[id];
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) || saved.layout !== 'six-homes-v1') saved = state.homeExplorations[id] = { layout: 'six-homes-v1', position: ENTRY.slice(), seen: [] };
    if (!Array.isArray(saved.position) || !free(id, saved.position[0], saved.position[1]) || same(saved.position, DOOR)) saved.position = ENTRY.slice();
    const valid = roomData.get(id).propIds; saved.seen = [...new Set((Array.isArray(saved.seen) ? saved.seen : []).filter(v => valid.has(v)))];
    return saved;
  }
  function heard(state, id) {
    config(id); if (!state.homeStories || typeof state.homeStories !== 'object' || Array.isArray(state.homeStories)) state.homeStories = {};
    const valid = roomData.get(id).propIds, list = Array.isArray(state.homeStories[id]) ? state.homeStories[id] : [];
    state.homeStories[id] = [...new Set(list.filter(v => valid.has(v)))];
    return state.homeStories[id];
  }
  function markHeard(state, id, propId) { const list = heard(state, id); if (!roomData.get(id).propIds.has(propId)) return false; if (!list.includes(propId)) list.push(propId); if (active?.id === id && active.state === state) paint(true); return true; }
  function storyCount(state, id) { return { heard: heard(state, id).length, total: config(id).props.length }; }
  function propById(state, id, propId, lang = language()) { const item = config(id).props.find(p => p.id === propId); if (!item) return null; return { id: item.id, kind: item.kind, keys: item.keys.slice(), hints: item.hints.slice(), ...propText(state, id, item, lang) }; }
  function findMentioned(state, id, question, lang = language()) {
    const text = String(question || '').toLowerCase(); if (!text) return null;
    // Latin keys must match whole words ("fan" is not "fantastic"); CJK keys match as substrings.
    const hit = key => { const k = String(key || '').toLowerCase().trim(); if (!k) return false; if (!/[a-z]/.test(k)) return text.includes(k); return new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?([^a-z]|$)').test(text); };
    for (const item of config(id).props) { const info = propText(state, id, item, lang); if (hit(info.name) || item.keys.some(hit)) return item.id; }
    return null;
  }
  function hintProps(state, id, caseKey, lang = language()) { return config(id).props.filter(p => content().hintsFor(caseKey, p)).map(p => ({ id: p.id, name: propText(state, id, p, lang).name })); }
  function path(id, from, to, adjacent = false) {
    config(id); if (!Array.isArray(from) || !Array.isArray(to) || !free(id, ...from)) return null;
    const goals = new Set(), key = (x, y) => x + ',' + y;
    if (!adjacent && free(id, to[0], to[1])) goals.add(key(...to));
    if (adjacent || !goals.size) for (const [dx, dy] of DIRECTIONS) if (free(id, to[0] + dx, to[1] + dy)) goals.add(key(to[0] + dx, to[1] + dy));
    if (goals.has(key(...from))) return [];
    const queue = [from], previous = new Map([[key(...from), null]]);
    for (let head = 0; head < queue.length; head++) { const at = queue[head]; for (const [dx, dy] of DIRECTIONS) { const next = [at[0] + dx, at[1] + dy], k = key(...next); if (previous.has(k) || !free(id, ...next)) continue; if (same(next, DOOR) && !goals.has(k)) continue; previous.set(k, at); if (goals.has(k)) { const out = []; for (let node = next; node && !same(node, from); node = previous.get(key(...node))) out.unshift(node); return out; } queue.push(next); } }
    return null;
  }
  function move(state, id, dx, dy) {
    if (!DIRECTIONS.some(d => d[0] === dx && d[1] === dy)) return { ok: false };
    const saved = record(state, id), next = [saved.position[0] + dx, saved.position[1] + dy]; if (!free(id, ...next)) return { ok: false, position: copy(saved.position) };
    saved.position = next; return { ok: true, position: copy(next), exit: same(next, DOOR) };
  }
  function evidence(state, id, lang = 'zh') {
    const room = config(id), seen = state?.homeExplorations?.[id]?.layout === 'six-homes-v1' ? state.homeExplorations[id].seen || [] : [], told = Array.isArray(state?.homeStories?.[id]) ? state.homeStories[id] : [];
    return { householdId: id, observations: room.props.filter(p => seen.includes(p.id) || told.includes(p.id)).map(p => { const t = propText(state, id, p, lang); return { id: p.id, name: t.name, description: t.look, look: t.look, heard: told.includes(p.id), ...(told.includes(p.id) ? { story: t.story } : {}) }; }) };
  }
  const rect = (x, y, width, height, fill) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
  const pack = () => root.CM_ART_PACK || {};
  const packedImage = (src, x, y, w, h) => `<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" style="image-rendering:auto"/>`;
  // A figure stands on its tile: feet at the tile's lower edge, wider pairs a little shorter.
  function figureBox(fig) { const h = fig.w / fig.h > .8 ? 58 : 64, w = Math.round(fig.w * h / fig.h); return { x: Math.round(TILE / 2 - w / 2), y: TILE - 3 - h, w, h }; }
  function furniture(p) {
    const art = pack().props?.[p.id];
    if (art) return packedImage(art, 0, 0, p.width * TILE, p.height * TILE);
    return drawnFurniture(p);
  }
  function drawnFurniture(p) {
    const W = p.width * TILE, H = p.height * TILE, r = rect;
    switch (p.kind) {
      case 'bed': return r(4,5,W-8,H-9,'#715c55')+r(7,7,W-14,H-15,'#e8dcc2')+r(9,10,W-18,15,'#fcf0d2')+r(8,30,W-16,H-38,'#789b99')+r(12,34,7,H-46,'#94b5a8');
      case 'altar': return r(4,20,W-8,17,'#6e3529')+r(2,15,W-4,6,'#9c4a35')+r(8,24,W-16,3,'#c9a45c')+r(13,3,10,12,'#f1e6cf')+r(15,1,6,3,'#f1e6cf')+r(W/2-7,9,14,6,'#c9a45c')+r(W/2-4,2,1,7,'#5b4a3a')+r(W/2,1,1,8,'#5b4a3a')+r(W/2+3,3,1,6,'#5b4a3a')+r(W-22,6,9,9,'#d24b3a')+r(W-20,4,5,2,'#f3c46b');
      case 'radio': return r(5,9,30,25,'#8a5a3a')+r(8,12,17,19,'#cfae7d')+[14,18,22,26].map(y=>r(9,y,15,1,'#8a6a48')).join('')+r(28,14,4,4,'#3e3026')+r(28,22,4,4,'#3e3026');
      case 'sewing': return r(4,22,W-8,6,'#8a6650')+r(8,28,4,10,'#4c3b31')+r(W-12,28,4,10,'#4c3b31')+r(16,8,34,14,'#2c2f36')+r(16,8,8,18,'#2c2f36')+r(44,6,8,6,'#2c2f36')+r(20,11,24,3,'#d9b45a')+r(W-22,12,10,10,'#e6dcc8');
      case 'fan': return r(18,22,4,12,'#7d8a8f')+r(11,33,18,4,'#5f6b70')+r(7,3,26,20,'#cfd8d6')+r(10,6,20,14,'#9fb3b5')+r(18,11,4,4,'#4d5b60')+r(13,8,4,3,'#cfd8d6')+r(23,15,4,3,'#cfd8d6');
      case 'calendar': return r(5,5,W-10,H-10,'#8a6a50')+r(8,8,W-16,H-16,'#efe4c9')+r(10,10,W-20,5,'#c0533f')+Array.from({length:Math.floor((W-20)/9)},(_,i)=>r(12+i*9,20,5,4,i%3?'#879b9e':'#c0533f')+r(12+i*9,27,5,3,'#879b9e')).join('');
      case 'board': return r(4,4,W-8,H-8,'#9aa6ad')+r(7,7,W-14,H-14,'#f7f4ec')+r(11,11,W-30,2,'#3f6f9a')+r(11,17,W-40,2,'#c0533f')+r(11,23,W-26,2,'#3f6f9a')+r(W-16,9,6,4,'#e3b54b');
      case 'photo': return r(7,7,27,27,'#705d50')+r(10,10,21,21,'#e9dcc0')+r(12,22,17,7,'#b8a68c')+r(13,14,5,8,'#8b7a66')+r(21,15,6,7,'#8b7a66')+(p.width>1?r(42,7,W-49,27,'#705d50')+r(45,10,W-55,21,'#f0ddb3')+r(48,18,8,9,'#c24b45')+r(58,18,8,9,'#5b7a63')+r(46,27,W-58,3,'#d9b45a'):'');
      case 'cane': return r(23,4,4,32,'#7a5a3e')+r(15,4,12,4,'#7a5a3e')+r(8,17,13,14,'#6d8f9a')+r(9,20,11,3,'#9fbfc6')+r(9,26,11,3,'#9fbfc6');
      case 'umbrella': return r(18,10,4,23,'#695d57')+r(11,7,18,6,'#d7b56d')+r(7,13,26,6,'#c4a368')+r(20,29,8,4,'#695d57');
      case 'pills': return r(5,17,30,13,'#ece5d3')+[0,1,2,3,4,5,6].map(i=>r(7+i*4,19,3,9,['#e07a5f','#f2cc8f','#81b29a','#e07a5f','#f2cc8f','#81b29a','#e07a5f'][i])).join('')+r(9,6,20,10,'#c9473b')+r(11,8,10,2,'#f3d27a');
      case 'kettle': return r(4,9,32,27,'#3f4149')+r(4,5,32,27,'#aa8262')+r(7,8,26,21,'#d5b88b')+r(11,13,14,13,'#f0e2bd')+r(24,16,6,7,'#715f4d')+r(14,10,9,3,'#d9c69e')+r(11,26,20,3,'#715f4d');
      case 'rattan': return r(10,6,W-20,H-26,'#b98a54')+r(14,10,W-28,H-34,'#d4ab72')+[16,24,32,40,48].map(y=>r(14,y,W-28,2,'#b98a54')).join('')+r(6,30,10,H-40,'#a8783f')+r(W-16,30,10,H-40,'#a8783f')+r(14,H-28,W-28,12,'#7c9a7f')+r(14,H-16,5,10,'#8a6236')+r(W-19,H-16,5,10,'#8a6236');
      case 'cap': return r(8,8,22,11,'#2f4a66')+r(5,17,26,5,'#22384f')+r(16,10,6,4,'#e9c46a')+r(27,22,10,14,'#b38a3e')+r(29,24,6,6,'#f0d48a');
      case 'mat': return r(5,13,30,18,'#7b3f61')+r(8,16,24,12,'#9b5578')+r(12,18,16,8,'#d9b24c')+r(18,15,4,3,'#d9b24c')+r(5,31,30,4,'#5c2e48');
      case 'game': return r(5,7,30,26,'#6b4b33')+Array.from({length:16},(_,i)=>r(7+(i%4)*6.5,9+Math.floor(i/4)*5.5,6,5,(i+Math.floor(i/4))%2?'#e7d4a8':'#8a5a3a')).join('')+r(11,10,3,3,'#f4f0e6')+r(24,25,3,3,'#2a2a2a');
      case 'deco': return [[10,6],[24,6],[17,18]].map(([x,y])=>r(x,y+4,8,8,'#6f9a4a')+r(x+2,y+2,4,12,'#6f9a4a')+r(x-2,y+6,12,4,'#6f9a4a')+r(x+3,y+6,2,4,'#e7c95a')).join('')+r(6,30,12,6,'#c94f4f')+r(20,30,14,6,'#e0b44c');
      case 'boxes': return r(5,10,W-10,23,'#b58f63')+r(8,7,W-16,7,'#dbc08c')+r(W/2-2,9,4,24,'#e4ce9d')+r(9,18,10,5,'#f4ead2');
      case 'fridge': return r(8,2,24,36,'#e3e8e5')+r(8,16,24,2,'#b9c2c0')+r(28,6,2,8,'#8f9a98')+r(28,20,2,10,'#8f9a98')+r(11,5,5,5,'#e07a5f')+r(18,7,6,4,'#5f9697')+r(12,21,6,6,'#e9c06b')+r(20,24,5,5,'#81b29a')+r(13,30,8,4,'#cd8a66');
      case 'toys': { let a = r(5,10,W-10,H-15,'#ab8567')+r(10,14,12,11,'#5f9697')+r(26,15,9,12,'#cd8a66')+r(14,27,13,8,'#e9c06b'); if (W > 40) a += r(44,18,15,18,'#d4af6e')+r(61,15,10,12,'#8ca99c'); if (H > 40) a += r(14,48,20,14,'#5f9697')+r(44,46,22,18,'#e07a5f')+r(48,50,6,6,'#f4ead2'); if (W===40&&H===40) a += r(15,4,10,8,'#8ca99c')+r(17,0,6,5,'#c0533f'); return a; }
      case 'keys': return r(9,8,22,3,'#7d6a55')+r(12,11,2,8,'#c9a45c')+r(19,11,2,10,'#c9a45c')+r(26,11,2,7,'#c9a45c')+r(9,19,7,5,'#e3b54b')+r(17,21,6,4,'#d0d6d4')+r(24,18,7,13,'#c46a54')+r(25,20,2,2,'#f4ead2')+r(28,20,2,2,'#f4ead2')+r(25,24,2,2,'#f4ead2')+r(28,24,2,2,'#f4ead2');
      case 'pole': return r(0,9,W,4,'#c8b06a')+r(0,9,W,1,'#e3cf8c')+r(6,13,9,11,'#e07a5f')+r(18,13,7,8,'#f4ead2')+r(28,13,8,13,'#5f9697')+r(4,24,4,10,'#7d8a8f');
      case 'laptop': return r(4,22,W-8,6,'#8a6650')+r(8,28,4,10,'#5c4636')+r(W-12,28,4,10,'#5c4636')+r(22,5,30,17,'#38434e')+r(25,8,24,12,'#7fb0bb')+r(18,20,38,3,'#a6adb3')+r(W-20,10,12,12,'#f0e4c5')+r(W-18,13,8,1,'#7d8a8f')+r(W-18,16,8,1,'#7d8a8f');
      case 'basket': return r(13,4,14,3,'#8f9a98')+r(12,4,2,10,'#8f9a98')+r(26,4,2,10,'#8f9a98')+r(9,12,22,7,'#cfd6d4')+r(9,19,22,1,'#8f9a98')+r(9,20,22,7,'#bfc8c6')+r(9,27,22,1,'#8f9a98')+r(9,28,22,7,'#cfd6d4');
      case 'medkit': return r(6,12,28,21,'#d8473f')+r(6,12,28,4,'#b8382f')+r(17,17,6,13,'#f6f1e6')+r(13,21,14,5,'#f6f1e6')+r(15,7,10,5,'#9c2e27');
      case 'stroller': return r(9,8,22,6,'#6c9494')+r(12,16,16,13,'#8cac9f')+r(8,29,5,5,'#394d5d')+r(28,29,5,5,'#394d5d')+r(29,7,4,21,'#536674');
      case 'bag': return r(10,9,20,25,'#4f7fa8')+r(12,7,16,4,'#3c6588')+r(13,20,14,10,'#6d9ac0')+r(17,23,6,2,'#e3b54b')+r(8,12,3,16,'#3c6588')+r(29,12,3,16,'#3c6588')+r(22,4,8,6,'#f2e8cf');
      case 'lamp': return r(14,30,12,6,'#b9893a')+r(18,14,4,16,'#c99a45')+r(10,10,20,5,'#d9aa52')+r(12,8,16,3,'#b9893a')+r(18,3,4,6,'#f2b84b')+r(19,1,2,3,'#fbe0a0');
      case 'tv': return r(4,6,32,22,'#262c33')+r(7,9,26,16,'#6f9aa5')+r(10,13,8,8,'#d9b45a')+r(20,16,10,5,'#9cc2b0')+r(16,28,8,4,'#3a4048')+r(10,32,20,3,'#3a4048');
      case 'kolam': return r(3,3,34,34,'#c2ab8c')+r(18,6,4,28,'#f6f1e6')+r(6,18,28,4,'#f6f1e6')+r(10,10,4,4,'#f6f1e6')+r(26,10,4,4,'#f6f1e6')+r(10,26,4,4,'#f6f1e6')+r(26,26,4,4,'#f6f1e6')+r(17,17,6,6,'#e07a5f');
      case 'wheelchair': return r(12,10,14,14,'#4d6b7a')+r(12,6,3,18,'#6f8a96')+r(6,22,16,16,'#2f3a44')+r(9,25,10,10,'#8a9aa3')+r(26,30,7,7,'#2f3a44')+r(22,22,10,3,'#6f8a96');
      case 'uniform': return r(19,2,2,5,'#7d8a8f')+r(10,6,20,3,'#7d8a8f')+r(9,9,22,14,'#f2f0e8')+r(6,9,4,9,'#f2f0e8')+r(30,9,4,9,'#f2f0e8')+r(18,10,4,12,'#c9d3d6')+r(11,12,5,4,'#c0533f')+r(11,23,8,13,'#3a4a5e')+r(21,23,8,13,'#3a4a5e');
      case 'guitar': return r(18,2,4,20,'#5a3e2b')+r(17,0,6,4,'#3b2a1e')+r(10,20,20,10,'#c2803f')+r(8,26,24,11,'#c2803f')+r(17,26,6,5,'#3b2a1e')+r(19,22,2,14,'#e8d9b5');
      case 'desk': return r(4,22,W-8,6,'#8a6650')+r(8,28,4,10,'#5c4636')+r(W-12,28,4,10,'#5c4636')+r(10,10,22,12,'#e9e2cf')+r(12,12,8,8,'#c0533f')+r(22,12,8,8,'#3f6f9a')+r(38,6,26,16,'#38434e')+r(41,9,20,10,'#7fb0bb')+r(W-14,14,7,8,'#a0704f');
      case 'cooker': return r(6,14,18,20,'#f1eee6')+r(8,11,14,4,'#d9d4c8')+r(12,22,6,3,'#c0533f')+r(26,10,10,8,'#e07a5f')+r(26,19,10,8,'#e9c06b')+r(26,28,10,7,'#5f9697');
      case 'headphones': return r(9,9,22,5,'#334d62')+r(7,12,6,16,'#31495d')+r(27,12,6,16,'#31495d')+r(13,15,14,10,'#d6bd93');
      case 'shoes': return r(6,19,13,10,'#88705c')+r(22,15,12,11,'#566d76')+r(6,28,14,3,'#dcc297')+r(22,25,13,3,'#dcc297')+r(8,6,24,4,'#7d6a55');
      case 'bike': return r(3,20,14,14,'#2f3a44')+r(6,23,8,8,'#c2ab8c')+r(23,20,14,14,'#2f3a44')+r(26,23,8,8,'#c2ab8c')+r(10,18,20,3,'#c0533f')+r(16,10,3,10,'#c0533f')+r(13,9,8,3,'#2f3a44')+r(27,8,3,13,'#7d8a8f')+r(25,7,7,3,'#2f3a44');
      case 'clock': return r(7,7,26,27,'#627c86')+r(10,10,20,20,'#eadfbe')+r(19,13,3,10,'#3d5264')+r(20,20,7,3,'#3d5264');
      case 'curtains': return r(4,5,W-8,27,'#d2bc8e')+r(9,10,W-18,19,'#8ca8ad')+r(6,6,16,30,'#3f5566')+r(W-22,6,16,30,'#3f5566')+r(4,3,W-8,4,'#7d6a55');
      case 'plant': return r(4,20,14,14,'#b86b45')+r(22,22,14,12,'#c97b52')+r(6,8,4,12,'#5f8f4e')+r(10,4,5,10,'#6fa35a')+r(2,12,6,6,'#6fa35a')+r(27,10,3,12,'#5f8f4e')+r(24,12,4,4,'#d8473f')+r(31,14,4,4,'#d8473f')+r(26,17,3,3,'#d8473f');
      case 'cards': return r(5,16,30,18,'#c2ab8c')+r(5,16,30,3,'#a88f6d')+r(8,8,10,12,'#f6f1e6')+r(16,6,10,13,'#e9c06b')+r(24,9,9,11,'#9cc2b0')+r(11,11,4,3,'#c0533f');
      case 'badge': return r(19,2,2,14,'#3f6f9a')+r(13,2,2,12,'#3f6f9a')+r(25,2,2,12,'#3f6f9a')+r(11,15,18,20,'#f6f1e6')+r(11,15,18,5,'#3f6f9a')+r(14,22,6,7,'#b8a68c')+r(22,23,5,2,'#7d8a8f')+r(22,27,5,2,'#7d8a8f');
      case 'lunchbox': return r(8,24,24,10,'#81b29a')+r(8,24,24,2,'#5f8f7a')+r(9,15,22,9,'#f2cc8f')+r(9,15,22,2,'#d9ae6a')+r(10,6,20,9,'#e07a5f')+r(10,6,20,2,'#b8593f');
      case 'folders': default: return r(4,9,W-8,H-13,'#3f4149')+r(4,5,W-8,H-13,'#aa8262')+r(7,8,W-14,H-19,'#d5b88b')+r(12,11,W-24,15,'#efe3c8')+r(15,14,Math.max(8,W-33),2,'#79949a')+r(15,20,Math.max(6,W-40),2,'#b29470');
    }
  }
  function player() { const fig = pack().player; if (fig) { const b = figureBox(fig); return packedImage(fig.src, b.x, b.y, b.w, b.h); } return rect(13,-1,14,5,'#253a4a')+rect(12,4,16,13,'#d6a681')+rect(10,18,20,16,'#d8bf80')+rect(7,20,5,12,'#b58c6e')+rect(28,20,5,12,'#b58c6e')+rect(12,34,6,6,'#344b60')+rect(23,34,6,6,'#344b60')+rect(15,8,3,2,'#263744')+rect(23,8,3,2,'#263744'); }
  function residentArt(id) {
    const fig = pack().figures?.[id];
    if (fig) { const b = figureBox(fig); return packedImage(fig.src, b.x, b.y, b.w, b.h); }
    const portrait = root.CM_ART?.portrait?.(id);
    if (portrait) return portrait.replace(/<svg\b[^>]*>/, '<svg x="3" y="-17" width="34" height="52" viewBox="0 0 72 72" aria-hidden="true" shape-rendering="crispEdges">');
    return rect(12,0,16,7,'#3a4653')+rect(12,7,16,12,'#d5ae89')+rect(9,20,22,18,'#72918a');
  }
  function residentHalo(id) {
    const fig = pack().figures?.[id];
    if (!fig) return '<rect class="cm-home-person-halo" x="0" y="-3" width="40" height="43" rx="2"/>';
    const b = figureBox(fig);
    return `<ellipse class="cm-home-person-halo is-ground" cx="${TILE / 2}" cy="${TILE - 4}" rx="${Math.max(17, b.w / 2 + 5)}" ry="7"/><rect class="cm-home-person-hit" x="${Math.min(0, b.x - 2)}" y="${b.y - 2}" width="${Math.max(TILE, b.w + 4)}" height="${TILE - b.y + 2}" fill="transparent"/>`;
  }
  function mapMarkup(id, state) {
    const room = config(id); let tiles = '';
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const door = same([x, y], DOOR), wall = x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1;
      if (wall && !door) tiles += rect(x*TILE,y*TILE,TILE,TILE,'#354d5d') + rect(x*TILE,y*TILE,TILE,5,'#748a8b');
      else tiles += `<g data-home-tile="${x},${y}" role="button" tabindex="-1" aria-label="${esc(door ? w('出门','Leave the home') : w('走到地板','Walk to floor tile') + ' ' + x + ',' + y)}">${rect(x*TILE,y*TILE,TILE,TILE,door?'#ba9c67':(x+y)%2?'#c9b394':'#d2bea0')}${rect(x*TILE,y*TILE,TILE,1,'#b29f86')}${door?`<path d="M${x*TILE+20} ${y*TILE+11}v17m-6-6 6 6 6-6" stroke="#3d5060" stroke-width="3" fill="none"/>`:''}</g>`;
    }
    const rug = `<g class="cm-home-rug" pointer-events="none"><rect x="${3*TILE+8}" y="${3*TILE+8}" width="${8*TILE-16}" height="${4*TILE-16}" fill="${room.rug||'#b98f7a'}" opacity=".55"/><rect x="${3*TILE+14}" y="${3*TILE+14}" width="${8*TILE-28}" height="${4*TILE-28}" fill="none" stroke="#f3e5c6" stroke-opacity=".45" stroke-width="2"/></g>`;
    const told = state ? heard(state, id) : [];
    const props = room.props.map(p => { const info = state ? propText(state, id, p) : { name: p.name[language()] }; return `<g class="cm-home-prop${told.includes(p.id)?' is-heard':''}" data-home-prop="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(w('观察：','Inspect: ') + info.name)}" transform="translate(${p.x*TILE} ${p.y*TILE})">${furniture(p)}<rect class="cm-home-object-ring" x="2" y="2" width="${p.width*TILE-4}" height="${p.height*TILE-4}" rx="2"/><rect class="cm-home-story-dot" x="${p.width*TILE-11}" y="3" width="8" height="8" rx="1"/><title>${esc(info.name)}</title></g>`; }).join('');
    const person = room.resident, personName = root.CM_COMMUNITY?.personas?.[id]?.name || root.CM_DATA?.residents.find(r => r.id === id)?.name || '';
    const personLabel = typeof personName === 'object' ? personName[language()] || personName.zh : personName;
    return `<svg id="cm-home-map" viewBox="0 0 ${WIDTH*TILE} ${HEIGHT*TILE}" role="group" aria-label="${esc(w('居民的房间：方向键或WASD走动，点击物件观察','Resident’s room: arrow keys or WASD to walk; select objects to inspect'))}" shape-rendering="crispEdges">${tiles}${rug}<g id="cm-home-route" class="cm-home-route" pointer-events="none"></g>${props}<g class="cm-home-resident" data-home-person="${esc(id)}" role="button" tabindex="0" aria-label="${esc(w('走近并交谈：','Approach and talk: ') + personLabel)}" transform="translate(${person[0]*TILE} ${person[1]*TILE})">${residentHalo(id)}${residentArt(id)}<title>${esc(w('点击，与住户交谈','Select to talk with the resident'))}</title></g><g id="cm-home-cursor" class="cm-home-cursor" pointer-events="none" visibility="hidden" aria-hidden="true"></g><g id="cm-home-player" class="cm-home-player" style="transform:translate(${ENTRY[0]*TILE}px,${ENTRY[1]*TILE}px)" aria-label="${esc(w('你，社区调查员','You, the community investigator'))}"><ellipse class="cm-home-you" cx="${TILE/2}" cy="${TILE-4}" rx="14" ry="5"/>${player()}</g><g id="cm-home-cursor-tag" class="cm-home-cursor-top" pointer-events="none" aria-hidden="true"></g></svg>`;
  }
  function counterHTML(state, id) { const c = storyCount(state, id); return `<span class="cm-home-stories" data-home-stories aria-label="${esc(w('已听到的家庭故事','Family stories heard'))} ${c.heard}/${c.total}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v15m0-15C8 3 5 3.5 3 4.5v14c2.5-1 5.5-1 9 1.5 3.5-2.5 6.5-2.5 9-1.5v-14C19 3.5 16 3 12 5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span>${esc(w('家庭故事','Family stories'))}</span><span class="cm-home-stories-count"><strong>${c.heard}</strong>/${c.total}</span></span>`; }
  // Ten bookmarks, one per object: a gold one for each story heard.
  function shelfHTML(state, id, fresh = []) {
    const told = heard(state, id);
    return `<div class="cm-home-shelf" data-home-shelf aria-label="${esc(w('已听到的家庭故事','Family stories heard'))} ${told.length}/${config(id).props.length}">${config(id).props.map(p => { const on = told.includes(p.id), name = propText(state, id, p).name; return `<span class="cm-home-bookmark${on ? ' is-heard' : ''}${on && fresh.includes(p.id) ? ' is-new' : ''}" title="${esc(on ? name : w('还没听过的故事','A story not heard yet'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16l-5-3.5L7 20z"/></svg>${on ? `<span>${esc(shortName(name))}</span>` : ''}</span>`; }).join('')}</div>`;
  }
  const shortName = name => { const text = String(name || ''); if (language() === 'en') return text.replace(/^(the|a|an)\s+/i, '').split(/\s+(and|with|by|on|from|in|at|of)\s+/i)[0].slice(0, 18); return text.replace(/^.*的/, '').split('与')[0].slice(0, 5); };
  // Pictured controls on the room's top wall: walk, inspect, talk, keys.
  const ico = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    walk: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>',
    look: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
    talk: '<path d="M4.5 5.5h15v10h-8l-4 3v-3h-3z"/>',
    exit: '<path d="M12 4v13M6.5 11.5 12 17l5.5-5.5"/><path d="M5 20.5h14"/>',
    blocked: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'
  };
  function captionHTML() {
    const chip = (k, label) => `<span class="cm-home-tip is-${k}">${ico(ICONS[k])}<span>${esc(label)}</span></span>`;
    return `<div class="cm-home-caption" aria-hidden="true">${chip('walk', w('点地板走过去', 'Tap floor to walk'))}${chip('look', w('点物件，问故事', 'Tap things for stories'))}${chip('talk', w('点住户，聊天', 'Tap resident to talk'))}<span class="cm-home-tip is-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>Enter</kbd></span></div>`;
  }
  function panel(id, options = {}) {
    const room = config(id), state = options.state || null;
    const about = room.description[language()];
    return `<section id="cm-home-panel" class="cm-home-panel year-home-panel" data-home-resident="${esc(id)}" data-home-mode="years" data-i18n-ignore><div class="cm-home-heading"><div class="cm-home-title"><h3>${esc(room.title[language()])}</h3><p class="cm-home-intro" title="${esc(about)}">${esc(about)}</p></div>${state ? counterHTML(state, id) : ''}</div><div class="cm-home-board">${mapMarkup(id, state)}${captionHTML()}</div>${state ? shelfHTML(state, id) : ''}</section>`;
  }
  /* —— Tile cursor: gold brackets on what a tap would do, a dotted route from the player, a small tag ——
   * walk (floor) · look (object) · talk (resident) · exit (door) · blocked. With the keyboard, the thing
   * beside the player is bracketed instead and Enter acts on it. */
  const MAP_W = WIDTH * TILE, MAP_H = HEIGHT * TILE;
  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const textWidth = t => [...String(t)].reduce((n, c) => n + (/[⺀-鿿＀-￯]/.test(c) ? 11 : 6.3), 0);
  const tagName = name => { const t = String(name || ''); if (language() === 'en') { const short = t.replace(/^(the|a|an)\s+/i, ''); return short.length > 20 ? short.slice(0, 19) + '…' : short; } return t.length > 9 ? t.slice(0, 8) + '…' : t; };
  function personBox(id) { const r = config(id).resident, fig = pack().figures?.[id]; if (!fig) return [r[0] * TILE, r[1] * TILE - 3, TILE, TILE + 3]; const b = figureBox(fig), x = Math.min(0, b.x - 2), wd = Math.max(TILE, b.w + 4); return [r[0] * TILE + x, r[1] * TILE + b.y - 2, wd, TILE - b.y + 2]; }
  function propAt(id, x, y) { return config(id).props.find(p => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height) || null; }
  function propRoute(id, from, item) { let best = null; for (let y = item.y; y < item.y + item.height; y++) for (let x = item.x; x < item.x + item.width; x++) { const r = path(id, from, [x, y], true); if (r && (!best || r.length < best.length)) best = r; } return best; }
  function aimAt(node) {
    if (!valid() || !node) return null; const id = active.id, room = config(id), pos = record(active.state, id).position;
    if (node.dataset.homeProp) { const item = room.props.find(p => p.id === node.dataset.homeProp); if (!item) return null; const route = propRoute(id, pos, item); return { kind: route ? 'look' : 'blocked', box: [item.x * TILE, item.y * TILE, item.width * TILE, item.height * TILE], label: route ? tagName(propText(active.state, id, item).name) : w('走不到', 'Can’t reach'), route: route || [], stand: !!route }; }
    if (node.dataset.homePerson) { const route = path(id, pos, room.resident, true); return { kind: route ? 'talk' : 'blocked', box: personBox(id), label: route ? w('聊天', 'Talk') : w('走不到', 'Can’t reach'), route: route || [], stand: !!route }; }
    if (node.dataset.homeTile) {
      const [x, y] = node.dataset.homeTile.split(',').map(Number), box = [x * TILE, y * TILE, TILE, TILE];
      if (same([x, y], DOOR)) { const route = path(id, pos, DOOR); return { kind: route ? 'exit' : 'blocked', box, label: w('出门', 'Leave'), route: route || [] }; }
      if (same([x, y], pos)) return { kind: 'here', box, label: '', route: [] };
      const route = free(id, x, y) ? path(id, pos, [x, y]) : null;
      return route ? { kind: 'walk', box, label: '', route } : { kind: 'blocked', box, label: '', route: [] };
    }
    return null;
  }
  // The thing right beside the player, looked for in the direction last walked first.
  function nearAim() {
    if (!valid()) return null; const id = active.id, room = config(id), pos = record(active.state, id).position, f = active.facing || [0, -1];
    for (const [dx, dy] of [f, ...DIRECTIONS.filter(d => d[0] !== f[0] || d[1] !== f[1])]) {
      const x = pos[0] + dx, y = pos[1] + dy;
      if (same([x, y], room.resident)) return { kind: 'talk', key: true, box: personBox(id), label: 'Enter · ' + w('聊天', 'Talk'), route: [], act: { person: true } };
      const item = propAt(id, x, y); if (item) return { kind: 'look', key: true, box: [item.x * TILE, item.y * TILE, item.width * TILE, item.height * TILE], label: 'Enter · ' + tagName(propText(active.state, id, item).name), route: [], act: { prop: item.id } };
    }
    return null;
  }
  function cursorMarkup(a) {
    const [x, y, wd, ht] = a.box, X0 = x - 3, Y0 = y - 3, X1 = x + wd + 3, Y1 = y + ht + 3, L = Math.min(13, (X1 - X0) / 3, (Y1 - Y0) / 3);
    const d = `M${X0} ${Y0 + L}V${Y0}H${X0 + L}M${X1 - L} ${Y0}H${X1}V${Y0 + L}M${X1} ${Y1 - L}V${Y1}H${X1 - L}M${X0 + L} ${Y1}H${X0}V${Y1 - L}`;
    let out = `<rect class="cm-home-cursor-fill" x="${x}" y="${y}" width="${wd}" height="${ht}"/><g class="cm-home-cursor-brackets"><path class="cm-home-cursor-shade" d="${d}"/><path class="cm-home-cursor-line" d="${d}"/></g>`;
    if (a.kind === 'blocked') out += `<path class="cm-home-cursor-x" d="M${x + wd / 2 - 7} ${y + ht / 2 - 7}l14 14M${x + wd / 2 + 7} ${y + ht / 2 - 7}l-14 14"/>`;
    const icon = ICONS[a.kind] || '', label = a.label; let tag = '';
    if (label) {
      // Above the thing if that clears the top wall (where the control hints are), else below; never on the player.
      const tw = Math.round(textWidth(label) + (icon ? 30 : 14)), th = 19, tx = clampN(x + wd / 2 - tw / 2, 2, MAP_W - tw - 2), me = playerBox();
      const hits = ty => tx < me[0] + me[2] && tx + tw > me[0] && ty < me[1] + me[3] && ty + th > me[1];
      const above = Y0 - th - 4, below = Math.min(MAP_H - th - 2, Y1 + 4), wall = Math.max(2, above);
      const ty = [above >= TILE ? above : null, below, wall].find(v => v != null && !hits(v)) ?? (above >= TILE ? above : below);
      a.tagTop = ty < TILE;
      tag = `<g transform="translate(${Math.round(tx)} ${Math.round(ty)})"><g class="cm-home-cursor-tag"><rect width="${tw}" height="${th}" rx="4"/>${icon ? `<svg x="5" y="3" width="13" height="13" viewBox="0 0 24 24">${icon}</svg>` : ''}<text x="${icon ? 22 : 7}" y="13.5">${esc(label)}</text></g></g>`;
    }
    return { under: out, over: tag };
  }
  function playerBox() { const pos = record(active.state, active.id).position, fig = pack().player, b = fig ? figureBox(fig) : { x: 7, y: -1, w: 26, h: 41 }; return [pos[0] * TILE + b.x, pos[1] * TILE + b.y, b.w, b.h]; }
  function routeMarkup(points, a) {
    if (!points?.length) return ''; const last = points.length - 1;
    return points.map((pt, n) => { const cx = pt[0] * TILE + TILE / 2, cy = pt[1] * TILE + TILE / 2;
      if (n === last && a?.stand) return `<path class="cm-home-route-stand" d="M${cx} ${cy - 10}L${cx + 10} ${cy}L${cx} ${cy + 10}L${cx - 10} ${cy}Z" style="--i:${n}"/>`;
      if (n === last) return '';
      return `<rect class="cm-home-route-dot" x="${cx - 3.5}" y="${cy - 3.5}" width="7" height="7" style="--i:${n}"/>`; }).join('');
  }
  function drawAim(a, going = false) {
    const g = active?.nodes.cursor, routeNode = active?.nodes.route, top = active?.nodes.cursorTop; if (!g || !routeNode) return;
    const pos = record(active.state, active.id).position, key = a ? [a.kind, a.box.join(','), a.label, going, pos.join(','), active.trip ? active.trip.step : -1].join('|') : '';
    if (key === active.aimKey) return; active.aimKey = key; active.aim = a;
    if (!a) { g.setAttribute('visibility', 'hidden'); g.innerHTML = ''; routeNode.innerHTML = ''; if (top) top.innerHTML = ''; active.nodes.map?.parentNode?.classList?.remove('is-tag-top'); return; }
    const cls = 'is-' + a.kind + (a.key ? ' is-key' : '') + (going ? ' is-going' : ''), parts = cursorMarkup(a);
    g.setAttribute('class', 'cm-home-cursor ' + cls); g.innerHTML = parts.under; g.setAttribute('visibility', 'visible');
    if (top) { top.setAttribute('class', 'cm-home-cursor-top cm-home-cursor ' + cls); top.innerHTML = parts.over; }
    active.nodes.map?.parentNode?.classList?.toggle('is-tag-top', !!a.tagTop);
    const remaining = going && active.trip ? active.trip.points.slice(active.trip.step) : a.route;
    routeNode.setAttribute('class', 'cm-home-route' + (going ? ' is-going' : '') + ' is-' + a.kind); routeNode.innerHTML = routeMarkup(remaining, a);
  }
  function refreshAim() {
    if (!valid()) return;
    if (active.trip) { drawAim(active.trip.aim, true); return; }
    if (active.input === 'key') { drawAim(nearAim()); return; }
    drawAim(active.hoverNode && active.nodes.map?.contains(active.hoverNode) ? aimAt(active.hoverNode) : null);
  }
  function pointed(event) {
    if (!valid() || event.pointerType === 'touch') return; active.input = 'mouse';
    const node = event.target.closest?.('[data-home-prop],[data-home-person],[data-home-tile]') || null;
    if (node !== active.hoverNode) { active.hoverNode = node; refreshAim(); }
  }
  function leftMap() { if (!valid()) return; active.hoverNode = null; if (active.input === 'mouse') refreshAim(); }
  function valid() { return !!active && active.hooks.getState() === active.state && doc?.getElementById('cm-home-panel')?.dataset.homeResident === active.id && doc.getElementById('modal')?.open !== false; }
  function isActive(id) { return valid() && (!id || active.id === id); }
  function canTalk(id) { return isActive(id) && active.talking && distance(record(active.state, id).position, config(id).resident) === 1; }
  function observationHTML(item) {
    const info = propText(active.state, active.id, item), told = heard(active.state, active.id).includes(item.id);
    return `<span>${esc(info.name)}</span><p>${esc(info.look)}</p>${told ? `<details class="cm-home-story"><summary>${esc(w('听过的故事','The story you heard'))}</summary><p>${esc(info.story)}</p></details>` : ''}<button type="button" class="cm-home-ask" data-home-ask="${esc(item.id)}">${esc(told ? w('再问问这件事','Ask about it again') : w('问问这件事','Ask about this'))}</button>`;
  }
  function paint(force = false) {
    if (!valid()) return; const saved = record(active.state, active.id), sprite = active.nodes.sprite, transform = `translate(${saved.position[0]*TILE}px,${saved.position[1]*TILE}px)`;
    if (sprite && sprite.style.transform !== transform) sprite.style.transform = transform;
    const told = heard(active.state, active.id), key = saved.seen.join('\u0000') + '|' + told.join('\u0000');
    if (force || active.seenKey !== key) { for (const node of active.nodes.props) { node.classList.toggle('is-seen', saved.seen.includes(node.dataset.homeProp)); node.classList.toggle('is-heard', told.includes(node.dataset.homeProp)); } active.seenKey = key; const counter = doc.querySelector('#cm-home-panel [data-home-stories]'); if (counter) counter.outerHTML = counterHTML(active.state, active.id); const fresh = active.toldShown ? told.filter(x => !active.toldShown.includes(x)) : []; active.toldShown = told.slice(); const shelf = doc.querySelector('#cm-home-panel [data-home-shelf]'); if (shelf) shelf.outerHTML = shelfHTML(active.state, active.id, fresh); for (const node of active.nodes.props) if (fresh.includes(node.dataset.homeProp)) { node.classList.remove('is-heard-now'); node.getBoundingClientRect?.(); node.classList.add('is-heard-now'); } if (active.lastItem && active.nodes.observation && !active.nodes.observation.hidden) active.nodes.observation.innerHTML = observationHTML(active.lastItem); }
    refreshAim();
    const near = distance(saved.position, config(active.id).resident) === 1, status = active.nodes.status, message = near ? w('在你身旁','Beside you') : w('点击物件看看，问问背后的故事','Select objects and ask about their stories');
    if (status && status.textContent !== message) status.textContent = message;
  }
  function flush(visit = active) { if (!visit?.dirty) return; visit.dirty = false; if (visit.hooks.getState() === visit.state) visit.hooks.save?.(); }
  function unmount() { serial++; if (active?.timer) root.clearTimeout(active.timer); flush(); active = null; if (listening) { doc.removeEventListener?.('click', clicked); doc.removeEventListener?.('keydown', keyed); listening = false; } }
  function afterMove(persist = true) {
    if (!valid()) return; const current = active, saved = record(current.state, current.id); if (distance(saved.position, config(current.id).resident) !== 1) current.talking = false;
    current.dirty = true; root.CM_SOUND?.play?.('step'); paint(); current.hooks.onMove?.(current.id); if (persist) flush(current);
    if (same(saved.position, DOOR)) { const hooks = current.hooks; unmount(); hooks.onExit?.(); }
  }
  function walk(points, done) {
    if (!valid()) return; const visit = active, token = visit.serial; if (visit.timer) root.clearTimeout(visit.timer); visit.timer = null; flush(visit);
    if (points === null) { const status = doc.getElementById('cm-home-move-status'); if (status) status.textContent = w('这里走不过去，请换一条路。','That route is blocked. Try another way.'); return; }
    let step = 0; const sprite = visit.nodes.sprite; sprite?.classList?.add('is-walking');
    // Only a walk the player started by tapping keeps its target bracketed; walks the game starts (e.g. to talk) do not.
    const tapped = visit.tapAim; visit.tapAim = null;
    visit.trip = points.length && tapped && tapped.kind !== 'blocked' ? { points, step: 0, aim: tapped } : null;
    const arrive = () => { if (visit.trip) { visit.trip = null; visit.aimKey = null; } };
    function advance() { if (!valid() || active !== visit || visit.serial !== token) { sprite?.classList?.remove('is-walking'); arrive(); return; } if (step >= points.length) { visit.timer = null; sprite?.classList?.remove('is-walking'); arrive(); try { done?.(); } finally { flush(visit); refreshAim(); } return; } const next = points[step++], saved = record(visit.state, visit.id); if (!free(visit.id, ...next)) { sprite?.classList?.remove('is-walking'); arrive(); flush(visit); refreshAim(); return; } visit.facing = [next[0] - saved.position[0], next[1] - saved.position[1]]; saved.position = next; if (visit.trip) visit.trip.step = step; afterMove(false); if (valid() && active === visit) visit.timer = root.setTimeout(advance, 110); }
    advance();
  }
  function inspect(propId) {
    if (!valid()) return; const current = active, item = config(current.id).props.find(p => p.id === propId); if (!item) return;
    const options = []; for (let y = item.y; y < item.y + item.height; y++) for (let x = item.x; x < item.x + item.width; x++) { const route = path(current.id, record(current.state, current.id).position, [x, y], true); if (route) options.push(route); } options.sort((a, b) => a.length - b.length);
    walk(options[0] || null, () => {
      if (!valid() || active !== current) return; const saved = record(current.state, current.id); if (!saved.seen.includes(item.id)) { saved.seen.push(item.id); current.dirty = true; }
      const info = propText(current.state, current.id, item), observation = { id: item.id, name: info.name, description: info.look, question: w('能说说“' + info.name + '”的故事吗？', 'Could you tell me the story of the ' + info.name.replace(/^./, c => c.toLowerCase()) + '?') };
      current.lastItem = item; const box = active.nodes.observation; if (box) { box.hidden = false; box.innerHTML = observationHTML(item); }
      paint(); current.hooks.onObserve?.(current.id, observation);
    });
  }
  function approach() { if (!valid()) return; const current = active; walk(path(current.id, record(current.state, current.id).position, config(current.id).resident, true), () => { if (!valid() || active !== current) return; current.talking = true; paint(); current.hooks.onMove?.(current.id); current.hooks.onTalk?.(current.id); }); }
  function clicked(event) {
    if (!valid()) return; const target = event.target.closest?.('[data-home-step],[data-home-tile],[data-home-prop],[data-home-person],[data-home-exit],[data-home-ask]'); if (!target || !doc.getElementById('cm-home-panel').contains(target)) return;
    if (target.hasAttribute('data-home-exit')) { const hooks = active.hooks; unmount(); hooks.onExit?.(); return; }
    if (target.dataset.homeAsk) { const item = config(active.id).props.find(p => p.id === target.dataset.homeAsk); if (item) { const info = propText(active.state, active.id, item); active.hooks.onAsk?.(active.id, { id: item.id, name: info.name, question: w('能说说“' + info.name + '”的故事吗？', 'Could you tell me the story of the ' + info.name.replace(/^./, c => c.toLowerCase()) + '?') }); } return; }
    // A real tap brackets its target; the game's own synthetic clicks (walking over to talk) do not.
    if (event.isTrusted !== false && target.matches?.('[data-home-prop],[data-home-person],[data-home-tile]')) { const a = aimAt(target); active.input = 'mouse'; active.hoverNode = target; active.trip = null; active.aimKey = null; active.tapAim = a; drawAim(a); root.CM_SOUND?.play?.(a?.kind === 'blocked' ? 'bump' : a?.kind === 'look' ? 'look' : 'tap'); }
    if (target.dataset.homeProp) { inspect(target.dataset.homeProp); return; } if (target.dataset.homePerson) { approach(); return; }
    if (target.dataset.homeStep) { if (active.timer) root.clearTimeout(active.timer); active.timer = null; const [dx, dy] = target.dataset.homeStep.split(',').map(Number); if (move(active.state, active.id, dx, dy).ok) afterMove(); else flush(); return; }
    if (target.dataset.homeTile) { const destination = target.dataset.homeTile.split(',').map(Number); if (free(active.id, ...destination)) walk(path(active.id, record(active.state, active.id).position, destination)); }
  }
  function keyed(event) {
    if (!valid() || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""]')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      const target = event.target.closest?.('[data-home-prop],[data-home-person]'); if (target) { event.preventDefault(); clicked({ target }); return; }
      if (active.input === 'key' && !event.target.closest?.('button,a[href],summary,select')) { const near = nearAim(); if (near) { event.preventDefault(); if (near.act.person) approach(); else inspect(near.act.prop); } }
      return;
    }
    const dir = { ArrowUp:[0,-1], w:[0,-1], W:[0,-1], ArrowRight:[1,0], d:[1,0], D:[1,0], ArrowDown:[0,1], s:[0,1], S:[0,1], ArrowLeft:[-1,0], a:[-1,0], A:[-1,0] }[event.key]; if (!dir) return; event.preventDefault(); if (active.timer) root.clearTimeout(active.timer); active.timer = null; active.trip = null; active.input = 'key'; active.facing = dir; active.aimKey = null; if (move(active.state, active.id, ...dir).ok) afterMove(); else { flush(); refreshAim(); root.CM_SOUND?.play?.('bump'); }
  }
  function mount(id, hooks) {
    config(id); unmount(); const panelNode = doc?.getElementById('cm-home-panel'); if (!panelNode || panelNode.dataset.homeResident !== id) return;
    const state = hooks.getState();
    active = { id, state, hooks, yearMode: true, serial: ++serial, talking: false, timer: null, dirty: false, lastItem: null, input: null, hoverNode: null, aim: null, aimKey: null, trip: null, facing: [0, -1], nodes: { sprite: doc.getElementById('cm-home-player'), status: doc.getElementById('cm-home-move-status'), observation: doc.getElementById('cm-home-observation'), map: doc.getElementById('cm-home-map'), cursor: doc.getElementById('cm-home-cursor'), cursorTop: doc.getElementById('cm-home-cursor-tag'), route: doc.getElementById('cm-home-route'), props: [...panelNode.querySelectorAll?.('[data-home-prop]') || []] } };
    active.nodes.map?.addEventListener?.('pointermove', pointed); active.nodes.map?.addEventListener?.('pointerleave', leftMap);
    record(active.state, id); heard(active.state, id); paint(true); hooks.save?.();
    if (!listening) { doc.addEventListener('click', clicked); doc.addEventListener('keydown', keyed); listening = true; }
  }
  // The object the resident just mentioned glows until its story is heard.
  function hint(propId) { if (!valid()) return; for (const node of active.nodes.props) node.classList.toggle('is-hinted', !!propId && node.dataset.homeProp === propId); }
  root.CM_HOME = { panel, mount, unmount, isActive, canTalk, hint, evidence, layout, path, move, free, heard, markHeard, storyCount, propById, findMentioned, hintProps, propText: (state, id, propId, lang) => propById(state, id, propId, lang) };
})(typeof window !== 'undefined' ? window : globalThis);
