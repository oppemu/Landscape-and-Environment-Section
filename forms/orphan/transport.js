/* One authenticated Apps Script backend. Never use no-cors for writes. */
(function (root) {
  'use strict';
  const GOOGLE_ORIGIN = /^https:\/\/(?:[a-z0-9-]+\.)?script\.googleusercontent\.com$|^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/;
  // pending ติดตามคำตอบเครือข่ายในแท็บนี้ ต่างจาก outbox ที่เก็บข้อมูลและรูปข้ามการรีเฟรช
  const pending = new Map();
  let peer = null, peerOrigin = '', channel = '', frame = null, readyPromise = null, transportEndpoint = '';
  // สร้างรหัสสุ่ม 128 บิตให้ช่องสื่อสารและคำขอ ไม่ใช้เลขลำดับที่เดาได้
  function uid() {
    if (!root.crypto || !root.crypto.getRandomValues) throw new Error('กรุณาเปิดแอปผ่าน HTTPS');
    return Array.from(root.crypto.getRandomValues(new Uint32Array(4))).map(n => n.toString(16).padStart(8, '0')).join('');
  }
  function error(message, code) { const e = new Error(message); e.code = code; return e; }
  // รับเฉพาะลิงก์ Google /exec และเว็บที่มี origin ไม่ยอมให้เปิดส่งจาก file://
  function endpoint() {
    const value = root.OrphanConfig && root.OrphanConfig.apiUrl;
    if (!/^https:\/\/script\.google\.com\/(?:macros|a\/macros\/mahidol\.ac\.th)\/s\/[A-Za-z0-9_-]+\/exec$/.test(value || '')) throw error('ยังไม่ได้ใส่ลิงก์ Deploy /exec ใน config.js', 'NOT_CONFIGURED');
    if (location.protocol === 'file:' || location.origin === 'null') throw error('หน้านี้เปิดจากไฟล์ในเครื่อง จึงยังส่งไม่ได้ ให้เปิด index.html ด้วย Open with Live Server ใน VS Code หรือเปิดเว็บที่เผยแพร่แล้ว', 'BAD_ORIGIN');
    if(location.protocol!=='https:' && !/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/.test(location.origin))throw error('ใช้ HTTPS หรือเปิดผ่าน localhost ของ Live Server', 'UNSAFE_ORIGIN');
    return value;
  }
  // สร้าง iframe ช่องส่งเพียงชุดเดียว เปลี่ยนลิงก์ได้เมื่อไม่มีคำขอค้างเท่านั้น
  function getReady() {
    let configured;try{configured=endpoint();}catch(e){return Promise.reject(e);}
    if(transportEndpoint && transportEndpoint!==configured){
      if(pending.size)return Promise.reject(error('ลิงก์เปลี่ยนระหว่างรอผล กรุณารอให้ตรวจรายการเดิมก่อน','CONFIG_CHANGED'));
      if(frame)frame.remove();peer=null;peerOrigin='';frame=null;readyPromise=null;
    }
    transportEndpoint=configured;
    if (peer) return Promise.resolve();
    if (readyPromise) return readyPromise;
    readyPromise = new Promise((resolve, reject) => {
      let url;
      try { url = new URL(endpoint()); channel = uid(); } catch (e) { reject(e); return; }
      url.searchParams.set('mode', 'relay'); url.searchParams.set('channel', channel); url.searchParams.set('origin', location.origin);
      frame = document.createElement('iframe'); frame.title = 'เชื่อมต่อฐานข้อมูล'; frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true'); frame.referrerPolicy = 'no-referrer';
      const timeout = setTimeout(() => { cleanup(); reject(error('ยังไม่ได้รับการตอบกลับจาก Google ภายใน 20 วินาที [CONNECT_TIMEOUT] ขั้นนี้ยังไม่ส่งข้อมูล ต้นทาง: '+location.origin+' ตรวจ ORPHAN_CONFIG.allowedOrigins และ Deployment หากเบราว์เซอร์บล็อก iframe ให้แจ้งผู้ดูแล ห้ามปิดการตรวจสิทธิ์เพื่อข้ามปัญหา', 'CONNECT_TIMEOUT')); }, 20000);
      function cleanup() { clearTimeout(timeout); root.removeEventListener('message', onReady); }
      // ตรวจต้นทาง Google และ channel สุ่มก่อนยอมรับหน้าต่างตอบกลับ
      function onReady(event) {
        const m = event.data;
        if (!m || !['mu:ready','mu:error'].includes(m.type) || m.channel !== channel || !GOOGLE_ORIGIN.test(event.origin) || !event.source) return;
        if (m.type === 'mu:error') {
          cleanup(); reject(error(m.error && m.error.message || 'ตรวจการตั้งค่า Apps Script', m.error && m.error.code || 'SETUP_ERROR')); return;
        }
        // Google nests its execution frame inside the /exec frame. Pin the authenticated
        // execution source after verifying its unguessable per-load channel and Google origin.
        peer = event.source; peerOrigin = event.origin; cleanup(); resolve();
      }
      root.addEventListener('message', onReady); frame.src = url.href; document.body.appendChild(frame);
    }).catch(e => { if (frame) frame.remove(); frame = null; readyPromise = null; peer = null; throw e; });
    return readyPromise;
  }
  root.addEventListener('message', event => {
    const m = event.data;
    if (!peer || event.source !== peer || event.origin !== peerOrigin || !m || m.type !== 'mu:response' || m.channel !== channel) return;
    const job = pending.get(m.id); if (!job) return;
    pending.delete(m.id); clearTimeout(job.timer);
    if (!m.response || m.response.ok !== true) {
      const info = m.response && m.response.error;
      job.reject(error(typeof info === 'string' ? info : info && info.message || 'บันทึกไม่สำเร็จ', info && info.code || 'SERVER_REJECTED'));
    } else job.resolve(m.response.result);
  });
  // ฟอร์มย่อยใช้ช่องส่งของ parent เดียวกัน; timeout คือยังไม่ทราบผล ไม่ใช่หลักฐานว่าชีตไม่ได้รับ
  function request(req, expectedEndpoint) {
    return getReady().then(() => new Promise((resolve, reject) => {
      if(expectedEndpoint && (endpoint()!==expectedEndpoint || transportEndpoint!==expectedEndpoint)){reject(error('ลิงก์เปลี่ยนระหว่างตรวจบัญชี ยังไม่ได้ส่งข้อมูล กรุณาตรวจลิงก์เดิม','CONFIG_CHANGED'));return;}
      const id = uid();
      const timer = setTimeout(() => { pending.delete(id); reject(error('ยังยืนยันผลไม่ได้ กรุณาลองส่งรายการเดิมอีกครั้ง ระบบจะตรวจไม่ให้บันทึกซ้ำ', 'OUTCOME_UNCERTAIN')); }, 45000);
      pending.set(id, {resolve, reject, timer});
      peer.postMessage({type:'mu:request', channel, id, request:req}, peerOrigin);
    }));
  }
  root.OrphanTransport = Object.freeze({request,uid,endpoint});
})(window);
