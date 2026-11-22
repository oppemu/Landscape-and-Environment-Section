'use strict';
(function(){
 const form=document.getElementById('reportForm'),fields=form.elements,status=document.getElementById('status'),button=document.getElementById('send');
 // กันส่งซ้ำระหว่างรอเซิร์ฟเวอร์ และจำเนื้อหาที่ได้รับการยืนยันแล้วในแท็บนี้
 let busy=false,confirmedFingerprint=null;
 // สร้างลายนิ้วมือข้อมูลฟอร์มรวมชื่อ/ขนาด/ชนิด/เวลาแก้ไขของรูป เพื่อปลดปุ่มเฉพาะเมื่อข้อมูลเปลี่ยน
 function fingerprint(){return JSON.stringify(Array.from(new FormData(form),([key,val])=>[key,typeof val==='string'?val:[val.name,val.size,val.type,val.lastModified]]));}
 function unlockChanged(){if(busy)return;button.disabled=confirmedFingerprint!==null&&fingerprint()===confirmedFingerprint;}
 form.addEventListener('input',unlockChanged);form.addEventListener('change',unlockChanged);
 const get=n=>fields.namedItem(n),value=n=>get(n).value.trim();
 // ใช้วันปัจจุบันตามกรุงเทพ ไม่ใช้วันที่ตามเขตเวลาของเครื่องผู้กรอก
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 get('date').value=today;
 // ช่องรูปสองตำแหน่ง: ก่อนทำงานและหลังทำงาน (ไม่บังคับ)
 for(let i=0;i<2;i++){const box=document.createElement('div');box.className='grid';box.innerHTML='<label>'+['ภาพก่อนทำงาน','ภาพหลังทำงาน'][i]+'<input type="file" name="photo'+i+'" accept="image/jpeg,image/png"></label>';document.getElementById('photoFields').appendChild(box);}
 function mode(){const evidence=value('entryType')==='evidence';['areaCode','category','task'].forEach(n=>get(n).required=false);}
 get('entryType').addEventListener('change',mode);mode();
 // ปิดการส่งฟอร์มแบบเปลี่ยนหน้า ตรวจ required ก่อนเริ่ม และล็อกปุ่มตลอดคำขอ
 form.addEventListener('submit',async event=>{event.preventDefault();if(busy||button.disabled||!form.reportValidity())return;busy=true;button.disabled=true;status.textContent='';const submittedFingerprint=fingerprint();if(UnifiedApi.submissionStatus)UnifiedApi.submissionStatus('preparing','กำลังส่งข้อมูล');
 try{
  const payload={};for(const [key,val] of new FormData(form)){if(!/^photo\d$/.test(key)&&!/^caption\d$/.test(key))payload[key]=String(val).trim();}
  // ย้ายช่องเฉพาะงานเข้าออบเจ็กต์แยกเพื่อให้เซิร์ฟเวอร์ตรวจเฉพาะชื่อช่องที่อนุญาต
  payload.taskDetails={}; // ช่องเฉพาะงานเลิกแสดงในฟอร์มใหม่ แต่ข้อมูลเก่ายังอ่านได้
  payload.formVersion='green-1';payload.photos=[];payload.photoCaptions=[];payload.photoStages=[];
  // ช่องรูปสองตำแหน่ง: ก่อนทำงานและหลังทำงาน (ไม่บังคับ)
 for(let i=0;i<2;i++){const file=get('photo'+i).files[0];if(!file)continue;if(!['image/jpeg','image/png'].includes(file.type))throw Error('ภาพต้องเป็น JPG หรือ PNG');if(file.size>5*1024*1024)throw Error('ภาพแต่ละไฟล์ต้องไม่เกิน 5 MB');payload.photos.push(await HubFormPhoto.read(file));payload.photoCaptions.push('');payload.photoStages.push(['before','after'][i]);}
  // ยอมรับภาพไม่บังคับ และไม่สร้างข้อมูลหรือหลักฐานแทน
  const hasContent=['company','areaCode','category','task','details'].some(k=>payload[k]!==undefined&&payload[k]!=='')||Object.values(payload.taskDetails).some(v=>v.trim())||payload.photos.length;
  if(!hasContent)throw Error('กรอกข้อมูลอย่างน้อยหนึ่งช่องหรือแนบรูปก่อนบันทึก');
  button.disabled=true;status.textContent='';
  // รับข้อมูลพร้อมรูปเข้าคิวถาวรก่อนปลดปุ่ม โดยการส่งชีตทำงานต่อเบื้องหลัง
  const result=await UnifiedApi.save('contractor-landscape',payload);
  confirmedFingerprint=submittedFingerprint;
  status.textContent=''; // ตัวเชื่อมกลางแสดง popup หลังเซิร์ฟเวอร์ยืนยันแล้ว ไม่แสดงกล่องสถานะซ้ำ
 // ถ้าส่งล้มเหลวไม่ล้างฟอร์ม/รูป เพื่อให้ตรวจหรือส่งใหม่ได้ และปลด busy ใน finally ทุกกรณี
 }catch(error){status.textContent=error.message||'ส่งรายงานไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง';if(UnifiedApi.submissionStatus)UnifiedApi.submissionStatus('blocked',status.textContent);}finally{busy=false;unlockChanged();}
 });
})();
