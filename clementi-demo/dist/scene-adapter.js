/* Presents the Clementi simulation through Downstairs' retained Three.js scene API. */
(function (root) {
  'use strict';
  const plotIds = root.CM_DATA.plots.map(p=>p.id);
  let sceneState = { plots: new Array(plotIds.length).fill(null), unlocked: plotIds.length-1, flags: {} };
  let currentState = null, currentOptions = {}, lastModel = null;
  let completedAt = Object.create(null);
  let lastPlotsKey = null, lastSyncKey = null, lastRenderer = null;
  const adapterStats = { calls: 0, forwarded: 0, plotBuilds: 0 };
  const cards = (root.CM_DATA.cards || []).map(c => ({ id: c.id, name: c.title }));
  const cardsById = new Map((root.CM_DATA.cards || []).map(c => [c.id, c]));

  function getSelection() {
    const selected = root.CM_APP && root.CM_APP.getSelection ? root.CM_APP.getSelection() : null;
    if (typeof selected === 'string') return selected;
    return selected && (selected.selectingCard || selected.selecting || selected.selected) || null;
  }
  function cardList() {
    return cards;
  }
  function sync(state, opts) {
    if (!state) state = root.CM_APP && root.CM_APP.getState ? root.CM_APP.getState() : currentState;
    if (!state) return;
    adapterStats.calls++;
    currentOptions = Object.assign({}, currentOptions, opts || {});
    if (lastModel !== state) {
      lastModel = state;
      completedAt = Object.create(null);
      lastPlotsKey = null; lastSyncKey = null; lastRenderer = null;
      sceneState = { plots: new Array(plotIds.length).fill(null), unlocked: plotIds.length-1, flags: {} };
    }
    currentState = state;
    sceneState.flags = state.flags || {};
    sceneState.groups = state.groups || {};
    sceneState.events = state.events || [];
    sceneState.projects = state.projects || [];
    sceneState.issues = state.issues || [];
    sceneState.simTime = state.time || 0;
    const plotsKey = JSON.stringify([state.plots, state.projects]);
    if (plotsKey !== lastPlotsKey) {
      lastPlotsKey = plotsKey; adapterStats.plotBuilds++;
      const projectsByPlot = new Map((state.projects || []).map(project => [project.plotId + ':' + project.cardId, project]));
      sceneState.plots = plotIds.map(function (id, index) {
      if (root.CM_DATA.plots[index].kind==='locked') return null;
      const p = state.plots && state.plots[id];
      if (!p || !p.cardId || p.status === 'available' || p.status === 'locked') return null;
      const project = projectsByPlot.get(id + ':' + p.cardId);
      const building = p.status === 'building';
      const key = id + ':' + p.cardId;
      if (!building && completedAt[key] == null) completedAt[key] = state.time || 0;
      return {
        cardId: p.cardId,
        placement: p.placement || project && project.placement || {x:0,z:0,rotation:0},
        status: building ? 'building' : 'complete',
        progress: building && project ? Math.max(0, Math.min(1, 1 - project.remaining / Math.max(1, project.total))) : building ? 0 : 1,
        builtRound: building ? null : p.completedAt == null ? completedAt[key] : p.completedAt
      };
      });
    }
    root.Downstairs.cards = cardList();
    const selected = Object.prototype.hasOwnProperty.call(currentOptions, 'selectingCard') ? currentOptions.selectingCard : getSelection();
    const c = cardsById.get(selected);
    if (root.HDBScene && root.HDBScene.ready) {
      const sceneOptions = {
        placed: true,
        landIndex: 0,
        view: root.HDBScene.view || 'neighborhood',
        selected: selected || null,
        selectedPlot: currentOptions.selectedPlot || null,
        showLand: currentOptions.showLand !== false,
        validPlots: c && Array.isArray(c.land) ? c.land : [],
        issues: (Array.isArray(currentOptions.issues) ? currentOptions.issues : (state.issues || []).filter(function (issue) { return issue.status === 'open'; })).filter(function(issue){return (issue.channel || root.CM_DATA.issueChannels[issue.id])==='world';}).slice(0,3),
        focusIssue: currentOptions.focusIssue || null,
        language: currentOptions.language || 'zh',
        paused: currentOptions.paused !== false,
        suspended: !!currentOptions.suspended,
        simTime: Number.isFinite(currentOptions.simTime) ? currentOptions.simTime : state.time || 0,
        placement: currentOptions.placement || {x:0,z:0,rotation:0},
        tab: 'facility'
      };
      const syncKey = JSON.stringify([plotsKey, state.groups, state.flags, state.eventSerial || 0, sceneOptions]);
      if (lastRenderer === root.HDBScene && syncKey === lastSyncKey) return;
      lastRenderer = root.HDBScene; lastSyncKey = syncKey; adapterStats.forwarded++;
      root.HDBScene.sync(sceneState, sceneOptions);
    }
  }
  root.Downstairs = { cards: cardList() };
  root.DownstairsUI = {
    scenePlot: function (index) {
      const id = plotIds[index];
      if (id && root.CM_APP && root.CM_APP.showPlot) root.CM_APP.showPlot(id);
    },
    sceneResident: function (id) {
      if (root.CM_APP && root.CM_APP.showResident) root.CM_APP.showResident(id);
    },
    sceneBuilding: function () {
      if (root.HDBScene && root.HDBScene.view === 'overview') { root.HDBScene.showNeighborhood(); return; }
      if (root.CM_APP && root.CM_APP.showResidents) root.CM_APP.showResidents();
      else if (root.CM_APP && root.CM_APP.showResident) root.CM_APP.showResident('chen');
    },
    sceneLand: function () { if (root.HDBScene) root.HDBScene.showNeighborhood(); },
    sceneHover: function (text) {
      const element = document.getElementById('world-hover');
      if (!element) return;
      element.textContent = text || '';
      element.hidden = !text;
    },
    appSceneReady: function () { sync(currentState || (root.CM_APP && root.CM_APP.getState && root.CM_APP.getState()), currentOptions); }
  };
  root.CM_SCENE = {
    sync: sync,
    focusIssue: function (id) { return root.HDBScene && root.HDBScene.focusIssue ? root.HDBScene.focusIssue(id) : false; },
    plotIds: plotIds.slice(),
    diagnostics: function () { const scene = root.HDBScene && root.HDBScene.diagnostics ? root.HDBScene.diagnostics() : { ready: false }; return Object.assign({}, scene, { adapter: Object.assign({}, adapterStats) }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
