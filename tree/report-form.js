/* ลำดับงานฟอร์ม
 * เลือกต้นไม้จากทะเบียนจริง แล้วกรอกวัน งาน เวลา และหลักฐานสองกลุ่ม
 * ตรวจชนิด/เนื้อหารูปก่อนส่งคิว; ไม่ใช้ชื่อไฟล์เป็นหลักฐานว่าเป็นภาพจริง
 * UnifiedApi.treeReport เป็นเจ้าของ requestId, คิวถาวร และการลองซ้ำ ไม่สร้างคิวอีกชุดในฟอร์ม
 * รอ Promise ใบรับเข้าคิวถาวรก่อนล้างช่องกรอก; การรับเข้าคิวไม่ใช่การยืนยันว่าชีตบันทึกแล้ว
 * เมื่อผิดพลาดปลดช่องเพื่อแก้ข้อมูล โดยคิวกลางดูแลคำขอที่ผลยังไม่แน่ชัด
 */
/* รายงานต้นไม้ส่งผ่านคิวถาวรร่วมกับแอป รูปทั้งสองกลุ่มต้องอ่านและตรวจจริงก่อนรับเข้าคิว */
(function(){'use strict';
 const $=id=>document.getElementById(id),form=$('tree-report-form');let chosen=null,busy=false;
 function setTree(tree){if(busy)return;chosen=tree;$('report-tree').textContent=tree.id+' · '+tree.name;}
 window.TreeReportForm={select:setTree};
 function lockFields(value){form.querySelectorAll('input,textarea').forEach(e=>e.disabled=value);}
 $('report-open').onclick=()=>{$('tree-report').hidden=false;};$('report-close').onclick=()=>{$('tree-report').hidden=true;};
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  if(!chosen){UnifiedApi.submissionStatus('blocked','เลือกต้นไม้จากช่องค้นหาหรือแผนที่ก่อน');return;}
  if(!form.reportValidity())return;
  busy=true;$('report-submit').disabled=true;let sending=false;
  try{
   const val=id=>$(id).value,treeFiles=Array.from($('report-tree-photos').files),workFiles=Array.from($('report-work-photos').files);
   if(!treeFiles.length&&!workFiles.length&&!['report-type','report-shape','report-start','report-end','report-detail','report-document'].some(id=>val(id).trim()))throw Error('กรอกข้อมูลอย่างน้อยหนึ่งช่องหรือแนบรูปก่อนบันทึก');
   if(treeFiles.length+workFiles.length>3)throw Error('แนบได้ไม่เกิน 3 รูปต่อรายการ');
   if(val('report-end')&&val('report-start')&&val('report-end')<val('report-start'))throw Error('เวลาเสร็จต้องไม่ก่อนเวลาเริ่มในวันเดียวกัน');
   UnifiedApi.submissionStatus('preparing','กำลังรับข้อมูล');lockFields(true);
   const payload={date:val('report-date'),treeId:chosen.id,name:chosen.name,workType:val('report-type'),shapeHeight:val('report-shape'),startTime:val('report-start'),endTime:val('report-end'),workDetail:val('report-detail'),document:val('report-document'),treePhotos:await Promise.all(treeFiles.map(f=>HubFormPhoto.read(f))),workPhotos:await Promise.all(workFiles.map(f=>HubFormPhoto.read(f)))};
   sending=true;const result=await UnifiedApi.treeReport(payload);
   // คิวถาวรรับข้อมูลและรูปแล้วจึงล้างฟอร์ม ไม่กล่าวว่าชีตบันทึกเสร็จก่อนผลจริง
   form.reset();$('report-feedback').textContent='';
   if(!result.queued&&window.TreeHistory)window.TreeHistory.open(chosen);
  }catch(error){
   if(!sending)UnifiedApi.submissionStatus('blocked',error.message||'อ่านรูปหรือข้อมูลไม่ได้');
   $('report-feedback').textContent=error.message||'ยังยืนยันการบันทึกไม่ได้ ข้อมูลที่กรอกยังอยู่';
  }finally{busy=false;lockFields(false);$('report-submit').disabled=false;}
 };
})();
