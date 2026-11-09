(function () {
  'use strict';

  // Fictional households, drawn with the rectangular brush and palette of art.js.
  const C = { ink: '#253143', paper: '#fff0ce', peach: '#e6b28d', clay: '#c77356', teal: '#4a8d8b', gold: '#efb44d', gray: '#c5bdb0' };
  const names = { chen: '陈玉英', rahman: '拉赫曼与努尔夫人', lin: '林志豪一家', kumar: '库马尔一家', students: '合租学生', huang: '黄美兰', zhang: '张叔', ali: '阿丽' };
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const group = (x, y, scale, content) => `<g transform="translate(${x} ${y}) scale(${scale})">${content}</g>`;
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const svg = (content, w, h, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(label)}" style="image-rendering:pixelated" shape-rendering="crispEdges">${content}</svg>`;

  function head(x, y, scale, kind, skin = C.peach, glasses = false) {
    let a = rect(-12, -14, 24, 7, C.ink) + rect(-15, -7, 30, 21, C.ink) + rect(-11, 14, 22, 5, C.ink);
    a += rect(-11, -8, 22, 22, skin) + rect(-7, 14, 14, 4, skin) + rect(-14, -2, 3, 10, skin) + rect(11, -2, 3, 10, skin);
    if (kind === 'elder-bun') {
      a += rect(-13, -13, 26, 6, C.gray) + rect(-16, -7, 7, 9, '#d9d2bf') + rect(9, -7, 7, 9, '#d9d2bf');
      a += rect(-10, -17, 20, 6, '#aaa9a3') + rect(-7, -20, 14, 5, '#d4cfbf') + rect(-12, 6, 4, 8, '#c8ba9c') + rect(9, 6, 4, 8, '#c8ba9c');
    } else if (kind === 'gray-short') {
      a += rect(-13, -14, 26, 7, '#a7a6a0') + rect(-9, -18, 18, 5, '#c5c4b6') + rect(-16, -8, 5, 12, '#d2cebd') + rect(11, -8, 5, 12, '#d2cebd');
    } else if (kind === 'long') {
      a += rect(-13, -16, 27, 10, '#252b36') + rect(-16, -8, 7, 25, '#252b36') + rect(10, -8, 7, 28, '#252b36');
      a += rect(-12, -13, 10, 9, '#2b303a') + rect(-14, 16, 6, 10, '#252b36') + rect(11, 19, 6, 7, '#252b36') + rect(9, -10, 3, 8, '#4c454d');
    } else if (kind === 'tied') {
      a += rect(-13, -15, 26, 9, '#34313b') + rect(-10, -19, 20, 6, '#34313b') + rect(-16, -7, 5, 10, '#34313b');
      a += rect(11, -7, 6, 18, '#34313b') + rect(15, 7, 5, 15, '#34313b') + rect(14, 6, 5, 3, C.clay) + rect(-9, -14, 5, 3, '#5b4f50');
    } else {
      a += rect(-13, -14, 26, 8, '#242c38') + rect(-16, -9, 5, 8, '#242c38') + rect(10, -9, 6, 8, '#242c38');
      a += rect(-8, -18, 18, 5, '#242c38') + rect(-13, -11, 6, 6, '#4c4544') + rect(-8, -13, 6, 6, '#242c38');
    }
    a += rect(-7, -2, 4, 3, C.ink) + rect(4, -2, 4, 3, C.ink) + rect(-6, -2, 1, 1, C.paper) + rect(5, -2, 1, 1, C.paper);
    a += rect(-2, 3, 3, 5, '#bb805f') + rect(-5, 10, 10, 2, '#955e52') + rect(-10, 6, 3, 3, '#cf886d') + rect(8, 6, 3, 3, '#cf886d');
    if (kind === 'elder-bun' || kind === 'gray-short') a += rect(-8, 3, 5, 1, '#a87967') + rect(4, 3, 5, 1, '#a87967') + rect(-8, 8, 2, 2, '#a87967') + rect(6, 8, 2, 2, '#a87967');
    if (glasses) a += rect(-11, -4, 10, 1, C.ink) + rect(2, -4, 10, 1, C.ink) + rect(-11, -3, 1, 6, C.ink) + rect(-2, -3, 1, 6, C.ink) + rect(2, -3, 1, 6, C.ink) + rect(11, -3, 1, 6, C.ink) + rect(-11, 3, 10, 1, C.ink) + rect(2, 3, 10, 1, C.ink) + rect(-1, -1, 3, 1, C.ink);
    return group(x, y, scale, a);
  }

  function body(x, y, scale, color, shirt = '#f3e2c2') {
    let a = rect(-9, -4, 18, 9, C.ink) + rect(-17, 4, 34, 24, C.ink) + rect(-20, 13, 40, 15, C.ink);
    a += rect(-8, -3, 16, 8, shirt) + rect(-16, 6, 32, 21, color) + rect(-11, 7, 21, 21, shirt) + rect(-3, 6, 5, 22, color) + rect(-18, 14, 5, 14, color) + rect(13, 14, 5, 14, color);
    return group(x, y, scale, a);
  }

  function person(x, y, scale, hair, color, skin, shirt, glasses) {
    return body(x, y + 21 * scale, scale, color, shirt) + head(x, y, scale, hair, skin, glasses);
  }

  // Generated pixel portraits (art-pack.js) replace the hand-drawn ones when present.
  function packedPortrait(id) {
    const src = window.CM_ART_PACK && window.CM_ART_PACK.portraits && window.CM_ART_PACK.portraits[id];
    if (!src) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" role="img" aria-label="${escape(/^urgent-/.test(id) ? (window.CM_YEARS?.urgentInfo?.(id)?.title || '紧急情况') : (names[id] || '居民') + '（虚构角色）')}"><image href="${src}" width="72" height="72" preserveAspectRatio="xMidYMid slice" style="image-rendering:auto"/></svg>`;
  }

  function portrait(id) {
    const packed = packedPortrait(id);
    if (packed) return packed;
    let a = rect(0, 0, 72, 72, C.paper) + rect(4, 4, 64, 64, '#e9d4ad') + rect(4, 50, 64, 18, '#a38c77');
    a += rect(5, 6, 5, 41, '#fff0ce') + rect(60, 7, 6, 40, '#d4ae82') + rect(7, 53, 59, 4, '#746958');
    switch (id) {
      case 'chen':
        a += person(36, 30, 1.1, 'elder-bun', '#b46d6a', '#e6b28d', '#e1b99c');
        a += rect(42, 59, 9, 5, '#edd4a8') + rect(50, 60, 3, 3, C.ink) + rect(43, 57, 7, 2, '#655146');
        break;
      case 'rahman':
        a += person(24, 30, .86, 'gray-short', '#658886', '#bc8c69', '#e3d6b1');
        a += person(49, 40, .84, 'gray-short', '#a77478', '#c79775', '#e6c5a7');
        a += rect(16, 50, 3, 6, '#d7c7a2') + rect(43, 61, 10, 2, '#d7b4a2');
        break;
      case 'lin':
        a += person(22, 25, .75, 'short', '#648489', '#e8b487', '#e7e0be');
        a += person(49, 29, .73, 'tied', '#b77865', '#dfa57d', '#eee0b9');
        a += person(23, 53, .49, 'short', '#d59d54', '#efbb89', '#f3cb86');
        a += person(48, 58, .4, 'short', '#79a3a1', '#efbb89', '#d3e0c5');
        break;
      case 'kumar':
        a += person(48, 23, .62, 'elder-bun', '#a49a9e', '#bd8d68', '#e7d5b0');
        a += person(22, 35, .85, 'short', '#507a8a', '#a97857', '#a6bfba');
        a += person(50, 48, .73, 'tied', '#aa7c67', '#bd8c68', '#e5c5a0');
        // A jacket pocket and simple tool mark, rather than a construction helmet.
        a += rect(10, 60, 7, 7, C.ink) + rect(11, 61, 5, 5, '#6f94a0') + rect(12, 56, 2, 7, '#d3c9ab') + rect(10, 55, 6, 2, '#d3c9ab');
        break;
      case 'students':
        a += person(23, 30, .88, 'long', '#788e9e', '#d2a079', '#b7c4bd', true);
        a += person(49, 41, .86, 'short', '#b68b55', '#b58463', '#e4c78e');
        a += rect(8, 62, 22, 6, C.ink) + rect(10, 63, 18, 3, '#86aaa4') + rect(42, 65, 20, 3, '#e8d8b2') + rect(43, 62, 18, 3, '#b96f60');
        break;
      case 'huang':
        a += person(36, 29, 1.04, 'elder-bun', '#6d9189', '#ddb18c', '#e7c49e');
        // Apron and cooking spatula identify her work at the fictional food stall.
        a += rect(24, 51, 4, 15, '#f2dcaf') + rect(46, 51, 4, 15, '#f2dcaf') + rect(27, 58, 21, 11, '#e8cf9d') + rect(33, 61, 10, 5, '#bca77f');
        a += rect(57, 51, 2, 17, '#6b5947') + rect(54, 45, 8, 8, C.ink) + rect(55, 46, 6, 6, '#b8b6a1');
        break;
      case 'zhang':
        a += person(33, 29, 1.03, 'gray-short', '#a89165', '#d5a379', '#e6d6b0', true);
        a += rect(44, 54, 17, 17, C.ink) + rect(46, 56, 13, 13, '#ecdebd') + rect(49, 53, 7, 4, '#8d967e');
        a += rect(49, 60, 7, 1, '#8c846b') + rect(49, 63, 7, 1, '#8c846b') + rect(49, 66, 5, 1, '#8c846b');
        break;
      case 'ali':
        a += person(34, 29, 1.03, 'tied', '#638b99', '#c89879', '#a9c0be');
        a += rect(24, 54, 20, 3, '#84a7ac') + rect(45, 60, 6, 7, '#507785') + rect(46, 59, 4, 2, '#d4ddc7');
        break;
      default:
        a += person(36, 31, 1, 'short', '#7a9291', C.peach, '#e4d6b3');
    }
    a += rect(0, 0, 72, 3, C.ink) + rect(0, 69, 72, 3, C.ink) + rect(0, 0, 3, 72, C.ink) + rect(69, 0, 3, 72, C.ink);
    return svg(a, 72, 72, `${names[id] || '居民'}（虚构角色）`);
  }

  const facilities = { cover: 'walkway', ramp: 'walkway', ease: 'retrofit', corner: 'rest', aac: 'daycare', cca: 'daycare', child: 'childcare', visits: 'register', event: 'club', nrp: 'smart', appeal: 'flexible' };
  const facilityLabels = { cover: '有盖走廊', ramp: '无障碍坡道', ease: '居家改造', corner: '居民角', aac: '乐龄活动中心', cca: '社区关怀公寓', child: '托育与儿童设施', visits: '结伴探访', event: '社区活动', nrp: '邻里更新', appeal: 'EIP个案支援' };
  // register and flexible have names in the retained art.js, but no drawing cases.
  const originalDrawings = new Set(['walkway', 'retrofit', 'rest', 'daycare', 'childcare', 'club', 'smart']);
  function facility(id) {
    const mapped = facilities[id];
    if (originalDrawings.has(mapped) && window.GameArt && typeof window.GameArt.facility === 'function') {
      return window.GameArt.facility(mapped).replace(/aria-label="[^"]*"/, `aria-label="${escape(facilityLabels[id])}"`);
    }
    let a = rect(0, 0, 180, 130, C.paper) + rect(22, 87, 136, 15, '#a38c77');
    if (id === 'visits') {
      a += rect(82, 24, 47, 69, C.ink) + rect(86, 28, 39, 61, '#b78d66') + rect(91, 34, 29, 21, '#d9b88a') + rect(91, 61, 29, 22, '#cba477') + rect(115, 56, 5, 4, C.paper);
      a += person(62, 53, 1, 'gray-short', '#849782', '#d7aa83', '#e9d6b1') + rect(51, 88, 8, 12, C.ink) + rect(65, 88, 8, 12, C.ink);
    } else if (id === 'appeal') {
      a += rect(55, 18, 72, 84, C.ink) + rect(59, 22, 64, 76, '#efdfb7') + rect(67, 32, 26, 5, '#74938d') + rect(67, 46, 46, 3, '#9d8d70') + rect(67, 56, 46, 3, '#9d8d70') + rect(67, 66, 31, 3, '#9d8d70');
      a += rect(99, 76, 14, 14, C.teal) + rect(102, 82, 3, 4, C.paper) + rect(105, 79, 5, 4, C.paper);
    } else {
      a += rect(49, 42, 82, 48, C.ink) + rect(52, 45, 76, 42, '#e6be8c') + rect(43, 35, 94, 9, C.ink) + rect(46, 36, 88, 5, C.teal);
      a += rect(61, 54, 13, 14, C.gold) + rect(81, 54, 13, 14, C.gold) + rect(103, 65, 13, 22, '#575d68');
    }
    return svg(a, 180, 130, facilityLabels[id] || '社区设施');
  }

  window.CM_ART = Object.freeze({ portrait, facility });
})();
