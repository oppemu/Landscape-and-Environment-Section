/* สะพานเข้ากันได้ของฟอร์มเดิมกับฐานรวม: แปลง payload และแทนช่องทางบันทึกเดิมด้วย UnifiedApi
 * ตอบ queued หลังเก็บข้อมูลและรูปในคิวถาวรแล้ว; ไม่เรียกว่าชีตบันทึกสำเร็จก่อนผลจริง */
/* Compatibility and safety layer. Original form code runs after this file. */
(function (root) {
  'use strict';
  const script = document.currentScript;
  const moduleId = script && script.dataset.module || 'unknown';
  const runtime = root.HUB_RUNTIME || {mode: 'preview', verifiedModules: [], responseContracts: {}};
  const nativeFetch = root.fetch && root.fetch.bind(root);
  const storage = new Map();
  const memoryStorage = {
    get length() { return storage.size; },
    key(index) { return Array.from(storage.keys())[index] || null; },
    getItem(key) { return storage.has(String(key)) ? storage.get(String(key)) : null; },
    setItem(key, value) { storage.set(String(key), String(value)); },
    removeItem(key) { storage.delete(String(key)); },
    clear() { storage.clear(); }
  };
  // Existing forms cache names/phone numbers. In this combined build they live only in memory.
  for (const name of ['localStorage', 'sessionStorage']) {
    try { Object.defineProperty(root, name, {configurable: true, value: memoryStorage}); }
    catch (_) { /* Capturing submit below still prevents legacy cache writes in preview. */ }
  }
  let banner;
  function notify(message, level) {
    if (root.parent !== root) {
      postToShell({type:'hub:module-status',module:moduleId,message,level:level || 'info'});
      return;
    }
    if (!banner && document.body) {
      banner = document.createElement('div');
      banner.id = 'hub-module-status';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:relative;z-index:2147483000;margin:10px;padding:12px 16px;border:1px solid #d4a82b;border-radius:12px;background:#fff8df;color:#243b58;font:15px/1.6 sans-serif;text-align:left;';
      (document.querySelector('.container') || document.querySelector('main') || document.body).prepend(banner);
    }
    if (banner) { banner.textContent = message; banner.dataset.level = level || 'info'; }
  }
  function allowed() { try { return !!root.UnifiedApi.endpoint(); } catch (_) { return false; } }
  function block(message) { const e = new Error(message); e.code = 'NOT_SENT'; notify(message,'warning'); return e; }
  // แปลงข้อมูลฟอร์มเดิมเป็น schema กลาง รวมรายการและหน่วยจากช่องจริงก่อนส่ง
  function normalizePayload(body) {
    let data = {};
    if (body && typeof body.entries === 'function') for (const [key,value] of body.entries()) data[key] = value;
    else if (typeof body === 'string') { try { data = JSON.parse(body); } catch (_) { for (const [key,value] of new URLSearchParams(body)) data[key]=value; } }
    else if (body && typeof body === 'object') data = Object.assign({},body);
    if(data.imageBase64 && String(data.imageBase64).length>Math.ceil(8*1024*1024/3)*4) throw block('รูปภาพต้องไม่เกิน 8 MB');
    const date = document.getElementById('date');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.value)) data.date = date.value;
    if (typeof data.phone === 'string') data.phone = data.phone.replace(/^'/,'');
    if (moduleId === 'bank-receive' || moduleId === 'bank-sell') {
      data.items = Array.from(document.querySelectorAll('.dynamic-weight')).map(input => {
        const name=input.dataset.item;
        const subtotal=Array.from(document.querySelectorAll('.dynamic-subtotal')).find(x=>x.dataset.item===name);
        return {name,quantity:Number(input.value),unit:'กิโลกรัม',pricePerUnit:Number(input.dataset.price),subtotal:Number(subtotal && subtotal.value)};
      });
      delete data.formType; delete data.wasteCategory; delete data.weight; delete data.pricePerUnit; delete data.subtotal;
    }
    if (moduleId === 'hazard') {
      data.items = Array.from(document.querySelectorAll('.dynamic-amount')).map(input => {
        const name=input.dataset.item;
        const unit=Array.from(document.querySelectorAll('.dynamic-unit')).find(x=>x.dataset.item===name);
        return {name,quantity:Number(input.value),unit:unit && unit.value || ''};
      });
      delete data.formType;
    }
    if (moduleId === 'sale') {
      const sizes={'pellet-unbagged':[1,30,'ฮิวมัส'],'pellet-2kg':[2,60,'ฮิวมัส'],'powder-unbagged':[1,7,'ฮิวมัส'],'powder-bagged-weighed':[1,8,'ฮิวมัส'],'powder-small':[4,32,'ฮิวมัส'],'powder-large':[10,80,'ฮิวมัส'],'liquid':[1,5,'น้ำหมักชีวภาพ']};
      data.items=Array.from(document.querySelectorAll('.bag-option')).filter(option=>option.querySelector('input[type="checkbox"]').checked).map(option=>{
        const type=option.dataset.type, spec=sizes[type], count=Number(option.querySelector('.bag-qty').value);
        if (!spec || !(count>0)) throw block('กรุณาระบุจำนวนสินค้าที่เลือกให้ครบ');
        return {name:spec[2],type,quantity:count*spec[0],unit:type==='liquid'?'ลิตร':'กิโลกรัม',packageCount:count,subtotal:Math.round(count*spec[1]*100)/100};
      });
      delete data.fertilizerType;
    }
    if (['food','fresh','humusprod','humusquality','sale','incident','contractor-landscape'].includes(moduleId)) {
      if(!root.HubFormPhoto)throw block('โหลดตัวตรวจรูปไม่ครบ กรุณารีเฟรชหน้า');
      root.HubFormPhoto.payload(data);
    }
    return data;
  }
  // ดักการเขียนให้ผ่าน UnifiedApi; GET ยอมรับเฉพาะ origin เดียวกันเพื่อไม่อ่านฐานเดิม
  root.fetch = async function(input, options) {
    const init=options||{}, method=String(init.method||'GET').toUpperCase();
    if (method==='GET'||method==='HEAD') {
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(url.origin!==location.origin) throw block('ยกเลิกการอ่านฐานข้อมูลเดิมแล้ว กรุณาใช้ฐานข้อมูลใหม่ของแอป');
      return nativeFetch(input,options);
    }
    if (!root.UnifiedApi) throw block('โหลดระบบเชื่อมต่อไม่สำเร็จ กรุณารีเฟรชหน้า');
    try {
      notify('กำลังบันทึกข้อมูล…','info');
      const data=normalizePayload(init.body);
      const picker=document.querySelector('input[type="file"]');
      if(picker&&['fresh','humusprod','humusquality','sale'].includes(moduleId)){data.photos=await root.HubFormPhoto.readMany(picker.files);delete data.imageBase64;delete data.imageName;delete data.mimeType;}
      const hasData=Object.keys(data).some(k=>!['date','time','recorder','operatorName','reporterName','fullName','unit','photos'].includes(k)&&data[k]!==''&&data[k]!=null&&(!Array.isArray(data[k])||data[k].length));
      const hasSale=moduleId!=='sale'||(data.items||[]).length||data.buyerName||data.buyerType||data.bagSize;
      if((!hasData||!hasSale)&&!(data.photos||[]).length&&!data.imageBase64)throw block('กรอกข้อมูลอย่างน้อยหนึ่งช่องหรือแนบรูปก่อนบันทึก');
      const result=await root.UnifiedApi.save(moduleId,data);
      notify(result.queued?'รับข้อมูลเข้าคิวแล้ว':'บันทึกแล้ว · รหัส '+result.id,result.queued?'info':'success');
      return new Response(JSON.stringify({status:result.queued?'queued':'success',id:result.id,result}),{status:200,headers:{'Content-Type':'application/json'}});
    } catch(error) { notify(error.message||'ยังยืนยันผลบันทึกไม่ได้','warning'); throw error; }
  };
  if(root.XMLHttpRequest&&root.XMLHttpRequest.prototype) root.XMLHttpRequest.prototype.send=function(){throw block('ใช้ช่องทางบันทึกของแอปเท่านั้น');};
  if(root.navigator && root.navigator.sendBeacon) { try { root.navigator.sendBeacon=function(){notify('ใช้ช่องทางบันทึกของแอปเท่านั้น','warning');return false;}; } catch (_) {} }
  if(root.HTMLFormElement) root.HTMLFormElement.prototype.submit=function(){throw block('ใช้ปุ่มบันทึกของแอปเท่านั้น');};
  // ส่งสถานะกลับหน้าหลัก ไม่ใช่การเขียนข้อมูลธุรกิจ
  function postToShell(message) {
    if (root.parent !== root && root.location.origin !== 'null') root.parent.postMessage(message, root.location.origin);
  }
  const recorderIds = {'fresh':'fullName','humusprod':'operatorName','incident':'reporterName','food':'foodRecorder','humusquality':'recorder','sale':'recorder','bank-receive':'recorderName','bank-sell':'recorderName'};
  root.addEventListener('message', function (event) {
    if (event.source !== root.parent || root.parent === root || event.origin !== root.location.origin || event.origin === 'null') return;
    const data = event.data;
    if (!data || data.type !== 'HUB_PROFILE' || typeof data.name !== 'string') return;
    const name = data.name.trim().replace(/[\r\n\t]/g, ' ').slice(0, 120);
    const id = recorderIds[moduleId];
    if (!name || !id) return;
    const field = document.getElementById(id);
    if (!field || field.type === 'hidden' || field.disabled) return;
    field.value = name;
    field.dispatchEvent(new root.Event('input', {bubbles:true}));
    field.dispatchEvent(new root.Event('change', {bubbles:true}));
  });
  document.addEventListener('DOMContentLoaded', function () {
    if (root.parent !== root) document.body.classList.add('app-embedded');
    notify(allowed() ? 'พร้อมบันทึกฐานข้อมูลใหม่' : 'ยังไม่ได้ตั้งลิงก์ Deploy หรือระบบเชื่อมต่อยังไม่พร้อม', 'info');
    postToShell({type:'hub:ready',module:moduleId});
  });
  root.HubBridge = Object.freeze({moduleId, mode:runtime.mode, notify});
})(window);
