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
    const value = root.HubConfig && root.HubConfig.api && root.HubConfig.api.webAppUrl;
    if (!/^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]+\/s|macros\/s)\/[A-Za-z0-9_-]+\/exec$/.test(value || '')) throw error('ยังไม่ได้ใส่ลิงก์ Deploy /exec ใน config/app-config.js', 'NOT_CONFIGURED');
    if (!/^https?:$/.test(location.protocol) || location.origin === 'null') throw error('หน้านี้เปิดจากไฟล์ในเครื่อง จึงยังส่งไม่ได้ ให้เปิด index.html ด้วย Open with Live Server ใน VS Code หรือเปิดเว็บที่เผยแพร่แล้ว', 'BAD_ORIGIN');
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
      const timeout = setTimeout(() => { cleanup(); reject(error('ยังไม่ได้รับการตอบกลับจาก Google ภายใน 20 วินาที [CONNECT_TIMEOUT] ขั้นนี้ยังไม่ส่งไฟล์เข้าชีต อาจเกี่ยวกับการลงชื่อเข้าใช้ สิทธิ์ Deploy หรือการเปิด Google ในกรอบหน้าเว็บ ลองปุ่มเปิดหน้าแนบ Excel ใน Google โดยตรง แล้วดูข้อความที่ Google แสดง', 'CONNECT_TIMEOUT')); }, 20000);
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
    // Embedded form modules share the trusted parent transport, not a separate backend.
    if (root.parent !== root) {
      try { if (root.parent.location.origin === location.origin && root.parent.UnifiedApi) return root.parent.UnifiedApi.request(req,expectedEndpoint); } catch (_) {}
    }
    if(req.action==='inventoryCommand'&&!req.selectedReporter){const selected=root.HubSelectedProfile&&root.HubSelectedProfile.get();if(!selected)return Promise.reject(error('กรุณาเลือกชื่อผู้กรอกก่อนส่งข้อมูล','REPORTER_REQUIRED'));req={...req,selectedReporter:{name:selected.name,email:selected.email,source:selected.source||'staff'}};}
    return getReady().then(() => new Promise((resolve, reject) => {
      if(expectedEndpoint && (endpoint()!==expectedEndpoint || transportEndpoint!==expectedEndpoint)){reject(error('ลิงก์เปลี่ยนระหว่างตรวจบัญชี ยังไม่ได้ส่งข้อมูล กรุณาตรวจลิงก์เดิม','CONFIG_CHANGED'));return;}
      const id = uid();
      const timer = setTimeout(() => { pending.delete(id); reject(error('ยังยืนยันผลไม่ได้ กรุณาลองส่งรายการเดิมอีกครั้ง ระบบจะตรวจไม่ให้บันทึกซ้ำ', 'OUTCOME_UNCERTAIN')); }, 45000);
      pending.set(id, {resolve, reject, timer});
      peer.postMessage({type:'mu:request', channel, id, request:req}, peerOrigin);
    }));
  }
  // เรียงคีย์ก่อนแปลงข้อความเพื่อให้ข้อมูลเหมือนกันมี hash เดียวกันแม้ลำดับคีย์ต่าง
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+stable(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }
  // สร้าง SHA-256 สำหรับจับคู่คำขอ ไม่ใช่การเข้ารหัสปกปิดเนื้อหา
  async function digest(value) {
    const bytes = new TextEncoder().encode(stable(value));
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2,'0')).join('');
  }
  const EXPECTED_SPREADSHEET=(root.HubConfig&&root.HubConfig.api&&root.HubConfig.api.spreadsheetId)||'';
  // ตรวจชื่อแอป รหัสฐาน และบัญชีจริงก่อนส่ง ปฏิเสธลิงก์ผิดหรือ backend เก่า
  async function connectionInfo(expectedEndpoint) {
    if(!/^[A-Za-z0-9_-]{15,}$/.test(EXPECTED_SPREADSHEET))throw error('ยังไม่ได้ตั้งรหัสฐานข้อมูลใน config/app-config.js','NOT_CONFIGURED');
    let info;
    try{info=await request({action:'connectionInfo'},expectedEndpoint);}catch(e){
      if(e.code==='ACTION_DENIED')throw error('Apps Script ที่ลิงก์นี้ยังไม่รองรับการตรวจฐานข้อมูล กรุณาใช้ Code.gs ชุดเดียวกับหน้าเว็บ แล้ว Deploy New version','BACKEND_OUTDATED');
      throw e;
    }
    if(!info||info.app!=='mahidol-waste-unified'||info.spreadsheetId!==EXPECTED_SPREADSHEET)throw error('ลิงก์นี้ไม่ใช่ฐานข้อมูลแอปขยะที่กำหนด ระบบยังไม่ส่งข้อมูล','TARGET_MISMATCH');
    if(info.version!=='2.4.5')throw error('Apps Script ต้องเป็นรุ่น 2.4.5 กรุณาวาง Code.gs ชุดนี้แล้ว Deploy เวอร์ชันใหม่ก่อนใช้','BACKEND_OUTDATED');
    if(info.authentication!=='public-link'||info.email!=='public-link'||info.actor!=='public-link'||!info.access||info.access.policyRevision!=='public-link-v1')throw error('Apps Script ยังไม่ใช่โหมดลิงก์สาธารณะ กรุณาวางสคริปต์ชุดล่าสุดแล้ว Deploy เวอร์ชันใหม่','BACKEND_OUTDATED');
    if(typeof info.email!=='string'||!info.email)throw error('ยืนยันบัญชีผู้ส่งไม่ได้','ACCESS_DENIED');
    return info;
  }
  // ใบรับรองรุ่นก่อนอ่านได้เฉพาะเมื่อผู้ใช้ส่งข้อมูลเดิมเอง ไม่ใช้สร้างงานอัตโนมัติ
  let resultPopup=null,diagnosticPromise;
  // ไม่เปิดหน้าหมุนหรือ modal ขวางฟอร์มระหว่างส่ง แสดงผลเมื่อทราบจริงเท่านั้น
  function notice(state,message,id,recovery){
    if(root.parent!==root){try{if(root.parent.location.origin===location.origin&&root.parent.UnifiedApi){root.parent.UnifiedApi.submissionStatus(state,message,id,recovery);return;}}catch(_) {}}
    if(root.dispatchEvent&&root.CustomEvent)root.dispatchEvent(new root.CustomEvent('mu:submission-state',{detail:{state,message,id}}));
    if(!root.document||!document.body)return;
    if(resultPopup)resultPopup.close(false);
    const old=document.getElementById('mu-result-popup');if(old)old.remove();
    // ปุ่มในฟอร์มแสดงกำลังบันทึกอยู่แล้ว ไม่สร้าง overlay หรือ animation ซ้ำ
    if(['preparing','sending','queued'].includes(state))return;
    if(!['confirmed','blocked','error','diagnostic-result'].includes(state))return;
    const success=state==='confirmed',focusBefore=document.activeElement;
    const panel=document.createElement('section');panel.id='mu-result-notice';
    panel.setAttribute('role',success?'status':'alert');
    panel.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483000;width:min(440px,calc(100vw - 40px));box-sizing:border-box;background:white;color:#222;border:1px solid #abc78b;border-radius:14px;padding:18px;box-shadow:0 4px 20px #0002;font-family:Anuphan,sans-serif;line-height:1.6';
    const text=document.createElement('div');text.textContent=success?'ส่งสำเร็จ':String(message||'ยังไม่ยืนยันการบันทึก ข้อมูลเดิมยังอยู่');panel.appendChild(text);
    const close=document.createElement('button');close.type='button';close.textContent='ปิด';close.style.cssText='margin-top:10px;padding:6px 16px;border:1px solid #abc78b;background:white;border-radius:8px;font:inherit;cursor:pointer';
    function dismiss(){panel.remove();if(resultPopup&&resultPopup.element===panel)resultPopup=null;}
    close.onclick=dismiss;panel.appendChild(close);panel.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss();});
    if(success)panel.addEventListener('click',dismiss);
    document.body.appendChild(panel);resultPopup={element:panel,close:dismiss,focusBefore};
  }
  // ตรวจแบบอ่านอย่างเดียว ไม่แสดงกล่องค้างระหว่างรอ และไม่เรียกผลตรวจว่าได้บันทึกแล้ว
  async function diagnoseConnection(){
    if(root.parent!==root){try{if(root.parent.location.origin===location.origin&&root.parent.UnifiedApi)return root.parent.UnifiedApi.diagnoseConnection();}catch(_) {}}
    if(diagnosticPromise)return diagnosticPromise;
    diagnosticPromise=(async()=>{
      if(!pending.size&&peer){if(frame)frame.remove();frame=null;peer=null;peerOrigin='';readyPromise=null;}
      try{const info=await connectionInfo();notice('diagnostic-result','เชื่อมต่อรุ่น '+String(info.version||'ไม่ทราบรุ่น')+' · ฐานข้อมูลตรงกัน · '+info.email);return info;}
      catch(e){notice('diagnostic-result','ตรวจไม่ผ่าน ['+(e.code||'ERROR')+'] '+e.message);throw e;}
    })().finally(()=>{diagnosticPromise=null;});return diagnosticPromise;
  }
  // ปุ่มวินิจฉัยตรวจการเชื่อมต่อเท่านั้น ไม่จำลองส่งรายการเพื่อทดสอบฐานจริง
  function installDiagnostics(){
    const anchor=document.getElementById&&document.getElementById('bank-authorize');
    if(!anchor||document.getElementById('mu-diagnose-connection'))return;
    const button=document.createElement('button');button.id='mu-diagnose-connection';button.type='button';button.className='button';button.textContent='ตรวจการเชื่อมต่อ';button.onclick=()=>diagnoseConnection().catch(()=>{});anchor.after(button);
  }
  // เศษอาหาร 10 จุดเก็บเฉพาะลายนิ้วมือและรหัสกันซ้ำในแท็บ ไม่เก็บข้อมูลหรือรูป
  let lastVerified=null;
  const activeSubmissions=new Map(), attemptIds=new Map();
  function optionalFood(body){
    return body.action==='saveRecord'&&body.module==='food'&&Array.isArray(body.payload?.locations)&&body.payload.locations.length===10;
  }
  function foodAttemptId(slot,value){
    try{
      if(value===null){root.sessionStorage.removeItem(slot);return null;}
      if(value!==undefined){root.sessionStorage.setItem(slot,value);return value;}
      const id=root.sessionStorage.getItem(slot);
      return /^[a-f0-9]{32}$/.test(id||'')?id:null;
    }catch(_){return null;}
  }
  function verifyResult(job,result,body){
    if(!result||!result.id)throw error('ยังยืนยันการบันทึกไม่ได้ กรุณาคงข้อมูลเดิมไว้','OUTCOME_UNCERTAIN');
    if(body.action==='landscapeDailySubmit'&&(result.status!=='success'||result.requestId!==job.requestId||result.id!==job.requestId||!Number.isInteger(result.sourceRow)||result.sourceRow<2))throw error('ยังยืนยันรายงานไม่ได้ กรุณาลองส่งรายการเดิมอีกครั้ง','OUTCOME_UNCERTAIN');
    if(body.action==='treeReportSubmit'&&(result.status!=='success'||result.requestId!==job.requestId||result.id!==job.requestId||!Number.isInteger(result.sourceRow)||result.sourceRow<2))throw error('ยังยืนยันรายงานต้นไม้ไม่ได้','OUTCOME_UNCERTAIN');
    if(body.module==='food'&&body.payload.locations!==undefined){
      const n=Array.isArray(body.payload.locations)?body.payload.locations.length:0;
      if(![9,10].includes(n)||result.id!==job.requestId||result.batchId!==job.requestId||result.rowCount!==n||!Array.isArray(result.ids)||result.ids.length!==n||result.ids.some(id=>typeof id!=='string'||!id.trim())||new Set(result.ids).size!==n)throw error('ยังยืนยันข้อมูลครบ '+n+' จุดไม่ได้','OUTCOME_UNCERTAIN');
    }
    return result;
  }
  async function directMutation(body){
    notice('sending','');
    let job;
    try{
      if(root.navigator&&root.navigator.onLine===false)throw error('ยังไม่ได้เชื่อมต่ออินเทอร์เน็ต ข้อมูลยังอยู่ในฟอร์ม','OFFLINE');
      const url=endpoint(),who=await connectionInfo(url);
      const key=await digest({spreadsheetId:who.spreadsheetId,actor:who.email,body});
      const slot=(optionalFood(body)||body.action==='landscapeDailySubmit')?'mu-'+(optionalFood(body)?'food':'daily')+'-attempt-v1:'+await digest({url,key}):null;
      // ส่งซ้ำด้วยข้อมูลเดิมใช้รหัสเดิม ไม่ส่งเอง; ฟอร์มเศษอาหารคงรหัสเมื่อรีเฟรชแท็บเดิม
      const requestId=attemptIds.get(key)||(slot&&foodAttemptId(slot))||uid();attemptIds.set(key,requestId);
      if(slot)foodAttemptId(slot,requestId);
      job={key,requestId,endpoint:url,actor:who.email,spreadsheetId:who.spreadsheetId};
      const result=verifyResult(job,await request({...body,requestId,expectedActor:who.email,expectedSpreadsheetId:who.spreadsheetId},url),body);
      attemptIds.delete(key);if(slot)foodAttemptId(slot,null);notice('confirmed','ส่งสำเร็จ',result.id);
      if(root.dispatchEvent&&root.Event)root.dispatchEvent(new root.Event('mu:data-changed'));
      return result;
    }catch(e){notice('blocked',e.message);throw e;}
  }
  // ส่งตรง รอคำยืนยัน ไม่สร้างงานเบื้องหลัง
  async function mutation(body){
    try {
    const selected=root.HubSelectedProfile&&root.HubSelectedProfile.get();
    if(!selected&&!optionalFood(body))throw error('กรุณาเลือกชื่อผู้กรอกก่อนส่งข้อมูล','REPORTER_REQUIRED');
    if(selected)body={...body,selectedReporter:{name:selected.name,email:selected.email,source:selected.source||'staff'}};
    const key=await digest({endpoint:endpoint(),body});
    if(activeSubmissions.has(key))return activeSubmissions.get(key);
    const work=directMutation(body).finally(()=>activeSubmissions.delete(key));activeSubmissions.set(key,work);return await work;
    } catch(e) { notice('blocked',e.message); throw e; }
  }
  if(root.parent===root&&root.document)root.document.addEventListener('DOMContentLoaded',installDiagnostics);
  // ทุกฟอร์มทั่วไปใช้เส้นทาง mutation เดียวกัน เพื่อรักษาการตรวจสิทธิ์และกันแถวซ้ำ
  function save(module,payload){
    if(root.parent!==root){try{if(root.parent.location.origin===location.origin&&root.parent.UnifiedApi)return root.parent.UnifiedApi.save(module,payload);}catch(_) {}}
    return mutation({action:'saveRecord',module,payload});
  }
  // รายงานต้นไม้ส่งตรงและรอใบรับยืนยัน เก็บรูปพร้อมรหัสเดิมหากผลยังไม่แน่นอน
  // หน้าฟอร์มไม่สร้าง requestId เอง ระบบตรวจรายการเดิมก่อนส่งซ้ำ
  function treeReport(payload){
    if(root.parent!==root){try{if(root.parent.location.origin===location.origin&&root.parent.UnifiedApi)return root.parent.UnifiedApi.treeReport(payload);}catch(_) {}}
    return mutation({action:'treeReportSubmit',payload});
  }
  // อุ่นช่องเชื่อมต่อแบบอ่านอย่างเดียว ไม่ส่งรายการใดขณะเปิดหน้า
  function warmIdentity(){if(root.parent!==root||root.navigator&&root.navigator.onLine===false)return;let url;try{url=endpoint();}catch(_){return;}connectionInfo(url).then(who=>{lastVerified={...who,endpoint:url,at:Date.now()};}).catch(()=>{});}
  if(root.document){root.document.addEventListener('DOMContentLoaded',warmIdentity);root.addEventListener('online',warmIdentity);}
  // รองรับเฉพาะ .xls จากระบบธนาคารขยะตามขนาดกำหนด ไม่ใช่ .xlsx ทั่วไป
  async function importExcel(file){
    if(root.parent!==root){try{if(root.parent.location.origin===location.origin&&root.parent.UnifiedApi)return root.parent.UnifiedApi.importExcel(file);}catch(_) {}}
    if(!file||! /\.xls$/i.test(file.name)||file.size<512||file.size>1024*1024)throw error('ใช้ไฟล์ .xls ที่ส่งออกจากธนาคารขยะ ขนาดไม่เกิน 1 MB','INVALID_FILE');
    // Excel uses an explicit, canonical-deduplicated RPC, not the form outbox.
    // Existing queued jobs are retained untouched and are never migrated/replayed here.
    const url=endpoint(),who=await connectionInfo(url),selected=root.HubSelectedProfile&&root.HubSelectedProfile.get();
    if(!selected||!selected.name||!selected.email)throw error('กรุณาเลือกชื่อผู้กรอกก่อนนำเข้า','REPORTER_REQUIRED');
    const bytes=await readFile(file),requestId='BANKFILE-'+await digest(bytes.base64);
    // Reuse the in-flight request for an identical file/account. No background retry.
    const importKey=JSON.stringify(['bank-import',url,who.spreadsheetId,who.email,selected.email,requestId]);
    if(activeSubmissions.has(importKey))return activeSubmissions.get(importKey);
    const work=request({action:'importExcel',file:bytes,requestId,selectedReporter:{name:selected.name,email:selected.email,source:selected.source||'staff'},expectedActor:who.email,expectedSpreadsheetId:who.spreadsheetId},url).finally(()=>activeSubmissions.delete(importKey));
    activeSubmissions.set(importKey,work);
    return work;
  }
  // อ่านเป็น base64 ในเครื่อง การอ่านสำเร็จยังไม่ใช่การเก็บ Drive สำเร็จ
  function readFile(file) {
    if (!file || file.size > 5 * 1024 * 1024) return Promise.reject(error('ไฟล์ต้องไม่เกิน 5 MB', 'FILE_TOO_LARGE'));
    return new Promise((resolve,reject) => {
      const reader=new FileReader();let settled=false;
      function finish(err,value){if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(value);}
      const timer=setTimeout(()=>{finish(error('อ่านรูปใช้เวลานาน กรุณาเลือกไฟล์รูปใหม่ ข้อมูลยังไม่ได้ส่ง','FILE_READ'));try{reader.abort();}catch(_){}},15000);
      reader.onload=()=>finish(null,{name:file.name,mimeType:file.type,base64:String(reader.result).split(',')[1]});
      reader.onerror=reader.onabort=()=>finish(error('อ่านไฟล์ไม่ได้ กรุณาเลือกไฟล์ใหม่','FILE_READ'));
      try{reader.readAsDataURL(file);}catch(e){finish(e);}
    });
  }
  root.UnifiedApi=Object.freeze({verifyAccess:connectionInfo,request,save,treeReport,landscapeDaily:payload=>mutation({action:'landscapeDailySubmit',payload}),importExcel,readFile,connect:getReady,endpoint,diagnoseConnection,submissionStatus:notice});
})(window);
