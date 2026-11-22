/* เวลา 24 ชั่วโมง: คง id/name/value HH:mm เดิม จึงไม่เปลี่ยน API หรือฐานข้อมูล */
(function(root){'use strict';
 const digits=s=>String(s||'').replace(/[๐-๙]/g,c=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c)));
 function format(value){const s=digits(value);const n=s.replace(/\D/g,'').slice(0,4);return n.length>=2?n.slice(0,2)+':'+n.slice(2):n;}
 function normalize(value){const s=digits(value).trim();if(!s)return '';const m=/^(\d{1,2}):(\d{1,2})(?::00)?$/.exec(s);return m?m[1].padStart(2,'0')+':'+m[2].padStart(2,'0'):format(s);}
 const valid=value=>value===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
 function install(){root.document.querySelectorAll('input[type="time"]').forEach(input=>{
  const value=input.value;input.type='text';input.dataset.time24='1';input.inputMode='numeric';input.maxLength=5;input.placeholder='__:__';input.pattern='([01][0-9]|2[0-3]):[0-5][0-9]';input.title='เวลา 24 ชั่วโมง เช่น 15:30';input.autocomplete='off';input.value=normalize(value);
  const check=()=>input.setCustomValidity(valid(input.value)?'':'กรอกเวลา 00:00–23:59 เช่น 15:30');
  input.addEventListener('input',()=>{const cursor=input.selectionStart??input.value.length,raw=input.value;input.value=format(raw);const pos=Math.min(input.value.length,cursor+(raw.length===2?1:0));input.setSelectionRange(pos,pos);check();});
  input.addEventListener('change',()=>{input.value=normalize(input.value);check();});
  input.addEventListener('blur',()=>{input.value=normalize(input.value);check();input.dispatchEvent(new Event('change',{bubbles:true}));});
  input.addEventListener('paste',event=>{const pasted=event.clipboardData?.getData('text');if(pasted===undefined)return;event.preventDefault();input.value=normalize(pasted);check();input.dispatchEvent(new Event('change',{bubbles:true}));});
  // เซตค่าจากรายการเดิมหรือ reset ต้องไม่ค้างข้อความ validation ของค่าก่อนหน้า
  const descriptor=Object.getOwnPropertyDescriptor(root.HTMLInputElement.prototype,'value');
  Object.defineProperty(input,'value',{configurable:true,get(){return descriptor.get.call(this);},set(v){descriptor.set.call(this,String(v??''));this.setCustomValidity(valid(descriptor.get.call(this))?'':'กรอกเวลา 00:00–23:59 เช่น 15:30');}});
  input.form?.addEventListener('reset',()=>setTimeout(()=>{input.setCustomValidity('');},0));
 });}
 root.HubTime24={format,normalize,valid,install};if(typeof module==='object')module.exports=root.HubTime24;
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',install);else install();}
})(typeof window==='object'?window:globalThis);
