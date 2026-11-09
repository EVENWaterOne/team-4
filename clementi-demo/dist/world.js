/* Clementi's playable neighbourhood is an illustrative scene, not a cadastral map. */
(function (global) {
  'use strict';
  var C = { ink: '#244a49', dark: '#173d3b', paper: '#f6f0df', lawn: '#b9cc96', grass: '#8eb08b', coral: '#d98a77', pale: '#ead1b2', road: '#adb6ad', teal: '#6b9990' };
  var locations = {
    route: { x: 595, y: 510, name: '食阁—车站步行段', kind: 'route', note: '可沿路线改造' },
    void: { x: 395, y: 407, name: 'A 栋底层空间', kind: 'void', note: '可用公共空间' },
    room: { x: 663, y: 394, name: '社区空置房间', kind: 'room', note: '可用室内空间' },
    garden: { x: 296, y: 573, name: '街角花园地块', kind: 'large', note: '大地块 · 只能择一' },
    crossing: { x: 933, y: 418, name: '旧组屋出口与过街处', kind: 'crossing', note: '可作安全改造' },
    locked: { x: 1031, y: 610, name: '既有建筑与规划保留区', kind: 'locked', note: '规划锁定 · 不可建' }
  };
  var people = [
    { id: 'chen', name: '陈玉英', group: 'elders', x: 304, y: 396, shirt: '#bd775e', hair: '#d8ded2' },
    { id: 'rahman', name: '拉赫曼夫妇', group: 'owners', x: 484, y: 305, shirt: '#578b88', hair: '#c6c8b6' },
    { id: 'lin', name: '林家', group: 'families', x: 889, y: 275, shirt: '#d29954', hair: '#344a49' },
    { id: 'kumar', name: '库马尔一家', group: 'care', x: 695, y: 455, shirt: '#8189a5', hair: '#303d40' },
    { id: 'students', name: '合租学生', group: 'renters', x: 185, y: 361, shirt: '#6b9380', hair: '#393e3a' },
    { id: 'huang', name: '黄美兰', group: 'elders', x: 916, y: 564, shirt: '#d88d75', hair: '#45554a' },
    { id: 'zhang', name: '张叔', group: 'elders', x: 500, y: 602, shirt: '#7e9ca8', hair: '#d8ded2' },
    { id: 'ali', name: '阿丽', group: 'renters', x: 766, y: 574, shirt: '#c79894', hair: '#444b48' }
  ];
  // Extra natural spaces in the compatibility map. Main gameplay is the 3D
  // neighbourhood; both presentations share the same choices and occupancy.
  var extraPositions={'route-west':[420,492],'route-b':[735,558],'void-b':[543,367],'room-b':[198,428],'crossing-b':[595,643]};
  ((global.CM_DATA&&global.CM_DATA.plots)||[]).forEach(function(p){if(!locations[p.id]){var at=extraPositions[p.id]||[p.x,p.y];locations[p.id]={x:at[0],y:at[1],name:p.name,kind:p.kind,note:p.description};}});
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function point(x, y) { return x.toFixed(1) + ',' + y.toFixed(1); }
  function poly(p, fill, extra) { return '<polygon points="' + p.map(function (q) { return point(q[0], q[1]); }).join(' ') + '" fill="' + fill + '" ' + (extra || '') + '/>'; }
  function iso(x, y, w, d, h, colors) {
    var a = [x, y - h], b = [x + w * .866, y + w * .45 - h], c = [x + (w - d) * .866, y + (w + d) * .45 - h], e = [x - d * .866, y + d * .45 - h];
    return poly([[x - d * .866 + 10, y + d * .45 + 8], [x + (w - d) * .866 + 14, y + (w + d) * .45 + 9], [x + w * .866 + 11, y + w * .45 + 5], [x + 8, y + 4]], '#254b4921') +
      poly([a, b, [b[0], b[1] + h], [x, y]], colors[0], 'stroke="#38554a25" stroke-width="1"') +
      poly([b, c, [c[0], c[1] + h], [b[0], b[1] + h]], colors[1], 'stroke="#38554a25" stroke-width="1"') +
      poly([a, b, c, e], colors[2], 'stroke="#f9f4e0aa" stroke-width="1.2"') +
      poly([e, c, [c[0], c[1] + h], [e[0], e[1] + h]], colors[3] || colors[0], 'stroke="#38554a20" stroke-width="1"');
  }
  function block(x, y, w, d, h, palette, floors, label) {
    var out = iso(x, y, w, d, h, palette), rows = floors || 5, cols = Math.max(3, Math.floor(w / 18));
    // The visible long face recedes down and to the right.
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var base = 8 + col * (w - 16) / cols, xx = x + base * .866, yy = y + base * .45 - h + 13 + row * (h - 27) / rows;
        out += poly([[xx, yy], [xx + 8.7, yy + 4.5], [xx + 8.7, yy + 11.4], [xx, yy + 6.9]], (row + col) % 4 === 0 ? '#fff0bd' : '#52716b', 'opacity=".77"');
      }
    }
    // Open ground floor and a coloured vertical stairwell give HDB blocks their rhythm.
    out += '<path d="M' + (x + 4) + ' ' + (y - 10) + 'l' + ((w - 8) * .866) + ' ' + ((w - 8) * .45) + '" stroke="#e4e1cf" stroke-width="6"/>';
    if (label) out += '<text x="' + (x + w * .37) + '" y="' + (y - h + w * .22 - 5) + '" class="world-block-label" transform="rotate(27 ' + (x + w * .37) + ' ' + (y - h + w * .22 - 5) + ')">' + esc(label) + '</text>';
    return out;
  }
  function tree(x, y, size) {
    size = size || 1;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + size + ')"><ellipse cx="8" cy="3" rx="17" ry="7" fill="#3e695128"/><path d="M0 0v-21" stroke="#8b8161" stroke-width="5"/><path d="M0-12l-8-9m8 3 8-10" stroke="#8b8161" stroke-width="3"/><circle cx="-6" cy="-30" r="13" fill="#7eaa80"/><circle cx="7" cy="-34" r="14" fill="#a2bf88"/><circle cx="0" cy="-44" r="12" fill="#b6c891"/></g>';
  }
  function bench(x, y) { return '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 0l27 14m-25-20 27 14" stroke="#9a8164" stroke-width="5"/><path d="M2 2v7m23 4v7" stroke="#526d60" stroke-width="3"/></g>'; }
  function title(x, y, text, small) { return '<text x="' + x + '" y="' + y + '" class="' + (small ? 'world-small' : 'world-place-label') + '">' + esc(text) + '</text>'; }
  function chip(x, y, text, color, width) { return '<g transform="translate(' + x + ' ' + y + ')"><rect x="' + (-(width || 112) / 2) + '" y="-14" width="' + (width || 112) + '" height="25" rx="12.5" fill="#fffdf3" stroke="' + (color || '#829b7c') + '"/><text text-anchor="middle" y="3" class="world-chip" fill="' + (color || C.ink) + '">' + esc(text) + '</text></g>'; }
  function diamond(x, y, w, h, fill, extra) { return poly([[x, y - h / 2], [x + w / 2, y], [x, y + h / 2], [x - w / 2, y]], fill, extra); }
  function cardName(id) {
    var cards = (global.CM_DATA && global.CM_DATA.cards) || [];
    var card = cards.find(function (c) { return c.id === id; });
    return card ? card.title : ({ cover: '有盖走廊', ramp: '无障碍坡道', corner: '居民角', aac: '乐龄活动中心', cca: '社区关怀公寓', child: '托育与儿童设施', nrp: '邻里更新' }[id] || '社区设施');
  }
  function isDone(p) { return p && (p.status === 'complete' || p.status === 'completed'); }
  function plotOverlay(id, state, options) {
    var p = locations[id], value = (state.plots || {})[id] || {}, locked = id === 'locked', building = value.status === 'building' || value.status === 'construction', done = isDone(value), selected = options.selectedPlot === id;
    var name = done ? cardName(value.cardId) : building ? '施工中 · ' + Math.ceil(value.remaining || 0) + '秒' : locked ? p.note : p.note;
    var activeCard = ((global.CM_DATA && global.CM_DATA.cards) || []).find(function (c) { return c.id === options.selectingCard; });
    var allowed = activeCard && Array.isArray(activeCard.land) && activeCard.land.indexOf(id) >= 0 && !locked && !value.cardId;
    var stroke = selected ? '#d27458' : allowed ? '#2f8175' : locked ? '#949e92' : '#7e9c70';
    var out = '<g class="world-hit world-plot' + (allowed ? ' world-valid-plot' : '') + '" data-plot="' + id + '" tabindex="0" role="button" aria-label="' + esc(p.name + '，' + name + (allowed ? '，可放置所选设施' : '')) + '"><title>' + esc(p.name + '：' + name) + '</title>';
    if (id === 'route') {
      out += '<path d="M332 436L535 502L831 507" fill="none" stroke="' + stroke + '" stroke-width="' + (selected || allowed ? 24 : 18) + '" stroke-opacity=".17"/>';
      out += '<path d="M332 436L535 502L831 507" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-dasharray="' + (done ? '0' : '7 5') + '"/>';
    } else {
      var wide = id === 'garden' ? 164 : id === 'locked' ? 134 : 102, high = id === 'garden' ? 79 : 50;
      out += diamond(p.x, p.y, wide, high, locked ? 'url(#world-lock-hatch)' : building ? '#e8bc7c55' : done ? '#8bbba142' : '#fff5c866', 'stroke="' + stroke + '" stroke-width="' + (selected || allowed ? 3 : 1.8) + '" stroke-dasharray="' + (done || selected ? '0' : '6 5') + '"');
      if (locked) out += '<path d="M' + (p.x - 5) + ' ' + (p.y - 5) + 'v-5a5 5 0 0 1 10 0v5m-12 0h14v12h-14z" fill="#fffdf2" stroke="#74887e" stroke-width="2"/>';
      else if (!done && !building) out += '<path d="M' + (p.x - 6) + ' ' + p.y + 'h12m-6-6v12" stroke="' + stroke + '" stroke-width="2.5" stroke-linecap="round"/>';
    }
    if (building) {
      out += '<g transform="translate(' + p.x + ' ' + (p.y - 18) + ')"><path d="M-26 7v-40h45M-26-33l14-10h17M-2-33v15" stroke="#b58a56" stroke-width="3" fill="none"/><path d="M-32 7h19m-12-4 9-12m-9 2 9-12" stroke="#b58a56" stroke-width="2"/><rect x="-11" y="-14" width="22" height="16" rx="2" fill="#efc064"/><path d="M-6-10v8m6-8v8m6-8v8" stroke="#796749" stroke-width="2"/></g>';
    }
    out += chip(p.x, p.y + (id === 'route' ? 25 : id === 'garden' ? 52 : 36), building ? name : done ? name : p.name, stroke, id === 'garden' || building ? 150 : 126);
    if (!done && !building && id === 'garden') out += title(p.x - 67, p.y + 77, '照护住房 / 托育 · 用地择一', true);
    out += '</g>';
    return out;
  }
  function amenity(id, p) {
    if (!isDone(p)) return '';
    var out = '', x = locations[id].x, y = locations[id].y;
    if (id === 'garden') {
      if (p.cardId === 'cca' || /care|senior|housing/.test(p.cardId)) {
        out += block(x - 15, y - 5, 78, 48, 73, ['#dcc5a0', '#a9bc9b', '#f4e8ca', '#aec6a5'], 3, '关怀');
        out += tree(x - 55, y + 2, .65) + bench(x + 49, y + 24);
      } else {
        out += iso(x - 12, y - 5, 66, 43, 27, ['#d6a48f', '#bd8d79', '#f3c5a4', '#dec6a2']);
        out += '<path d="M' + (x - 50) + ' ' + (y + 10) + 'q20-42 40 0" stroke="#679a8d" stroke-width="5" fill="none"/><path d="M' + (x - 35) + ' ' + (y - 8) + 'v23m8-19v23" stroke="#dfa86b" stroke-width="3"/>';
      }
    }
    if (id === 'void') {
      out += bench(x - 21, y - 7) + '<ellipse cx="' + (x + 9) + '" cy="' + (y + 6) + '" rx="17" ry="8" fill="#efc87d" stroke="#a78c5d"/><path d="M' + (x + 9) + ' ' + (y + 6) + 'v15" stroke="#a78c5d" stroke-width="4"/>';
    }
    if (id === 'room') out += iso(x - 15, y - 6, 45, 32, 24, ['#a0bcb1', '#72928c', '#e1e4cb', '#91b1a4']) + '<path d="M' + (x + 7) + ' ' + (y - 16) + 'v14m-7-7h14" stroke="#fcf4dd" stroke-width="4"/>';
    if (id === 'crossing') out += '<path d="M890 399l57 30m-49-40 57 30m-49-40 57 30m-49-40 57 30" stroke="#fff8de" stroke-width="6"/><path d="M890 391v-24m77 48v-24" stroke="#577d72" stroke-width="4"/><circle cx="890" cy="364" r="5" fill="#789d67"/><circle cx="967" cy="388" r="5" fill="#789d67"/>';
    if (id === 'route' && p.cardId === 'ramp') out += '<path d="M330 436l74 24 26-16-74-24z" fill="#c3c8ae" stroke="#7d9581"/><path d="M331 426l74 24m-50-35 74 24" stroke="#6c8e80" stroke-width="3"/>';
    return out;
  }
  function corridor(state) {
    var p = (state.plots || {}).route || {}, built = (isDone(p) && p.cardId === 'cover') || (state.flags && (state.flags.coverComplete || state.flags.cover));
    if (!built) return '<path d="M338 442Q380 505 505 539T829 511" fill="none" stroke="#b89c78" stroke-width="3" stroke-dasharray="5 7" opacity=".65"/>';
    var out = '<g class="world-corridor"><path d="M334 438L536 504L831 509" fill="none" stroke="#dee0c9" stroke-width="19"/>';
    [[340, 438], [395, 456], [454, 476], [514, 496], [576, 504], [640, 506], [705, 507], [770, 508], [824, 509]].forEach(function (q) { out += '<path d="M' + q[0] + ' ' + q[1] + 'v-27" stroke="#8da08e" stroke-width="3"/>'; });
    out += '<path d="M333 411L536 477L832 482" fill="none" stroke="#a9c7b4" stroke-width="21"/><path d="M334 403L537 469L833 474" fill="none" stroke="#d9e2c9" stroke-width="2"/></g>';
    return out;
  }
  function tinyPerson(x, y, color, scale) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (scale || 1) + ')"><ellipse cy="3" rx="5" ry="2.5" fill="#36585024"/><path d="M-2-2v-5h4v5m-2-5v-5" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round"/><circle cy="-15" r="3" fill="#d6aa83"/></g>';
  }
  function pedestrian(path, color, dur, delay) {
    return '<g class="world-walker" style="animation-delay:' + (delay || 0) + 's"><g><ellipse cy="3" rx="4.3" ry="2.2" fill="#244a4920"/><path d="M-2 0v-6h4v6m-2-6v-6" stroke="' + color + '" stroke-width="2.8" stroke-linecap="round"/><circle cy="-15" r="3.1" fill="#ddb68b"/></g><animateMotion dur="' + dur + 's" begin="' + (delay || 0) + 's" repeatCount="indefinite" path="' + path + '"/></g>';
  }
  function resident(person, state, options) {
    var value = Number((state.groups || {})[person.group]); if (!Number.isFinite(value)) value = 55;
    var level = value >= 68 ? '稳定' : value >= 40 ? '仍有需求' : '面临困难', color = value >= 68 ? '#4d8e72' : value >= 40 ? '#c29446' : '#c36e5e', symbol = value >= 68 ? '✓' : value >= 40 ? '·' : '!';
    var selected = options.selectedResident === person.id, x = person.x, y = person.y, labelWidth = person.name.length > 4 ? 96 : 80;
    var alert = (state.issues || []).some(function (issue) { return issue.status === 'open' && (issue.channel || global.CM_DATA.issueChannels[issue.id])==='world' && (issue.person === person.id || String(issue.person || '').indexOf(person.name.slice(0, 2)) >= 0); });
    if (person.id === 'chen' && (state.flags && (state.flags.coverComplete || state.flags.cover) || isDone((state.plots || {}).route) && (state.plots || {}).route.cardId === 'cover')) { x = 846; y = 534; }
    var out = '<g class="world-hit world-resident' + (selected ? ' world-selected-resident' : '') + '" data-resident="' + person.id + '" tabindex="0" role="button" aria-label="' + esc(person.name + '，' + level + '，查看居民档案') + '"><title>' + esc(person.name + ' · ' + level) + '</title><g transform="translate(' + x + ' ' + y + ')">';
    out += '<ellipse cx="2" cy="5" rx="13" ry="5" fill="#244a4927"/><circle cy="-20" r="' + (selected ? 22 : 19) + '" fill="#fffdf3" stroke="' + (selected ? '#d4775e' : '#d5dac4') + '" stroke-width="' + (selected ? 3 : 1.5) + '"/>';
    out += '<path d="M-10-9q0-13 10-13t10 13" fill="' + person.shirt + '"/><circle cy="-25" r="7" fill="#ddb38c"/><path d="M-7-26q0-9 7-8 8 0 7 8l-3-3-4 1-4-1z" fill="' + person.hair + '"/><path d="M-4-5l-1 9m9-9 1 9" stroke="#526a60" stroke-width="3" stroke-linecap="round"/>';
    out += '<rect x="' + (-labelWidth / 2) + '" y="9" width="' + labelWidth + '" height="23" rx="11.5" fill="#fffdf3" stroke="' + (selected ? '#d4775e' : '#d3dac7') + '"/><text x="-6" y="24" text-anchor="middle" class="world-resident-label">' + esc(person.name) + '</text><circle cx="' + (labelWidth / 2 - 12) + '" cy="20.5" r="6" fill="' + color + '"/><text x="' + (labelWidth / 2 - 12) + '" y="23.5" text-anchor="middle" fill="#fffdf3" font-size="10" font-weight="700">' + symbol + '</text>';
    if (alert) out += '<g class="world-alert"><circle cx="18" cy="-35" r="9" fill="#d87d62" stroke="#fff7df" stroke-width="2"/><text x="18" y="-31" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">!</text></g>';
    return out + '</g></g>';
  }
  function render(state, opts) {
    state = state || {}; opts = opts || {}; var plots = state.plots || {};
    var out = '<svg xmlns="http://www.w3.org/2000/svg" class="community-world" viewBox="0 0 1200 760" role="group" aria-label="金文泰社区示意地图。可点击地块和居民，查看空间条件与住户故事。"><defs><pattern id="world-lock-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><rect width="8" height="8" fill="#cbd1bc"/><path d="M0 0v8" stroke="#a7b39e" stroke-width="3"/></pattern><pattern id="world-lawn" width="34" height="29" patternUnits="userSpaceOnUse"><circle cx="5" cy="7" r="1" fill="#8dab7860"/><path d="M20 18l3-2m-1 5 4-1" stroke="#8dab7833" stroke-width="1"/></pattern><filter id="world-shadow" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#6b7e58" flood-opacity=".12"/></filter><style>.community-world{font-family:Inter,"Microsoft YaHei",sans-serif}.world-hit{cursor:pointer;outline:none}.world-hit:focus .world-chip,.world-hit:focus .world-resident-label{font-weight:800}.world-hit:focus{filter:drop-shadow(0 0 4px #d27b56)}.world-hit:hover{filter:brightness(1.025)}.world-place-label{font-size:14px;fill:#385951;font-weight:650;letter-spacing:1px}.world-small{font-size:10px;fill:#6d8069;letter-spacing:.3px}.world-chip{font-size:11px;font-weight:600}.world-resident-label{font-size:11px;font-weight:600;fill:#2c514b}.world-block-label{font-size:10px;font-weight:700;fill:#557465;letter-spacing:1px}.world-valid-plot{filter:drop-shadow(0 0 5px #74aa92)}.world-alert{transform-origin:center;animation:world-alert-pulse 2s ease-in-out infinite}@keyframes world-alert-pulse{50%{opacity:.65}}@media(prefers-reduced-motion:reduce){.community-world *{animation:none!important}.world-walker{display:none}}</style></defs>';
    out += '<rect width="1200" height="760" fill="#f3f0e3"/><ellipse cx="611" cy="657" rx="420" ry="53" fill="#c7cbb532"/>';
    out += '<g filter="url(#world-shadow)">' + poly([[56, 399], [598, 124], [1154, 418], [611, 724]], '#d7d8b8') + poly([[56, 399], [611, 703], [611, 724], [56, 420]], '#c1c7a2') + poly([[611, 703], [1154, 397], [1154, 418], [611, 724]], '#a9bd9c') + poly([[56, 399], [598, 124], [1154, 397], [611, 703]], '#c4d2a3') + poly([[56, 399], [598, 124], [1154, 397], [611, 703]], 'url(#world-lawn)') + '</g>';
    // Streets continue beyond the visible block; walking routes are the lighter paths.
    out += '<path d="M500 177L1082 482" stroke="#bdc8ae" stroke-width="54"/><path d="M500 177L1082 482" stroke="#a3b1a5" stroke-width="35"/><path d="M500 177L1082 482" stroke="#eff0d5" stroke-width="1.4" stroke-dasharray="13 10"/>';
    out += '<path d="M115 409L657 698" stroke="#a7b69d" stroke-width="44"/><path d="M115 409L657 698" stroke="#bdc6ae" stroke-width="27"/>';
    out += '<path d="M195 322L724 598M324 256L1003 609M207 445L706 209M384 565L1007 352" stroke="#e7dfbf" stroke-width="16" fill="none" stroke-linejoin="round"/>';
    out += '<path d="M195 322L724 598M324 256L1003 609M207 445L706 209M384 565L1007 352" stroke="#f2ead0" stroke-width="2" fill="none"/>';
    // High-rise homes and older walk-up-height blocks share the same town.
    out += block(646, 216, 65, 36, 139, ['#d2d4bf', '#9fb4a9', '#f2eddb', '#c3cbb9'], 9, '新住户');
    out += block(795, 240, 67, 37, 183, ['#d8c3a8', '#aaad99', '#f6e8d1', '#d1c7b2'], 12, 'PEAKS');
    out += block(936, 319, 61, 37, 174, ['#cad5c2', '#8fae9f', '#e7ead6', '#b7c8af'], 11, 'NORTH');
    out += tree(706, 251, .85) + tree(749, 277, .68) + tree(1027, 355, .85);
    out += block(394, 238, 121, 36, 102, ['#e9cfaa', '#bbac92', '#f1e5c9', '#dac2a1'], 5, '旧组屋 A');
    out += block(228, 316, 126, 38, 100, ['#e3c7a5', '#c69e87', '#f3e2bf', '#d9b79b'], 5, '旧组屋 B');
    out += block(561, 333, 114, 35, 105, ['#d7d1ad', '#98b299', '#f0e7c7', '#c4cfac'], 5, '旧组屋 C');
    out += block(763, 389, 100, 34, 91, ['#dfb39f', '#b68a79', '#f4d0b5', '#d0aa92'], 4, '旧组屋 D');
    out += tree(367, 312, .85) + tree(515, 353, .85) + tree(899, 398, .75);
    out += block(124, 426, 96, 30, 77, ['#d5c4a1', '#a8ad92', '#e6ddba', '#c5c8a2'], 4, '租住');
    out += block(349, 425, 105, 35, 83, ['#efd7b4', '#c4aa91', '#f7e7c8', '#e0c5a3'], 4, '邻里');
    out += block(512, 457, 74, 28, 60, ['#dcb699', '#b48d78', '#f3d3ab', '#cfaa8d'], 3, '住家');
    out += iso(650, 385, 46, 33, 25, ['#ccd2ae', '#99af99', '#e5dfbf', '#b9c9a8']);
    // A hawker centre is a visible social anchor, not merely a menu item.
    out += iso(864, 507, 123, 65, 36, ['#e9c7a2', '#bf9d7d', '#de9780', '#d7b48f']);
    out += '<path d="M807 498l105 54 57-29-106-53z" fill="#d68b70"/><path d="M819 498l95 49m-74-59 95 49m-74-59 95 49" stroke="#e5b493" stroke-width="3"/><path d="M807 498v9l105 54v-9z" fill="#f5ddad"/>';
    out += '<path d="M815 523l90 47" stroke="#b89c7b" stroke-width="3"/>' + title(841, 497, '食阁', false);
    out += iso(1017, 502, 63, 28, 31, ['#d9c7a0', '#a3aa91', '#e2c393', '#bdc2a0']) + title(1000, 494, '日常商店', true);
    out += block(588, 592, 94, 35, 97, ['#d7bb9f', '#a69f88', '#ead6b5', '#c9b59a'], 5, '旧组屋 E');
    out += block(750, 643, 77, 30, 74, ['#d8d0ae', '#9cb19a', '#eee3c4', '#c8caab'], 4, '旧组屋 F');
    out += tree(110, 383, .82) + tree(285, 456, .8) + tree(228, 503, .9) + tree(348, 615, .9) + tree(551, 640, .77) + tree(703, 650, .68) + tree(951, 620, .87) + tree(1084, 533, .72);
    out += bench(538, 562) + bench(744, 527) + bench(335, 528);
    out += '<g transform="translate(1075 380)"><path d="M0 0v-38h47v29H0" fill="#eff0d7" stroke="#688e80" stroke-width="2"/><rect x="4" y="-34" width="39" height="13" rx="2" fill="#51968a"/><text x="23.5" y="-24" text-anchor="middle" font-size="9" font-weight="700" fill="#fff8df">EW23</text><text x="23.5" y="-12" text-anchor="middle" font-size="8.5" fill="#42675b">MRT →</text></g>';
    out += title(984, 336, '金文泰站方向', true);
    out += corridor(state);
    ['garden', 'void', 'room', 'crossing'].forEach(function (id) { out += amenity(id, plots[id]); });
    out += tinyPerson(937, 557, '#b26e58', .85) + tinyPerson(850, 570, '#678a89', .85) + tinyPerson(1056, 463, '#b18d4e', .75);
    var covered = isDone(plots.route) && plots.route.cardId === 'cover' || state.flags && (state.flags.coverComplete || state.flags.cover);
    out += pedestrian(covered ? 'M342 439L536 504L820 510' : 'M342 439Q375 505 505 539T820 510', '#c08369', covered ? 24 : 38, 0);
    out += pedestrian('M217 445L706 209', '#678c85', 31, -12);
    out += pedestrian('M880 525L720 555L510 598', '#ad9161', 28, -7);
    // Interactive land boundaries sit above scenery so their spatial constraints stay legible.
    Object.keys(locations).forEach(function (id) { out += plotOverlay(id, state, opts); });
    people.forEach(function (p) { out += resident(p, state, opts); });
    if (isDone(plots.void) || isDone(plots.room)) {
      out += tinyPerson(430, 418, '#a98966', .8) + tinyPerson(450, 428, '#728f89', .8) + tinyPerson(423, 434, '#b17e6e', .8);
    }
    out += '<g transform="translate(1083 83)"><path d="M0-20l-7 26 7-5 7 5z" fill="#698b7a"/><text y="-27" text-anchor="middle" font-size="10" fill="#698b7a" font-weight="700">N</text><text x="-56" y="35" class="world-small">示意方位</text></g>';
    out += '<g transform="translate(53 704)"><circle cx="5" cy="-4" r="4" fill="#668c68"/><text x="17" class="world-small">虚线地块可查看用地条件</text><path d="M216-10h18v10h-18z" fill="url(#world-lock-hatch)"/><text x="242" class="world-small">规划保留</text><text x="0" y="23" class="world-small">社区空间与居民均为游戏示意，非真实可开发地块。</text></g>';
    return out + '</svg>';
  }
  global.CM_WORLD = { render: render, landInfo: locations, residents: people };
})(typeof window !== 'undefined' ? window : globalThis);
