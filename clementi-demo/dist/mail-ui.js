/* Animated resident post. Public world observations never enter this mailbox. */
(function (root) {
  'use strict';
  const views = new WeakMap();
  const channel = issue => root.CM_DATA?.issueChannels?.[issue.id] || issue.channel;
  const text = (language, zh, en) => language === 'en' ? en : zh;
  function clearTimer(timer) { if (timer != null) root.clearTimeout?.(timer); }
  function install(button) {
    let view = views.get(button);
    if (view) return view;
    view = { state: null, seen: new Set(), delivery: 0, arrivalTimer: null, openTimer: null };
    views.set(button, view);
    button.innerHTML = '<span class="mailbox-envelope" aria-hidden="true"><span class="mail-envelope-back"></span><span class="mail-envelope-paper"><i></i><i></i><i></i></span><span class="mail-envelope-left"></span><span class="mail-envelope-right"></span><span class="mail-envelope-front"></span><span class="mail-envelope-flap"></span><span class="mail-envelope-seal">CM</span></span><span class="mailbox-caption"><strong class="mailbox-label"></strong><small class="mailbox-hint"></small></span><span class="mailbox-count" aria-hidden="true"></span>';
    button.classList.add('is-envelope');
    button.addEventListener?.('animationend', event => {
      if (event.animationName === 'cm-mail-delivery') {
        button.classList.remove('is-arriving'); clearTimer(view.arrivalTimer); view.arrivalTimer = null;
      }
      if (event.animationName === 'cm-mail-open') {
        button.classList.remove('is-opening'); clearTimer(view.openTimer); view.openTimer = null;
      }
    });
    return view;
  }
  function setText(button, selector, value) {
    const element = button.querySelector?.(selector);
    if (element && element.textContent !== value) element.textContent = value;
  }
  function animateArrival(button, view) {
    clearTimer(view.arrivalTimer);
    button.classList.remove('is-arriving');
    // Restart only for a newly delivered letter, never the periodic game render.
    void button.offsetWidth;
    button.classList.add('is-arriving');
    view.delivery += 1;
    if (button.dataset) button.dataset.mailDelivery = String(view.delivery);
    view.arrivalTimer = root.setTimeout?.(() => {
      button.classList.remove('is-arriving'); view.arrivalTimer = null;
    }, 1700);
  }
  function render(state, button, language = 'zh') {
    if (!button) return;
    const view = install(button), mails = (state.issues || []).filter(issue => channel(issue) === 'mail');
    if (view.state !== state) {
      view.state = state; view.seen.clear(); view.delivery = 0;
      clearTimer(view.arrivalTimer); clearTimer(view.openTimer);
      button.classList.remove('is-arriving', 'is-opening');
      if (button.dataset) button.dataset.mailDelivery = '0';
      // A restored already-read postbag is history, rather than a new delivery.
      mails.filter(issue => issue.read).forEach(issue => view.seen.add(issue.id));
    }
    const arriving = mails.some(issue => !view.seen.has(issue.id));
    mails.forEach(issue => view.seen.add(issue.id));
    const unread = mails.filter(issue => !issue.read).length;
    const waiting = mails.filter(issue => issue.status === 'open');
    const overdue = waiting.some(issue => Number(issue.age) >= 40);
    const label = text(language, '居民来信', 'Resident post');
    const hint = unread ? text(language, '点击拆阅新来信', 'Open your new letters') : overdue
      ? text(language, '有来信等你回应', 'A neighbour is waiting') : mails.length
        ? text(language, '回看住户来信', 'Review resident letters') : text(language, '等待邻居来信', 'Waiting for letters');
    setText(button, '.mailbox-label', label);
    setText(button, '.mailbox-hint', hint);
    setText(button, '.mailbox-count', String(unread));
    const badge = button.querySelector?.('.mailbox-count');
    if (badge) badge.hidden = unread === 0;
    button.classList.toggle('has-unread', unread > 0);
    button.classList.toggle('has-post', mails.length > 0);
    button.setAttribute('aria-label', label + text(language, '，未读 ', ', unread ') + unread + ' · ' + hint);
    button.setAttribute('title', hint);
    if (arriving) animateArrival(button, view);
  }
  function open(button) {
    if (!button) return;
    const view = install(button);
    clearTimer(view.openTimer);
    button.classList.remove('is-opening'); void button.offsetWidth; button.classList.add('is-opening');
    view.openTimer = root.setTimeout?.(() => {
      button.classList.remove('is-opening'); view.openTimer = null;
    }, 750);
  }
  root.CM_MAIL_UI = { render, open };
})(typeof window !== 'undefined' ? window : globalThis);
