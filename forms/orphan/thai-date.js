/* รูปแบบแสดงผลไทยเท่านั้น ไม่แก้ค่าที่ใช้ส่งฐานหรือเรียงลำดับ */
(function(root){
 'use strict';
 const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 // ตรวจวันจริงด้วย ISO round-trip เพื่อไม่รับวันที่เช่น 31 กุมภาพันธ์ แล้วบวกปีพุทธศักราชเฉพาะการแสดงผล
 function date(value){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));if(!m)return '';
  const d=new Date(m[0]+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==m[0])return '';
  return Number(m[3])+' '+months[Number(m[2])-1]+' '+(Number(m[1])+543);
 }
 // รับเวลา 24 ชั่วโมงและเติม น. ครั้งเดียว ไม่แก้ค่าต้นทางในช่องกรอก
 function time(value){const t=String(value||'').replace(/\s*น\.$/,'').trim();return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(t)?t+' น.':'';}
 // แสดงเวลาตามกรุงเทพ แม้เครื่องผู้กรอกตั้งเขตเวลาอื่น
 function timestamp(value){
  const raw=String(value||'');if(!raw)return '';
  // ค่า datetime-local ไม่มีเขตเวลา ให้ตีความตามกรุงเทพ ไม่ตามเครื่องผู้กรอก
  const local=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw);
  const d=new Date(local?raw+'+07:00':raw);if(!Number.isFinite(d.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return date(p.year+'-'+p.month+'-'+p.day)+' เวลา '+time(p.hour+':'+p.minute+':'+p.second);
 }
 const api={date,time,timestamp};root.HubThaiDate=api;if(typeof module==='object')module.exports=api;
 if(!root.document)return;
 // native date picker ยังใช้ค่า ISO เพื่อส่งและคำนวณ แต่แสดงคำไทยเต็มกำกับทันที
 function install(){document.querySelectorAll('input[type="date"],input[type="datetime-local"],input[type="time"],input[type="month"]').forEach(input=>{
  if(input.dataset.hideThaiDate==='1'||input.dataset.thaiDateReady)return;input.dataset.thaiDateReady='1';const label=document.createElement('small');label.className='thai-date-display';label.setAttribute('aria-live','polite');input.after(label);
  const update=()=>{label.textContent=input.type==='date'?date(input.value):input.type==='time'?time(input.value):input.type==='month'?(date(input.value+'-01').replace(/^1 /,'')):timestamp(input.value);};input.addEventListener('input',update);input.addEventListener('change',update);update();
 });}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 // ติดตั้งคำไทยกำกับช่องวันที่ที่ถูกเพิ่มภายหลัง โดย dataset ป้องกันการสร้างป้ายซ้ำ
 if(root.MutationObserver)new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})(typeof window==='object'?window:globalThis);
