(function (root) {
  'use strict';
  const doc = root.document;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let hooks, initialized = false, generation = 0, active = null;
  // Credentials are page-local configuration, never part of the saved world.
  let settings = { provider: 'mock', baseUrl: '', model: '', apiKey: '' };
  const noteViews = new WeakMap();
  const language = () => (hooks?.getLanguage?.() || root.CM_I18N?.getLanguage?.()) === 'en' ? 'en' : 'zh';
  const w = (zh, en) => language() === 'en' ? en : zh;
  const talk = () => root.CM_TALK;
  const person = id => root.CM_DATA.residents.find(r => r.id === id);
  const name = id => {
    const value = root.CM_COMMUNITY?.personas?.[id]?.name;
    return value?.[language()] || root.CM_I18N?.t?.(person(id)?.name) || person(id)?.name || id;
  };
  const time = seconds => String(Math.floor(Math.max(0, Number(seconds) || 0) / 60)).padStart(2, '0') + ':' +
    String(Math.floor(Math.max(0, Number(seconds) || 0) % 60)).padStart(2, '0');
  const playable = state => !!hooks.isPlaying() && !state.outcome;
  const nearby = id => typeof hooks.canTalkTo !== 'function' || !!hooks.canTalkTo(id);
  const source = value => value === 'model' ? w('模型回复', 'Model response') : w('离线演示 · 预设台词', 'Offline demo · scripted');
  const archive = (state, id) => (Array.isArray(state.residentTalks) ? state.residentTalks : [])
    .filter(s => s && (!id || s.residentId === id) && Array.isArray(s.exchanges));

  function transcript(session) {
    return (session?.exchanges || []).map(exchange => `<div class="cm-talk-exchange">
      <div class="cm-talk-line cm-talk-player"><span>${esc(w('你', 'You'))}</span><p>${esc(exchange.player)}</p></div>
      <details class="cm-talk-scene"><summary>${esc(w('看看此刻的场景', 'Scene detail'))}</summary><p>${esc(exchange.narration)}</p></details>
      <div class="cm-talk-line cm-talk-resident"><span>${esc(name(session.residentId))}</span><p>${esc(exchange.reply)}</p><small>${esc(source(exchange.source))}</small></div>
    </div>`).join('');
  }

  function buildNotesHTML(state, id) {
    const need = root.CM_NEEDS?.get(state, id, language());
    if (need && need.status === 'unknown' && !need.canConfirm && !archive(state, id).some(s => s.exchanges.length)) {
      const observed = root.CM_HOME?.evidence?.(state, id, language())?.observations || [];
      return `<div class="cm-talk-facts"><h4>${esc(w('已观察的线索', 'Observed clues'))}</h4>${observed.length ? `<ul>${observed.map(item => `<li>${esc(item.name)}</li>`).join('')}</ul>` : `<p>${esc(w('还没有查看这户的物件。', 'You have not inspected objects in this home yet.'))}</p>`}<p class="cm-talk-caption">${esc(w('线索帮助你提问。先听本人说明，或阅读这户的委托，再记录需求。', 'Use clues to ask a question. Listen to this resident or read their request before recording the need.'))}</p></div>`;
    }
    const notes = talk().notes(state, id, language());
    return `<div class="cm-talk-facts"><p class="cm-talk-summary">${esc(notes.summary)}</p>
      <div class="cm-talk-fact-grid"><div><h4>${esc(w('日常需求', 'Everyday needs'))}</h4><ul>${(notes.needs || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h4>${esc(w('仍需留意', 'Things to consider'))}</h4>${notes.barriers?.length ? `<ul>${notes.barriers.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(w('目前没有新增的已知门槛。', 'No additional known barriers are recorded.'))}</p>`}</div></div>
      ${notes.suggestions?.length ? `<h4>${esc(w('回到原牌库，探索这些方向', 'Explore these choices in the original card library'))}</h4><div class="cm-talk-cards">${notes.suggestions.map(c => `<button type="button" data-talk-card="${esc(c.id)}" class="cm-talk-card"><strong>${esc(c.name)}</strong><small>${esc(c.available ? w('查看卡片 · 当前可用', 'Inspect card · available now') : w('查看条件', 'Inspect requirements'))} ↗</small>${!c.available && c.reason ? `<small>${esc(c.reason)}</small>` : ''}</button>`).join('')}</div>` : ''}
      <small class="cm-talk-caption">${esc(w('笔记按当前已知信息与游戏规则核对。查看卡片不会自动执行；仍需在原流程中确认预算、人手和用地。', 'Notes are checked against currently known information and the game rules. Inspecting a card does not execute it; confirm costs, staff and location through the original flow.'))}</small></div>`;
  }

  function notesHTML(state, id) {
    // Conversation, draft and focus changes do not change the engine's notes.
    // Include every engine field used by availability so a newly changed game,
    // completed project, cooldown or language can never reuse stale suggestions.
    const key=JSON.stringify([language(),state.outcome,state.time,state.budget,state.trust,state.staffTotal,state.staffUsed,
      state.groups,state.flags,state.plots,state.projects,state.issues,state.residentNeeds,
      archive(state,id).map(s=>s.exchanges.length),state.homeExplorations?.[id]?.seen]);
    let householdViews=noteViews.get(state);
    if(!householdViews){householdViews=new Map();noteViews.set(state,householdViews);}
    const cached=householdViews.get(id);
    if(cached?.key===key)return cached.html;
    const html=buildNotesHTML(state,id);
    householdViews.set(id,{key,html});
    return html;
  }

  const questions = () => [w('现在最困扰你的是什么？', 'What is most difficult for you right now?'),
    w('现在的安排哪里不够？', 'What is missing from the current arrangements?'),
    w('如果先改一件事，你希望改什么？', 'What would you like us to improve first?')];
  const questionLabels = () => [w('问困难', 'Difficulty'), w('问现状', 'Current support'), w('问优先', 'Priority')];

  function needCard(state, id, allowed, closeEnough, busy) {
    const need = root.CM_NEEDS?.get(state, id, language());
    if (!need) return '';
    const heard = archive(state, id).some(s => s.exchanges.length);
    if (need.status === 'unknown' && !need.canConfirm && !heard) {
      const observed = root.CM_HOME?.evidence?.(state, id, language())?.observations || [];
      return `<div class="cm-need-clue"><span class="cm-need-symbol" aria-hidden="true">?</span><span>${esc(observed.length ? w('已有线索，问问本人。', 'You have a clue. Ask the resident.') : w('先看看，再听本人说。', 'Look around, then listen.'))}</span></div>`;
    }
    const symbols = { unknown:'?', confirmed:'✓', in_progress:'◷', review:'↺', improved:'✓', partial:'◐' };
    const ready = allowed && closeEnough && !busy;
    const message = active?.id === id ? active.needMessage : '';
    const action = need.canReview ? `<button type="button" class="primary-button" data-talk-review="${esc(id)}" ${ready ? '' : 'disabled'}>${esc(w('回访：核实实际变化', 'Follow up: check the change'))}</button>`
      : need.canConfirm ? `<button type="button" class="primary-button" data-talk-confirm-need="${esc(id)}" ${ready ? '' : 'disabled'}>${esc(w('确认这个需求，带回社区', 'Confirm need and return to plan'))}</button>`
      : `<button type="button" class="${need.status === 'improved' ? 'secondary-button' : 'primary-button'}" data-talk-plan="${esc(id)}" ${allowed && !busy ? '' : 'disabled'}>${esc(need.status === 'improved' ? w('回到社区，关注下一户', 'Return and help another neighbour') : w('带回社区安排', 'Return to plan'))}</button>`;
    return `<section class="cm-need-card" data-need-status="${esc(need.status)}" aria-labelledby="cm-need-title"><div class="cm-need-card-heading"><span class="cm-need-symbol" aria-hidden="true">${symbols[need.status] || '?'}</span><div><span class="cm-need-status">${esc(need.label)}</span><h4 id="cm-need-title">${esc(need.title)}</h4></div></div><p>${esc(need.detail)}</p>${message ? `<p class="cm-need-feedback" role="status">${esc(message)}</p>` : ''}<div class="cm-need-actions">${action}</div>${!closeEnough && (need.canConfirm || need.canReview) ? `<small>${esc(w('走近居民，再确认。', 'Approach the resident to confirm.'))}</small>` : ''}</section>`;
  }

  function contents(id, draft = '', error = null, busy = false) {
    const state = hooks.getState(), session = talk().session(state, id), count = session?.exchanges?.length || 0;
    const max = talk().MAX_EXCHANGES || 3, full = count >= max, allowed = playable(state), closeEnough = nearby(id), ready = allowed && closeEnough && !!session && !full;
    return `<div class="cm-talk-heading"><div><span class="cm-talk-eyebrow">${esc(source(settings.provider === 'mock' ? 'offline' : 'model'))} · Ⅱ ${esc(w('经营时间暂停', 'Neighbourhood time paused'))}</span><h3>${esc(w('听听这家的日常', 'Listen to life at home'))}</h3></div><button type="button" class="cm-talk-link" data-talk-settings>${esc(w('对话设置', 'Dialogue settings'))}</button></div>
      <p class="cm-talk-intro">${esc(w('问清困难 → 确认需求 → 回社区安排。三次提问，不扣资源。', 'Listen → confirm the need → return to plan. Three questions, no resource cost.'))}</p>
      ${allowed && !closeEnough ? `<p class="cm-talk-nearby" role="status">${esc(w('先在屋内走近居民，点击人物开始对话。', 'Walk up to the resident inside, then select them to begin talking.'))}</p>` : ''}
      <div class="cm-talk-transcript" role="log" aria-live="polite" aria-relevant="additions text">${transcript(session)}</div>
      ${!allowed ? `<p class="cm-talk-gate">${esc(state.outcome ? w('本局已经结束，仍可查看走访记录。', 'This game has ended. Your conversation records remain available.') : w('进入金文泰经营后，可以与住户交谈。', 'Enter the Clementi game to talk with your neighbours.'))}</p>` : full ? `<div class="cm-talk-complete"><p>${esc(w('已听完三问，可以带着需求回社区安排。', 'Three questions complete. Take the need back to plan.'))}</p><button type="button" class="secondary-button" data-talk-new="${esc(id)}" ${closeEnough ? '' : 'disabled'}>${esc(w('继续问一轮', 'Ask another set'))}</button></div>` : `<form class="cm-talk-form" data-talk-form="${esc(id)}"><label for="cm-talk-question">${esc(w('想问什么？', 'Your question'))}<small>${esc(w('剩余', 'Left'))} ${Math.max(0, max - count)}/${max}</small></label>
      <div class="cm-talk-prompts">${questions().map((q, i) => `<button type="button" data-talk-prompt="${i}" aria-label="${esc(questionLabels()[i]+': '+q)}" ${ready && !busy ? '' : 'disabled'}><span aria-hidden="true">${i+1}</span>${esc(questionLabels()[i])}</button>`).join('')}</div>
      <textarea id="cm-talk-question" name="question" rows="2" required maxlength="600" placeholder="${esc(w('点上方话题，或自由输入…', 'Choose a topic above, or type…'))}" ${ready && !busy ? '' : 'disabled'}>${esc(draft)}</textarea>
      <div class="cm-talk-form-bottom"><span role="status">${busy ? esc(w('住户正在回应…', 'Your neighbour is responding…')) : ''}</span><button type="submit" class="primary-button" ${ready && !busy ? '' : 'disabled'}>${esc(busy ? w('等待回复…', 'Waiting for a reply…') : w('问一问', 'Ask'))}</button></div></form>`}
      ${error ? `<div class="cm-talk-error" role="alert"><p>${esc(w('这次没有取得回复，未消耗提问次数。', 'No reply was received. This question did not count towards the limit.'))}</p><p>${esc(error.message)}</p><div><button type="button" class="secondary-button" data-talk-retry>${esc(w('重试这个问题', 'Retry this question'))}</button><button type="button" class="secondary-button" data-talk-offline>${esc(w('这个问题改用离线演示', 'Use offline demo for this question'))}</button></div></div>` : ''}
      ${needCard(state, id, allowed, closeEnough, busy)}
      <details class="cm-talk-inline-notes"><summary>${esc(w('线索与行动参考', 'Clues and action references'))}</summary>${notesHTML(state, id)}</details>
      <button type="button" class="cm-talk-link cm-talk-all-notes" data-talk-notes>${esc(w('全部住户的走访记录', 'All resident conversation records'))} ↗</button>`;
  }

  function panel(id) {
    return `<section id="cm-talk-panel" class="cm-resident-talk" data-talk-resident="${esc(id)}" data-i18n-ignore aria-label="${esc(w('住户短访谈', 'Resident conversation'))}">${contents(id)}</section>`;
  }
  function update() {
    const el = doc.getElementById('cm-talk-panel');
    if (!active || !el || el.dataset.talkResident !== active.id) return;
    const html=contents(active.id, active.draft, active.error, active.busy);
    if(active.lastPanel===el&&active.lastHTML===html)return;
    const notesOpen=el.querySelector?.('.cm-talk-inline-notes')?.open;
    el.innerHTML = html;
    active.lastPanel=el;active.lastHTML=html;
    if(notesOpen){const notes=el.querySelector?.('.cm-talk-inline-notes');if(notes)notes.open=true;}
    const log = el.querySelector?.('.cm-talk-transcript');
    if (log && !active.busy) log.scrollTop = log.scrollHeight;
  }
  function ensureConversation(id) {
    const state = hooks.getState();
    let session=talk().session(state,id);
    if (playable(state) && nearby(id) && !session) {
      try { session=talk().open(state, id, language()); hooks.save(); }
      catch (error) { active.error = { message: error.message, question: '' }; }
    }
    active.sessionId = session?.id || null;
  }
  function mount(id) {
    const el = doc.getElementById('cm-talk-panel');
    if (!el || el.dataset.talkResident !== id) return;
    active = { state: hooks.getState(), id, language: language(), token: ++generation,
      near: nearby(id), busy: false, draft: '', error: null, sessionId: null };
    ensureConversation(id); update();
  }
  function refresh(id) {
    const el = doc.getElementById('cm-talk-panel');
    if (!el || el.dataset.talkResident !== id) return;
    const state = hooks.getState(), nextNear = nearby(id), sessionId = talk().session(state, id)?.id || null;
    if (!active || active.id !== id || active.state !== state || active.language !== language()) { mount(id); return; }
    const input = doc.getElementById('cm-talk-question');
    if (!active.busy && input && typeof input.value === 'string') active.draft = input.value;
    if (active.near !== nextNear || active.sessionId !== sessionId) {
      // Replacing the request object invalidates even a reply that returns after
      // the player walks away and back to the same resident.
      active = { ...active, token: ++generation, near: nextNear, sessionId,
        busy: false, error: null };
    }
    ensureConversation(id); update();
  }
  function focusQuestion(question) {
    if (!active || active.busy) return false;
    if (typeof question === 'string') {
      active.draft = question.trim().slice(0, 600);
      update();
    }
    const input = doc.getElementById('cm-talk-question');
    if (input && typeof question === 'string') input.value = active.draft;
    if (input && !input.disabled) input.focus?.({ preventScroll: true });
    return !!input;
  }
  function cancel() { generation += 1; active = null; }
  function current(request, sessionId, count) {
    const session = talk().session(request.state, request.id), modal = doc.getElementById('modal');
    return active === request && request.token === generation && hooks.getState() === request.state &&
      (!modal || modal.open) && playable(request.state) && nearby(request.id) && language() === request.language && session?.id === sessionId &&
      session.exchanges.length === count && doc.getElementById('cm-talk-panel')?.dataset.talkResident === request.id;
  }
  async function send(question, offline) {
    if (!active || active.busy) return;
    const text = String(question || '').trim();
    if (!text || text.length > 600) { hooks.toast(w('请输入 1–600 个字符的问题。', 'Enter a question of 1–600 characters.')); return; }
    const request = active, session = talk().session(request.state, request.id), count = session?.exchanges?.length || 0;
    if (!session || count >= (talk().MAX_EXCHANGES || 3) || !current(request, session.id, count)) return;
    request.busy = true; request.error = null; request.draft = text; update();
    try {
      const result = await talk().respond(request.state, request.id, text,
        { ...settings, provider: offline ? 'mock' : settings.provider, language: request.language });
      if (!current(request, session.id, count)) return;
      talk().commit(request.state, request.id, text, result);
      request.busy = false; request.draft = ''; hooks.save(); update();
      doc.getElementById('cm-talk-question')?.focus?.({ preventScroll: true });
    } catch (error) {
      if (!current(request, session.id, count)) return;
      request.busy = false; request.error = { message: error?.message || String(error), question: text }; update();
    }
  }

  function settingsHTML() {
    return `<section class="cm-talk-settings" data-i18n-ignore><p>${esc(w('默认离线预设台词。连接模型后，由模型扮演这户居民并给出简短旁白；仍不替你执行行动。', 'Offline scripted replies are the default. A connected model plays this resident and supplies a short scene; it still cannot act for you.'))}</p>
      <form data-talk-settings-form><div class="cm-talk-setting-grid"><label>${esc(w('对话方式', 'Dialogue mode'))}<select name="provider"><option value="mock" ${settings.provider === 'mock' ? 'selected' : ''}>${esc(w('离线演示（不调用模型）', 'Offline demo (no model call)'))}</option><option value="openai" ${settings.provider === 'openai' ? 'selected' : ''}>OpenAI ${esc(w('兼容 API', 'compatible API'))}</option><option value="anthropic" ${settings.provider === 'anthropic' ? 'selected' : ''}>Anthropic API</option></select></label>
      <label>${esc(w('模型名称', 'Model name'))}<input name="model" value="${esc(settings.model)}" autocomplete="off" spellcheck="false" placeholder="model-name"></label>
      <label class="cm-talk-wide">${esc(w('API 基础地址', 'API base URL'))}<input name="baseUrl" type="url" value="${esc(settings.baseUrl)}" autocomplete="off" spellcheck="false" placeholder="https://api.example.com/v1"></label>
      <label class="cm-talk-wide">API Key<input name="apiKey" type="password" autocomplete="off" spellcheck="false" placeholder="${esc(settings.apiKey ? w('已有 Key；留空沿用同一接口的 Key', 'A key is held; leave blank to reuse it for this endpoint') : w('只保留在当前页面内存', 'Kept only in this page’s memory'))}"></label></div>
      <p class="cm-talk-caption">${esc(w('OpenAI 兼容地址后追加 /chat/completions；若服务要求 /v1，请写在基础地址里。Anthropic 基础地址不带 /v1，程序追加 /v1/messages。', 'OpenAI-compatible requests append /chat/completions; include /v1 in the base URL if your service requires it. Anthropic requests append /v1/messages; omit /v1 from the base URL.'))}</p>
      <p class="cm-talk-caption">${esc(w('浏览器直接请求你填写的 API 服务，需要服务允许跨域请求（CORS）。Key 与接口设置不写入游戏存档，刷新后需要重填。对话文字随原有游戏存档保留。', 'Your browser calls the API service you enter directly; it must allow browser requests (CORS). Keys and API settings never enter game saves and must be entered again after a refresh. Dialogue text follows the original game’s saving behaviour.'))}</p>
      <div class="cm-talk-setting-actions"><button type="submit" class="primary-button">${esc(w('应用对话设置', 'Apply dialogue settings'))}</button><button type="button" class="secondary-button" data-talk-clear-key>${esc(w('清除当前 Key', 'Clear current key'))}</button><button type="button" class="secondary-button" data-talk-close>${esc(w('回到社区', 'Back to the neighbourhood'))}</button></div><p id="cm-talk-settings-status" role="status" aria-live="polite"></p></form></section>`;
  }
  function settingsModal() {
    hooks.open(w('住户对话设置', 'Resident dialogue settings'), settingsHTML(),
      w('金文泰 · 短访谈', 'Clementi · short conversations'), false, { kind: 'talk-settings' });
  }
  function apply(form) {
    const values = new FormData(form), provider = String(values.get('provider') || '');
    const baseUrl = String(values.get('baseUrl') || '').trim().replace(/\/+$/, '');
    const model = String(values.get('model') || '').trim(), freshKey = String(values.get('apiKey') || '').trim();
    const apiKey = freshKey || (provider === settings.provider && baseUrl === settings.baseUrl ? settings.apiKey : '');
    let validURL = false;
    try { validURL = ['http:', 'https:'].includes(new URL(baseUrl).protocol); } catch (_) { /* Explained below. */ }
    if (!['mock', 'openai', 'anthropic'].includes(provider) || provider !== 'mock' && (!validURL || !model || !apiKey)) {
      doc.getElementById('cm-talk-settings-status').textContent = w('在线对话需要完整的 HTTP(S) 地址、模型名和 API Key。', 'Online dialogue needs a complete HTTP(S) URL, model name and API key.');
      return;
    }
    settings = { provider, baseUrl, model, apiKey };
    settingsModal();
    doc.getElementById('cm-talk-settings-status').textContent = w('对话设置已应用。', 'Dialogue settings applied.');
  }
  function notesModal() {
    const state = hooks.getState(), ids = [...new Set(archive(state).filter(s => s.exchanges.length).map(s => s.residentId))];
    const body = ids.length ? `<div class="cm-talk-notebook">${ids.map(id => {
      const sessions = archive(state, id).filter(s => s.exchanges.length).sort((a, b) => b.id - a.id);
      return `<section><div class="cm-talk-heading"><h3>${esc(name(id))}</h3><button type="button" class="cm-talk-link" data-talk-resident-open="${esc(id)}">${esc(w('查看住户', 'View resident'))} ↗</button></div>${notesHTML(state, id)}<h4>${esc(w('原始对话记录', 'Original conversation record'))}</h4>${sessions.map(s => `<details class="cm-talk-history"><summary>${esc(w('经营时间', 'Neighbourhood time'))} ${time(s.startedAt)} · ${s.exchanges.length}/3</summary>${transcript(s)}</details>`).join('')}</section>`;
    }).join('')}</div>` : `<p>${esc(w('还没有走访记录。进入社区，点击一户居民并问一个问题，就会留下对话笔记。', 'No conversation is recorded yet. Enter the neighbourhood, select a resident and ask a question to start your notes.'))}</p>`;
    hooks.open(w('住户走访笔记', 'Resident conversation notes'), body + `<div class="cm-talk-setting-actions"><button type="button" class="secondary-button" data-talk-settings>${esc(w('对话设置', 'Dialogue settings'))}</button><button type="button" class="primary-button" data-talk-close>${esc(w('回到社区', 'Back to the neighbourhood'))}</button></div>`,
      w('金文泰 · 记录与当下', 'Clementi · past conversations and current needs'), true, { kind: 'talk-notes' });
  }
  function recordNeed(id, reviewing) {
    if (!active || active.id !== id || active.busy || !playable(active.state) || !nearby(id) || hooks.getState() !== active.state) return;
    const needs = root.CM_NEEDS, state = active.state, need = needs?.get(state, id, language());
    if (!need || !(reviewing ? need.canReview : need.canConfirm)) return;
    const result = reviewing ? needs.review(state, id) : needs.confirm(state, id, archive(state, id).some(s => s.exchanges.length) ? 'dialogue' : 'issue');
    if (!result?.ok) {
      hooks.toast(language() === 'zh' && result?.message ? result.message : w('先核实这户的委托与实际安排。', 'Check this resident’s request and completed arrangements first.'));
      return;
    }
    needs.setFocus(state, id);
    hooks.save(); hooks.render?.();
    if (reviewing) {
      active.needMessage = w('回访结果已保存。', 'Follow-up saved.');
      update();
    } else {
      hooks.close();
      hooks.toast(w('需求已确认，回到社区选择安排。', 'Need confirmed. Choose an action in the neighbourhood.'));
    }
  }
  function initialize(api) {
    if (initialized) return;
    hooks = api; initialized = true;
    doc.addEventListener('submit', event => {
      const form = event.target;
      if (form.matches?.('[data-talk-form]')) { event.preventDefault(); send(new FormData(form).get('question'), false); }
      if (form.matches?.('[data-talk-settings-form]')) { event.preventDefault(); apply(form); }
    });
    doc.addEventListener('click', event => {
      const button = event.target.closest?.('button');
      if (!button || button.disabled) return;
      if (button.hasAttribute('data-talk-settings')) { settingsModal(); return; }
      if (button.hasAttribute('data-talk-notes')) { notesModal(); return; }
      if (button.hasAttribute('data-talk-close')) { hooks.close(); return; }
      if (button.hasAttribute('data-talk-confirm-need')) { recordNeed(button.dataset.talkConfirmNeed, false); return; }
      if (button.hasAttribute('data-talk-review')) { recordNeed(button.dataset.talkReview, true); return; }
      if (button.hasAttribute('data-talk-plan')) {
        const id = button.dataset.talkPlan, state = hooks.getState();
        if (!active || active.id !== id || active.busy || !playable(state)) return;
        root.CM_NEEDS?.setFocus(state, id); hooks.save(); hooks.render?.(); hooks.close(); return;
      }
      if (button.hasAttribute('data-talk-card')) { hooks.showCard(button.dataset.talkCard); return; }
      if (button.hasAttribute('data-talk-resident-open')) { hooks.showResident(button.dataset.talkResidentOpen); return; }
      if (button.hasAttribute('data-talk-prompt')) {
        const input = doc.getElementById('cm-talk-question');
        if (!input || input.disabled) return;
        input.value = questions()[Number(button.dataset.talkPrompt)] || ''; if (active) active.draft = input.value;
        input.focus?.(); return;
      }
      if (button.hasAttribute('data-talk-new')) {
        const state = hooks.getState(), id = button.dataset.talkNew, session = talk().session(state, id);
        if (!active || active.id !== id || active.busy || !playable(state) || !nearby(id) || (session?.exchanges?.length || 0) < (talk().MAX_EXCHANGES || 3)) return;
        talk().newVisit(state, id, language()); hooks.save(); refresh(id); return;
      }
      if (button.hasAttribute('data-talk-retry') && active?.error?.question) { send(active.error.question, false); return; }
      if (button.hasAttribute('data-talk-offline') && active?.error?.question) { send(active.error.question, true); return; }
      if (button.hasAttribute('data-talk-clear-key')) {
        settings.apiKey = '';
        const input = button.closest('form')?.querySelector('[name="apiKey"]');
        if (input) { input.value = ''; input.placeholder = w('只保留在当前页面内存', 'Kept only in this page’s memory'); }
        doc.getElementById('cm-talk-settings-status').textContent = w('当前页面的 Key 已清除。', 'The key has been cleared from this page.');
      }
    });
  }
  root.CM_TALK_UI = { initialize, panel, mount, refresh, focusQuestion, cancel, settingsModal, notesModal };
})(typeof window !== 'undefined' ? window : globalThis);
