/* จัดวงจรชีวิต iframe ของแต่ละฟอร์มและส่งบริบทที่จำเป็นให้โมดูล
 * การเปลี่ยน iframe ไม่เท่ากับยืนยันว่าข้อมูลเข้าชีต คิวถาวรมีเจ้าของและใบรับรองแยกใน unified-client */
(function (root) {
  'use strict';
  /** Only the visible owned iframe can update the shared status line. */
  // เฉพาะ iframe ที่เป็นของแอปและกำลังแสดงจึงเปลี่ยนสถานะกลางได้
  function acceptsStatus(event, frames, origin) {
    return (
      event.origin === origin &&
      frames.some(
        (frame) => frame.contentWindow === event.source && !frame.hidden,
      )
    );
  }
  function create({ report, getName, openProfile }) {
    const $ = (id) => document.getElementById(id);
    const modules = HubConfig.modules;
    const desktop = root.matchMedia?.('(min-width: 900px)');
    const bankImport = HubConfig.bankImport || null;
    const bankRoute = bankImport ? bankImport.route : null;
    const frames = () => Array.from($('frames').children);
    // ส่งชื่อแสดงผลให้ฟอร์ม ไม่ใช้ชื่อนี้อนุญาตสิทธิ์เซิร์ฟเวอร์
    function postProfile(frame) {
      const name = getName();
      const target = location.protocol === 'file:' ? '*' : location.origin;
      frame.contentWindow.postMessage(
        {
          type: 'HUB_RUNTIME',
          runtime: root.HUB_RUNTIME || { mode: 'preview', reportEndpoint: '' },
        },
        target,
      );
      frame.contentWindow.postMessage(
        { type: 'HUB_PROFILE', name, profile: root.HubSelectedProfile && root.HubSelectedProfile.get() || {name} },
        target,
      );
    }
    /** Notify only a currently mounted, visible frame after navigation or loading. */
    function activate(frame) {
      if (frame.hidden || !frames().includes(frame)) return;
      const target = location.protocol === 'file:' ? '*' : location.origin;
      frame.contentWindow.postMessage({ type: 'HUB_ACTIVATE' }, target);
    }
    // เลือกหน้าจาก hash ซ่อน iframe อื่นโดยคงแบบร่างจนผู้ใช้ยืนยันรีเซ็ต
    function route() {
      let id = location.hash.slice(1) || 'overview';
      if (id === HubConfig.dashboardRoute && desktop?.matches === false) id = 'overview';
      let selected = modules.find((item) => item[0] === id);
      if (!selected && !['overview', 'forms', 'report', 'report-landscape', 'settings', 'pa-online', 'pa-work-report', bankRoute].includes(id)) id = 'overview';
      if (selected && id !== 'food' && !getName()) {
        id = 'overview';
        selected = null;
        openProfile();
      }
      $('overview').hidden = id !== 'overview';
      $('forms-view').hidden = id !== 'forms';
      if ($('settings-view')) $('settings-view').hidden = id !== 'settings';
      const pa = document.getElementById('pa-online-view'), paNav = document.getElementById('nav-pa-online');
      if (pa) pa.hidden = id !== 'pa-online';
      const paWork=document.getElementById('pa-work-view'); if(paWork) paWork.hidden=id!=='pa-work-report';
      if (paNav) {
        if (id === 'pa-online') paNav.setAttribute('aria-current', 'page');
        else paNav.removeAttribute('aria-current');
      }
      const settingsNav = $('nav-settings');
      if (settingsNav) { if (id === 'settings') settingsNav.setAttribute('aria-current', 'page'); else settingsNav.removeAttribute('aria-current'); }
      $('report-view').hidden = id !== 'report';
      if($('landscape-report-view')) $('landscape-report-view').hidden = id !== 'report-landscape';
      if ($('bank-import-view')) $('bank-import-view').hidden = !bankRoute || id !== bankRoute;
      $('module-view').hidden = !selected;
      document.body.classList.toggle('module-active', !!selected);
      const isDashboard = !!selected && id === HubConfig.dashboardRoute;
      document.body.classList.toggle('dashboard-active', isDashboard);
      const moduleBack = $('module-view').querySelector('.back-button');
      moduleBack.href = isDashboard ? '#overview' : '#forms';
      moduleBack.setAttribute('aria-label', isDashboard ? 'กลับหน้าแรก' : 'กลับหน้าแบบฟอร์ม');
      if ($('dashboard-overview')) $('dashboard-overview').hidden = !isDashboard;
      if (isDashboard && root.HubDashboard && root.HubDashboard.activate) root.HubDashboard.activate();
      for (const [navId, active] of [
        ['nav-home', id === 'overview'],
        ['nav-forms', id === 'forms' || id === 'pa-work-report' || id === bankRoute || (!!selected && !isDashboard)],
        ['nav-dashboard', isDashboard],
        ['nav-report', ['report','report-landscape'].includes(id)],
      ]) {
        if (active) $(navId).setAttribute('aria-current', 'page');
        else $(navId).removeAttribute('aria-current');
      }
      for(const [key,routeId] of [['nav-report-waste','report'],['nav-report-landscape','report-landscape']]){const item=$(key);if(item){if(id===routeId)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');}}
      if(id==='report-landscape' && root.HubLandscapeReport) root.HubLandscapeReport.enter();
      frames().forEach((frame) => {
        frame.hidden = true;
      });
      if (selected) {
        $('module-title').textContent = selected[1];
        $('module-status').textContent = isDashboard
          ? 'แผนที่ต้นไม้ · ข้อมูลอ่านอย่างเดียว'
          : 'ฐานข้อมูลใหม่ · เชื่อมผ่านบัญชี Google';
        $('module-status').dataset.level = 'info';
        let frame = $('frame-' + id);
        if (!frame) {
          frame = document.createElement('iframe');
          frame.id = 'frame-' + id;
          frame.title = selected[1];
          frame.setAttribute(
            'sandbox',
            id === HubConfig.dashboardRoute
              ? 'allow-scripts allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox'
              : 'allow-scripts allow-same-origin allow-modals allow-forms',
          );
          frame.src = 'modules/' + selected[2];
          frame.addEventListener('load', () => {
            postProfile(frame);
            activate(frame);
          });
          $('frames').append(frame);
        }
        frame.hidden = false;
        activate(frame);
      }
      if (id === 'report') (report.enter || report.render)(); // อ่านข้อมูลสดเมื่อเปิดรายงานหากเชื่อม Google แล้ว
    }
    for (const [id, title, path, symbol] of [...modules, ['pa-work-report', 'รายงานการปฏิบัติงาน', null, 'check']]) {
      if (id === HubConfig.dashboardRoute) continue;
      const card = document.createElement('a');
      card.href = '#' + id;
      card.className = 'card card-' + symbol;
      const mark = document.createElement('span');
      mark.className = 'card-icon';
      mark.append(HubIcons.create(symbol));
      const label = document.createElement('h3');
      label.textContent = title;
      const arrow = document.createElement('span');
      arrow.className = 'card-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.append(HubIcons.create('arrow'));
      card.append(mark, arrow, label);
      $('cards').append(card);
    }
    if (bankImport) {
      const card = document.createElement('a');
      card.id = 'bank-import-card';
      card.href = '#' + bankRoute;
      card.className = 'card card-receive';
      const mark = document.createElement('span'); mark.className = 'card-icon'; mark.append(HubIcons.create('receive'));
      const label = document.createElement('h3'); label.textContent = bankImport.title;
      const arrow = document.createElement('span'); arrow.className = 'card-arrow'; arrow.setAttribute('aria-hidden','true'); arrow.append(HubIcons.create('arrow'));
      card.append(mark, arrow, label); $('cards').append(card);
    }
    for (const [id, symbol] of [
      ['nav-home', 'home'],
      ['nav-forms', 'check'],
      ['nav-dashboard', 'map'],
      ['nav-report', 'report'],
      ['nav-profile', 'person'],
    ]) {
      $(id).querySelector('.nav-icon').replaceChildren(HubIcons.create(symbol));
    }
    root.addEventListener('message', (event) => {
      const owned = frames();
      if (
        !HubProfile.trustedMessage(event, owned, location.origin) ||
        !event.data
      )
        return;
      const frame = owned.find((item) => item.contentWindow === event.source);
      if (event.data.type === 'hub:ready') postProfile(frame);
      if (
        event.data.type === 'hub:module-status' &&
        acceptsStatus(event, owned, location.origin) &&
        typeof event.data.message === 'string'
      ) {
        $('module-status').textContent = event.data.message.slice(0, 180);
        $('module-status').dataset.level =
          event.data.level === 'error' ? 'error' : 'info';
      }
    });
    desktop?.addEventListener?.('change', () => {
      if (location.hash.slice(1) === HubConfig.dashboardRoute) route();
    });
    root.addEventListener('hashchange', () => {
      route();
      root.scrollTo(0, 0);
    });
    return {
      route,
      hasDrafts: () => frames().length > 0,
      reset: () => $('frames').replaceChildren(),
      broadcastProfile: () => frames().forEach(postProfile),
    };
  }
  root.HubModuleHost = { create, acceptsStatus };
  if (typeof module !== 'undefined') module.exports = root.HubModuleHost;
})(typeof window === 'undefined' ? globalThis : window);
