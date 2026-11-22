(function (root) {
  'use strict';
  /** Owns name selection and device storage. A remembered name never authenticates a user. */
  function create({ hasWork, resetWork, onChange }) {
    const $ = (id) => document.getElementById(id);
    let name = '';
    let pendingName = '';
    let storage;
    try {
      storage = root.localStorage;
    } catch (error) {
      storage = null;
    }
    // แสดงเตือนเมื่อเบราว์เซอร์จำชื่อไม่ได้ โดยไม่อ้างว่าบันทึกชื่อสำเร็จ
    function storageWarning(show) {
      $('profile-storage-status').hidden = !show;
      $('profile-storage-status').textContent =
        'จำชื่อบนอุปกรณ์ไม่ได้ ใช้ชื่อนี้ได้เฉพาะครั้งนี้';
    }
    // อัปเดตชื่อและอักษรย่อในหัวแอปด้วยข้อความ ไม่แทรก HTML
    function updateLabels() {
      document.body.classList.toggle('profile-required',!name);
      $('profile-short').textContent = name || 'ใส่ชื่อ';
      $('profile-initial').textContent = name ? Array.from(name)[0] : '?';
      $('module-profile-name').textContent = name || 'ชื่อผู้กรอก';
    }
    // กรองรายชื่อให้เลือกตามข้อความที่พิมพ์ ไม่สร้างบัญชีใหม่
    function hideSuggestions(){const box=$('roster-options');box.replaceChildren();box.hidden=true;$('profile-name').setAttribute('aria-expanded','false');}
    let privateNames = null, rosterRequest = null;
    const localRoster = root.location.origin === 'http://127.0.0.1:5500';
    const canonical = text => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
    function readRoster() {
      if (!localRoster || privateNames || rosterRequest) return;
      const controller = new AbortController();
      const timeout = root.setTimeout(() => controller.abort(), 3000);
      rosterRequest = root.fetch('http://127.0.0.1:17843/pa-roster', {
        method: 'GET', headers: {'X-Waste-PA-Local':'names-v1'},
        credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', redirect:'error', signal:controller.signal
      }).then(response => {
        if (!response.ok) throw new Error('Roster unavailable');
        return response.json();
      }).then(result => {
        if (result.version !== 1 || !Array.isArray(result.names) ||
            !result.names.every(value => typeof value === 'string' && value.length <= 120))
          throw new Error('Roster format');
        privateNames = result.names.map(value => value.trim()).filter(Boolean);
        if ($('profile-dialog').open && document.activeElement === $('profile-name')) filterRoster();
      }).catch(() => {}).finally(() => {root.clearTimeout(timeout);rosterRequest=null;});
    }
    function matchesName(value, query) {
      const normalized = canonical(value);
      const withoutTitle = normalized.replace(/^(?:\u0e19\u0e32\u0e07\u0e2a\u0e32\u0e27|\u0e19\u0e32\u0e22|\u0e19\u0e32\u0e07|\u0e19\u0e2a\.|\u0e19\.\u0e2a\.)\s*/u, '');
      if(remoteRoster)return withoutTitle.startsWith(query);
      return normalized.startsWith(query) || withoutTitle.startsWith(query) ||
        withoutTitle.split(' ').some(part => part.startsWith(query));
    }
    const remoteRoster = root.location.origin === 'https://oppemu.github.io' && /^\/Landscape-and-Environment-Section(?:\/|$)/.test(root.location.pathname);
    const publicNames = Array.isArray(root.HubPublicHomepageNames) ? root.HubPublicHomepageNames : [];
    function filterRoster() {
      const box=$('roster-options'),input=$('profile-name'),query=input.value.trim();hideSuggestions();
      if(!/\p{L}/u.test(query)||name)return;
      box.hidden=false;input.setAttribute('aria-expanded','true');
      const fallback=typeof HubStaffDirectory!=='undefined'&&Array.isArray(HubStaffDirectory)?HubStaffDirectory.map(p=>p.name):[];
      const unique=new Map(), source=remoteRoster?publicNames:privateNames||fallback;
      for(const value of source) if(typeof value==='string'&&matchesName(value,canonical(query))) unique.set(canonical(value),value);
      const matches=Array.from(unique.values(),name=>({name})).slice(0,8);
      for(const person of matches){const button=document.createElement('button');button.type='button';button.textContent=person.name;
        button.addEventListener('click',()=>{input.value=person.name;$('profile-error').textContent='';hideSuggestions();$('profile-start').focus();});
        button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();(button.nextElementSibling||button).focus();}else if(event.key==='ArrowUp'){event.preventDefault();(button.previousElementSibling||input).focus();}else if(event.key==='Escape'){event.preventDefault();hideSuggestions();input.focus();}});
        box.append(button);}
      if(remoteRoster&&unique.size>8){const hint=document.createElement('p');hint.textContent='พิมพ์เพิ่มเพื่อดูชื่อที่ตรงขึ้น';hint.setAttribute('role','status');box.append(hint);}
      if(!matches.length){const p=document.createElement('p');p.textContent='ใช้ชื่อที่พิมพ์นี้ได้ แล้วกดเข้าสู่ระบบ';p.setAttribute('role','status');box.append(p);}
    }
    // เปิดกล่องเลือกชื่อและเติมค่าเดิมเพื่อแก้ไขได้
    function open() {
      
      $('profile-name').value = name;
      $('profile-title').textContent = 'งานภูมิทัศน์และสิ่งแวดล้อม';
      $('profile-start').textContent = 'เข้าสู่ระบบ';
      $('profile-start').hidden = !!name;
      $('profile-name').readOnly = !!name;
      $('forget-profile').hidden = !name;
      $('profile-error').textContent = '';
      hideSuggestions();
      if (!$('profile-dialog').open) $('profile-dialog').showModal();
      if (!name) readRoster();
    }
    // ตรวจชื่อในรายชื่อ ขอคำยืนยันเมื่อมีแบบร่างแล้วจึงล้างงานหน้าจอของคนเดิม
    function apply(value, confirmed = false) {
      const selected = HubProfile.validateName(value);
      const change = HubProfile.change(name, selected, hasWork(), confirmed);
      if (change.requiresConfirmation) {
        pendingName = selected;
        $('change-dialog').showModal();
        return;
      }
      if (change.reset) resetWork();
      
      name = change.name;
      storageWarning(!HubProfile.save(storage, name).persistent);
      updateLabels();
      $('profile-dialog').close();
      onChange(change.reset);
    }
    // ถ้ายกเลิกเลือกชื่อให้กลับภาพรวม ไม่เปิดแบบฟอร์มโดยไม่มีชื่อ
    function cancelUnnamedRoute() {
      if (
        !name &&
        HubConfig.modules.some((item) => '#' + item[0] === location.hash)
      )
        location.hash = 'overview';
    }
    $('profile-name').addEventListener('focus', readRoster);
    $('profile-name').addEventListener('input', ()=>{filterRoster();});
    $('profile-name').addEventListener('keydown',event=>{if(event.key==='ArrowDown'){const first=$('roster-options').querySelector('button');if(first){event.preventDefault();first.focus();}}else if(event.key==='Escape'){event.preventDefault();hideSuggestions();}});
    for (const id of ['profile-chip', 'module-profile', 'nav-profile'])
      $(id).addEventListener('click', open);
    // Clicking the backdrop or empty dialog space dismisses only an existing profile, never the first-login gate.
    $('profile-dialog').addEventListener('click', event => {if(name && event.target === $('profile-dialog')) $('profile-dialog').close();});
    $('profile-dialog').addEventListener('cancel', event => {if(!name)event.preventDefault();else cancelUnnamedRoute();});
    $('profile-form').addEventListener('submit', (event) => {
      event.preventDefault();
      if(name)return;
      try {
        apply($('profile-name').value);
      } catch (error) {
        $('profile-error').textContent = error.message;
      }
    });
    $('confirm-change').addEventListener('click', () => {
      $('change-dialog').close();
      apply(pendingName, true);
      pendingName = '';
    });
    $('cancel-change').addEventListener('click', () => {
      $('change-dialog').close();
      pendingName = '';
    });
    $('forget-profile').addEventListener('click', async () => {
      if(hasWork() && !(root.MUDialog ? await root.MUDialog.confirm('ออกจากระบบและล้างร่างในหน้านี้? รายการที่ส่งค้างยังเก็บไว้') : root.confirm('ออกจากระบบและล้างร่างในหน้านี้? รายการที่ส่งค้างยังเก็บไว้'))) return;
      const removed = HubProfile.forget(storage);
      resetWork();
      
      name = '';
      $('forget-profile').hidden=true;$('profile-start').hidden=false;$('profile-start').textContent='เข้าสู่ระบบ';$('profile-name').readOnly=false;
      updateLabels();
      onChange(true);
      $('profile-name').value = '';
      filterRoster();
      $('profile-error').textContent = removed
        ? ''
        : 'ล้างชื่อครั้งนี้แล้ว แต่ลบชื่อที่จำไว้ไม่ได้ กรุณาตรวจการตั้งค่าเบราว์เซอร์';
    });
    const remembered = HubProfile.load(storage);
    name = remembered.name;
    storageWarning(!remembered.persistent);
    updateLabels();
    root.HubSelectedProfile = Object.freeze({get: () => (name?{name,email:'',source:'public-name'}:null)});
    return { open, getName: () => name, getProfile: () => (name?{name,email:'',source:'public-name'}:null) };
  }
  root.HubProfileController = Object.freeze({ create });
})(window);
