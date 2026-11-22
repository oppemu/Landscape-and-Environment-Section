/* Native picker on the home card; selection automatically archives/imports. */
(function(root){
'use strict';
// ผูกปุ่มเลือก Excel กับตัวนำเข้ากลาง ใช้ busy กันการแนบซ้ำระหว่างรอผล
function bankImportTimeText(result){
 const value=result&&result.firstImportedAt;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value))return '';
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 return ' · เวลานำเข้าครั้งแรก '+new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date)+' (เวลาไทย)';
}
function setup(){
 const doc=root.document, input=doc.getElementById('bank-excel-file'), button=doc.getElementById('bank-direct-open'), status=doc.getElementById('bank-direct-status'), authorize=doc.getElementById('bank-authorize');
 if(!input||!button||!status)return;
 let busy=false;
 function directUrl(){const value=root.HubConfig&&root.HubConfig.bankImportUrl;if(!value)return null;const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!/^\/(?:a\/macros\/mahidol\.ac\.th\/s|macros\/s)\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)||url.searchParams.get('mode')!=='bank-import')throw Error('ลิงก์นำเข้า Google ไม่ถูกต้อง');return url.href;}
 const direct=doc.getElementById('bank-google-direct');
 if(direct){try{const url=new URL(directUrl()||root.UnifiedApi.endpoint());url.searchParams.set('mode','bank-import');direct.href=url.href;direct.hidden=false;}catch(_){direct.hidden=true;}}
 const say=text=>{status.textContent=text;};
 try{authorize.href=root.UnifiedApi.endpoint();authorize.hidden=false;say('เลือกไฟล์ Excel เพื่อนำข้อมูลลงชีท ไม่เก็บไฟล์ Excel ใน Drive');}catch(e){say(e.message);}
 // เปิดตัวเลือกไฟล์ทันทีในเหตุการณ์คลิก เพื่อไม่ถูกเบราว์เซอร์บล็อก popup
 function choose(event){
  event.preventDefault();if(event.stopPropagation)event.stopPropagation();
  try{const url=directUrl();if(url){if(root.HubBankNameHandoff){root.HubBankNameHandoff.open(url,say);return;}const a=doc.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';doc.body.appendChild(a);a.click();a.remove();return;}}catch(e){say(e.message);return;}
  if(busy){location.hash='bank-import';return;}
  input.value='';input.click(); // must remain synchronous in the user's click
 }
 button.addEventListener('click',choose);
 if(direct)direct.addEventListener('click',choose);
 doc.addEventListener('click',event=>{
  const card=event.target.closest && event.target.closest('#bank-import-card');
  if(card&&!event.defaultPrevented)choose(event);
 });
 input.addEventListener('change',async()=>{
  const file=input.files && input.files[0];if(!file||busy)return;
  busy=true;button.disabled=true;input.disabled=true;location.hash='bank-import';
  say('กำลังตรวจไฟล์ '+file.name+'…');
  try{
   if(!/\.xls$/i.test(file.name)||file.size<512||file.size>1024*1024)throw Error('ใช้ไฟล์ .xls ที่ส่งออกจากธนาคารขยะ ขนาดไม่เกิน 1 MB');
   if(!root.WasteBankParser)throw Error('โหลดตัวอ่าน Excel ไม่สำเร็จ กรุณารีเฟรชหน้า');
   root.WasteBankParser.parseWasteBankReport(await file.arrayBuffer());
   say('กำลังนำเข้าข้อมูล…');
   const result=await root.UnifiedApi.importExcel(file);
   if(!result||!result.id||result.storage!=='sheet-only'||!Number.isInteger(result.rowCount)||result.rowCount<1)throw Error('ยังยืนยันผลนำเข้าไม่ได้ กรุณาลองไฟล์เดิมอีกครั้ง ระบบตรวจรายการซ้ำให้');
   say((result.restored?'นำเข้ารายการที่ลบกลับแล้ว':(result.duplicate?'ไฟล์นี้นำเข้าแล้ว ไม่บันทึกซ้ำ':'นำเข้าสำเร็จ'))+' · '+result.rowCount+' รายการ · เดือน '+result.month+(result.duplicate?' · คงเวลานำเข้าเดิม':result.restored?' · เติมเฉพาะรายการที่หาย โดยคงเวลานำเข้าเดิม':' · ข้อมูลเข้าชีทแล้ว')+bankImportTimeText(result));

   root.dispatchEvent(new Event('mu:data-changed'));
  }catch(e){say(e.message||'นำเข้าไม่สำเร็จ');}
  finally{busy=false;button.disabled=false;input.disabled=false;input.value='';}
 });
}
root.HubBankDirectOpen={setup};
if(root.document)root.document.addEventListener('DOMContentLoaded',setup);
if(typeof module!=='undefined')module.exports={setup};
})(typeof window==='undefined'?globalThis:window);
