/* The knock at a door that does not open this year. A short corridor scene plays the
 * refusal: the resident answers through the gate, leaves a note, sends a message, or a
 * neighbour explains. Pure presentation; the year engine decides who declined. */
(function(root){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const r=(x,y,w,h,f,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${extra}/>`;
  const MODE_LABEL={door:['隔着铁门回话','Answering through the gate'],note:['门上贴着纸条','A note on the gate'],message:['手机收到一条消息','A message on your phone'],neighbour:['隔壁邻居探出头','The neighbour looks out'],silent:['敲了几次门，没有回应','You knock; nobody answers']};
  const UNIT={chen:'#03-112',rahman:'#07-215',lin:'#11-308',kumar:'#05-221',students:'#04-113',ali:'#02-116'};
  function player(){const fig=root.CM_ART_PACK?.player;if(fig){const h=44,w=Math.round(fig.w*h/fig.h);return `<image href="${fig.src}" x="${20-w/2}" y="-4" width="${w}" height="${h}"/>`;}return r(13,-1,14,5,'#253a4a')+r(12,4,16,13,'#d6a681')+r(10,18,20,16,'#d8bf80')+r(7,20,5,12,'#b58c6e')+r(28,20,5,12,'#b58c6e')+r(12,34,6,6,'#344b60')+r(23,34,6,6,'#344b60')+r(15,8,3,2,'#263744')+r(23,8,3,2,'#263744');}
  function neighbour(){return r(10,0,18,8,'#4a3a33')+r(10,8,18,14,'#c99a78')+r(14,13,3,2,'#2b2622')+r(21,13,3,2,'#2b2622')+r(6,22,26,22,'#7c9a7f');}
  function portrait(id){const art=root.CM_ART?.portrait?.(id);return art?art.replace(/<svg\b[^>]*>/,'<svg x="0" y="0" width="44" height="44" viewBox="0 0 72 72" aria-hidden="true" shape-rendering="crispEdges">'):r(8,4,28,36,'#7c9a7f');}
  function stage(id,mode,lang){
    const grille=Array.from({length:7},(_,i)=>r(206+i*12,64,3,120,'#5d6b72')).join('')+r(204,64,86,4,'#5d6b72')+r(204,120,86,3,'#5d6b72')+r(204,180,86,4,'#5d6b72');
    const note=mode==='note'?`<g class="rf-note">${r(232,98,32,40,'#f8f1dc')+r(236,104,24,2,'#6d7b82')+r(236,110,20,2,'#6d7b82')+r(236,116,22,2,'#6d7b82')+r(236,122,14,2,'#6d7b82')+r(244,94,8,6,'#d9b45a')}</g>`:'';
    const gap=mode==='door'?`<g class="rf-gap">${r(212,70,30,108,'#1d2630')}<g transform="translate(205 92)" class="rf-face">${portrait(id)}</g></g>`:'';
    const phone=mode==='message'?`<g class="rf-phone" transform="translate(150 40)">${r(0,0,22,36,'#24303b')+r(3,4,16,24,'#7fb0bb')+r(5,8,12,3,'#f6f1e6')+r(5,14,9,3,'#f6f1e6')+r(9,30,4,3,'#9aa4ac')}<g class="rf-buzz">${r(-8,8,4,2,'#f1d398')+r(-9,14,5,2,'#f1d398')+r(26,8,4,2,'#f1d398')+r(26,14,5,2,'#f1d398')}</g></g>`:'';
    const flyers=mode==='silent'?`<g class="rf-flyers">${r(214,176,22,7,'#f2e6c4')+r(232,178,20,6,'#e0b44c')+r(246,175,24,8,'#f6f1e6')+r(226,172,16,5,'#c0533f')}${r(262,128,22,16,'#5d6b72')+r(264,124,18,6,'#f2e6c4')+r(268,121,12,5,'#e0b44c')}</g><g class="rf-silence"><text x="247" y="54" text-anchor="middle" font-size="16" font-weight="700" font-family="Segoe UI,sans-serif" fill="#3b2c22">…</text></g>`:'';
    const next=mode==='neighbour'?`<g class="rf-neighbour-door">${r(436,64,58,120,'#1d2630')}<g class="rf-neighbour" transform="translate(444 104)">${neighbour()}</g></g>`:'';
    return `<svg class="refusal-stage" viewBox="0 0 560 220" role="img" aria-label="${esc(lang==='en'?'You knock on the door':'你敲了敲门')}" shape-rendering="crispEdges">`+
      r(0,0,560,190,'#d8c6a3')+r(0,0,560,18,'#bba680')+r(0,186,560,34,'#a48d70')+r(0,186,560,4,'#8c765c')+
      Array.from({length:8},(_,i)=>r(i*70+20,196,40,4,'#93795d')).join('')+
      r(196,56,102,134,'#7d6450')+r(202,62,90,124,'#2a333c')+gap+
      `<g class="rf-door-leaf">${r(208,68,78,112,'#b98e6c')+r(214,76,66,40,'#c79c78')+r(214,124,66,48,'#c79c78')+r(270,120,6,10,'#e3c27d')}</g>`+grille+note+flyers+
      r(218,30,58,18,'#2f4a5b')+`<text x="247" y="43" text-anchor="middle" font-size="11" font-family="Segoe UI,sans-serif" fill="#f1e7cf">${esc(UNIT[id]||'#03-101')}</text>`+
      r(312,150,54,36,'#7a5c46')+r(316,154,46,8,'#5d4535')+r(318,166,14,8,'#c0533f')+r(336,166,16,8,'#3f6f9a')+r(320,176,12,8,'#e9c06b')+
      r(120,150,28,36,'#b86b45')+r(124,128,6,24,'#5f8f4e')+r(130,120,8,30,'#6fa35a')+r(138,132,6,18,'#5f8f4e')+
      r(430,58,70,132,'#7d6450')+r(436,64,58,120,'#a2785a')+r(442,70,46,108,'#b98e6c')+next+
      r(520,30,40,160,'#c8b593')+r(0,30,60,160,'#c8b593')+r(0,90,60,4,'#a6927a')+
      phone+
      `<g class="rf-player" transform="translate(0 0)"><g class="rf-walker">${player()}</g></g>`+
      `<g class="rf-knock"><text x="192" y="92" text-anchor="end" font-size="15" font-weight="700" font-family="Segoe UI,sans-serif" fill="#3b2c22">${lang==='en'?'knock':'咚'}</text><text x="184" y="114" text-anchor="end" font-size="15" font-weight="700" font-family="Segoe UI,sans-serif" fill="#3b2c22">${lang==='en'?'knock':'咚'}</text></g>`+
      `</svg>`;
  }
  function html(residentId,reason,{lang='zh',name='',year=1}={}){
    const en=lang==='en',t=pair=>pair?.[en?'en':'zh']||pair?.zh||'',mode=MODE_LABEL[reason?.mode]?reason.mode:'door';
    const speaker=reason?.speaker?t(reason.speaker):mode==='note'?(en?'Note':'纸条'):mode==='silent'?(en?'No answer':'没有回应'):name;
    const avatar=mode==='silent'?'<span class="refusal-avatar is-note" aria-hidden="true">…</span>':mode==='note'?'<span class="refusal-avatar is-note" aria-hidden="true">✉</span>':mode==='neighbour'?'<span class="refusal-avatar is-neighbour" aria-hidden="true"><svg viewBox="0 0 40 44" shape-rendering="crispEdges">'+neighbour()+'</svg></span>':'<span class="refusal-avatar">'+(root.CM_ART?.portrait?.(residentId)||'')+'</span>';
    return '<div class="refusal-event" data-mode="'+mode+'" data-resident="'+esc(residentId)+'" data-i18n-ignore>'+
      '<div class="refusal-stage-wrap">'+stage(residentId,mode,lang)+'</div>'+
      '<div class="refusal-card">'+avatar+'<div><small>'+esc(MODE_LABEL[mode][en?1:0])+'</small><strong>'+esc(speaker)+'</strong><p class="refusal-line">'+(mode==='note'||mode==='silent'?esc(t(reason?.line)):(en?'“':'“')+esc(t(reason?.line))+(en?'”':'”'))+'</p></div></div>'+
      '<div class="refusal-foot"><span class="refusal-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.5 12h1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'+esc(en?'Declined this year':'本年婉拒')+' · '+esc(t(reason?.short))+'</span><button type="button" class="primary-button" data-year-action="close">'+esc(en?'Leave them be this year':'今年先不打扰')+'</button></div>'+
    '</div>';
  }
  root.CM_YEAR_REFUSAL={html,modes:Object.keys(MODE_LABEL)};
})(typeof window!=='undefined'?window:globalThis);
