/* ย่อภาพเอกสารบนหน้าจอให้เห็น A4 ทั้งความกว้าง ไม่เปลี่ยนฟอนต์/ขอบของ PDF */
(function(root){
 'use strict';
 function fitScale(available,paper){
  if(!Number.isFinite(available)||!Number.isFinite(paper)||available<=0||paper<=0)return null;
  return Math.min(1,available/paper);
 }
 function attach(doc=root.document){
  const holder=doc?.getElementById('report-document'),paper=doc?.getElementById('report-page');
  if(!holder||!paper||!root.getComputedStyle)return null;
  let scheduled=false,last=null;
  function update(){
   scheduled=false;
   // CSS width ยังคง 210mm; ไม่ใช้ bounding box ที่ถูก zoom แล้วมาคิดซ้ำ
   const scale=fitScale(holder.clientWidth,parseFloat(root.getComputedStyle(paper).width));
   if(scale===null)return;last=scale;
   paper.style.setProperty('--report-preview-scale',String(scale));
   // ตัวอย่างเรียงเนื้อหาต่อกัน; การแบ่งหน้าจริงคงไว้ใน PDF เท่านั้น
   const section=paper.querySelector('.analytics-products');if(section)section.style.paddingTop='0px';

  }
  function schedule(){if(scheduled)return;scheduled=true;(root.requestAnimationFrame||((fn)=>setTimeout(fn,0)))(update);}
  const observer=root.ResizeObserver?new root.ResizeObserver(schedule):null;
  observer?.observe(holder);
  const changes=root.MutationObserver?new root.MutationObserver(schedule):null;changes?.observe(paper,{childList:true,subtree:true,characterData:true});
  root.addEventListener?.('resize',schedule);
  root.addEventListener?.('hashchange',schedule);
  doc.fonts?.ready?.then(schedule);
  schedule();
  return {update,disconnect(){observer?.disconnect();changes?.disconnect();root.removeEventListener?.('resize',schedule);root.removeEventListener?.('hashchange',schedule);}};
 }
 const api={fitScale,attach};
 if(typeof module!=='undefined')module.exports=api;
 if(root.document){root.HubReportPreview=api;attach();}
})(typeof window!=='undefined'?window:globalThis);
