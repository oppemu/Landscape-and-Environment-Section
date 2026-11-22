/* เชื่อมหน้าเว็บ Live Server/GitHub กับ Apps Script ผ่าน relay
 * ไม่มีคิว ไม่มีส่งซ้ำอัตโนมัติ และสำเร็จเมื่อหลังบ้านยืนยัน ok:true เท่านั้น */
(function () {
  'use strict';
  const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
  const channel = randomId();
  let frame = null, peer = null, peerOrigin = '', readyPromise = null, readyResolve, readyReject, readyTimer;
  const pending = new Map();
  function isGoogleOrigin(origin) {
    try { const u = new URL(origin); return u.protocol === 'https:' && (u.hostname === 'script.google.com' || u.hostname === 'script.googleusercontent.com' || u.hostname.endsWith('-script.googleusercontent.com')); }
    catch (_) { return false; }
  }
  function rejectPending(message) {
    pending.forEach(p => { clearTimeout(p.timer); p.reject(new Error(message)); });
    pending.clear();
  }
  window.addEventListener('message', function (event) {
    const m = event.data;
    if (!m || m.channel !== channel || !isGoogleOrigin(event.origin) || !event.source) return;
    if (peer && (event.source !== peer || event.origin !== peerOrigin)) return;
    if (m.type === 'hazard:ready' && readyResolve) {
      if(m.app!=='mahidol-hazard-standalone'||m.contract!=='pages-mahidol-single-row-v1'){clearTimeout(readyTimer);readyReject(new Error('WRONG_APP'));readyResolve=null;readyReject=null;return;}
      peer = event.source; peerOrigin = event.origin; clearTimeout(readyTimer);
      readyResolve(); readyResolve = null; readyReject = null;
    } else if (m.type === 'hazard:error') {
      const message = String(m.error || 'เชื่อมต่อ Google ไม่สำเร็จ');
      if (readyReject) { clearTimeout(readyTimer); readyReject(new Error(message)); readyResolve = null; readyReject = null; }
      rejectPending(message);
    } else if (m.type === 'hazard:response' && peer) {
      const p = pending.get(m.id); if (!p) return;
      clearTimeout(p.timer); pending.delete(m.id);
      if (m.response && m.response.ok === true && m.response.result && m.response.result.ok === true && m.response.result.committed === true && m.response.result.requestId === p.requestId) p.resolve(m.response.result);
      else p.reject(new Error(String(m.response && m.response.error || 'ยังยืนยันการบันทึกไม่ได้')));
    }
  });
  function connect() {
    if (readyPromise) return readyPromise;
    const cfg = window.HAZARD_CONFIG || {};
    let url;
    try {
      url = new URL(cfg.deploymentUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/\/exec$/.test(url.pathname)) throw Error();
      if(location.protocol!=='https:' && !/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/.test(location.origin)) throw Error();
    } catch (_) { return Promise.reject(new Error('ใส่ลิงก์ /exec ใน config.js และเปิดหน้าเว็บผ่าน Live Server หรือ GitHub Pages')); }
    readyPromise = new Promise((resolve, reject) => {
      readyResolve = resolve; readyReject = reject;
      readyTimer = setTimeout(() => { readyResolve = null; readyReject = null; reject(new Error('เชื่อมต่อ Google ไม่สำเร็จ หน้าเว็บนี้ใช้ origin: '+location.origin+' ตรวจ allowedOrigins ในหลังบ้านให้ตรงแล้ว Deploy ใหม่ หากตรงแล้วให้เปิดลิงก์ /exec ของฟอร์มในแท็บใหม่เพื่อลงชื่อเข้าบัญชีมหิดลตามปกติ หากเบราว์เซอร์ยังบล็อก Google ใน iframe ให้ใช้งานฟอร์มบน /exec โดยตรง ไม่ต้องเปิดสิทธิ์สาธารณะ')); }, cfg.connectTimeoutMs || 45000);
      url.searchParams.set('mode', 'relay'); url.searchParams.set('origin', location.origin); url.searchParams.set('channel', channel);
      frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'เชื่อมต่อระบบบันทึก'; frame.src = url.href; document.body.appendChild(frame);
    }).catch(err => { if (frame) frame.remove(); frame = null; peer = null; peerOrigin = ''; readyPromise = null; throw err; });
    return readyPromise;
  }
  async function submit(payload) {
    await connect();
    return new Promise((resolve, reject) => {
      const id = randomId();
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('ยังไม่ได้รับผลยืนยัน กรุณาตรวจชีตก่อนส่งซ้ำ ข้อมูลในฟอร์มยังอยู่')); }, (window.HAZARD_CONFIG || {}).submitTimeoutMs || 120000);
      pending.set(id, { resolve, reject, timer, requestId:payload.requestId });
      try { peer.postMessage({ type: 'hazard:request', channel, id, payload }, peerOrigin); }
      catch (err) { clearTimeout(timer); pending.delete(id); reject(err); }
    });
  }
  window.HazardConnection = Object.freeze({ submit, connect });
  // อุ่นการเชื่อมต่อเมื่อกำหนด URL แล้ว ไม่ส่งข้อมูลใด ๆ จนผู้ใช้กดส่ง
  if ((window.HAZARD_CONFIG || {}).deploymentUrl) document.addEventListener('DOMContentLoaded', () => connect().catch(() => {}));
})();
